import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import type { EventWithStats } from '@/types/event'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EventRawRow {
  id: string
  title: string
  description: string | null
  event_type: 'webinar' | 'kickoff' | 'finale' | 'other'
  event_date: string | null
  location: string | null
  total_tickets: number
  is_open: boolean
  created_at: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')?.trim()
    const includeClosed = searchParams.get('all') === 'true'

    const supabaseAdmin = createSupabaseServiceClient()

    // ─── Case 1: Fetch Single Event by ID ───
    if (eventId) {
      const { data: eventData, error: eventError } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()

      if (eventError || !eventData) {
        return NextResponse.json(
          { success: false, error: 'Sự kiện không tồn tại hoặc đã bị xóa.' },
          {
            status: 404,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          }
        )
      }

      // Count exact registrations using service role
      const { count: regCount } = await supabaseAdmin
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)

      const total = Math.max(1, Number(eventData.total_tickets) || 1)
      const registered = regCount || 0
      const remaining = Math.max(0, total - registered)

      const eventWithStats: EventWithStats = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        event_date: eventData.event_date,
        location: eventData.location,
        total_tickets: total,
        is_open: Boolean(eventData.is_open),
        created_at: eventData.created_at,
        registered_count: registered,
        remaining_tickets: remaining,
      }

      return NextResponse.json(
        { success: true, event: eventWithStats },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      )
    }

    // ─── Case 2: Fetch Public Events List ───
    let query = supabaseAdmin
      .from('events')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })

    if (!includeClosed) {
      query = query.eq('is_open', true)
    }

    const { data: eventsData, error: eventsError } = await query

    if (eventsError) {
      console.error('[API /api/events] Error fetching events:', eventsError)
      return NextResponse.json(
        { success: false, error: 'Không thể tải danh sách sự kiện.' },
        { status: 500 }
      )
    }

    const rawEvents = (eventsData ?? []) as EventRawRow[]

    // Count registrations for all events in parallel
    const eventsWithStats: EventWithStats[] = await Promise.all(
      rawEvents.map(async (ev) => {
        const { count: regCount } = await supabaseAdmin
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id)

        const total = Math.max(1, Number(ev.total_tickets) || 1)
        const registered = regCount || 0
        const remaining = Math.max(0, total - registered)

        return {
          id: ev.id,
          title: ev.title,
          description: ev.description,
          event_type: ev.event_type,
          event_date: ev.event_date,
          location: ev.location,
          total_tickets: total,
          is_open: Boolean(ev.is_open),
          created_at: ev.created_at,
          registered_count: registered,
          remaining_tickets: remaining,
        }
      })
    )

    return NextResponse.json(
      { success: true, events: eventsWithStats },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('[API /api/events] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi lấy dữ liệu sự kiện.' },
      { status: 500 }
    )
  }
}
