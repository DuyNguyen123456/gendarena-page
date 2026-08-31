import { createClient } from '@/lib/supabase'
import type { Event, EventFormData, EventRegistration, EventWithStats } from '@/types/event'

interface EventRawRow extends Event {
  event_registrations?: Array<{ count: number }> | { count: number } | null
}

/**
 * Fetch all events along with registration counts for the admin management page.
 */
export async function getAdminEvents(): Promise<EventWithStats[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/events?all=true', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.events)) {
          return json.events
        }
      }
    }
  } catch (err) {
    console.warn('[getAdminEvents] API fetch error, falling back to direct query:', err)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, event_registrations(count)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin events:', error)
    throw new Error(error.message)
  }

  const rawRows = (data ?? []) as EventRawRow[]

  return rawRows.map((item) => {
    let regCount = 0
    if (Array.isArray(item.event_registrations)) {
      regCount = item.event_registrations[0]?.count ?? 0
    } else if (item.event_registrations && typeof item.event_registrations === 'object') {
      regCount = (item.event_registrations as { count: number }).count ?? 0
    }

    const total = item.total_tickets || 0
    const remaining = Math.max(0, total - regCount)

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      event_type: item.event_type,
      event_date: item.event_date,
      location: item.location,
      total_tickets: total,
      is_open: item.is_open,
      created_at: item.created_at,
      registered_count: regCount,
      remaining_tickets: remaining,
    }
  })
}

/**
 * Fetch a single event by ID with registration count.
 */
export async function getEventById(id: string): Promise<EventWithStats | null> {
  if (!id) return null

  try {
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/events?id=${encodeURIComponent(id.trim())}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.event) {
          return json.event as EventWithStats
        }
      }
    }
  } catch (err) {
    console.warn('[getEventById] API fetch error, falling back to direct query:', err)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, event_registrations(count)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const item = data as EventRawRow
  let regCount = 0
  if (Array.isArray(item.event_registrations)) {
    regCount = Number(item.event_registrations[0]?.count) || 0
  } else if (item.event_registrations && typeof item.event_registrations === 'object') {
    regCount = Number((item.event_registrations as { count: number }).count) || 0
  }

  const total = Math.max(1, Number(item.total_tickets) || 0)
  const remaining = Math.max(0, total - regCount)

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    event_type: item.event_type,
    event_date: item.event_date,
    location: item.location,
    total_tickets: total,
    is_open: Boolean(item.is_open),
    created_at: item.created_at,
    registered_count: regCount,
    remaining_tickets: remaining,
  }
}

/**
 * Create a new event.
 */
export async function createEvent(
  formData: EventFormData
): Promise<{ data: Event | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      event_type: formData.event_type,
      event_date: formData.event_date || null,
      location: formData.location?.trim() || null,
      total_tickets: Math.max(1, Number(formData.total_tickets) || 100),
      is_open: formData.is_open ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    return { data: null, error: error.message }
  }

  return { data: data as Event, error: null }
}

/**
 * Update an existing event.
 */
export async function updateEvent(
  id: string,
  formData: Partial<EventFormData>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {}

  if (formData.title !== undefined) payload.title = formData.title.trim()
  if (formData.description !== undefined) payload.description = formData.description?.trim() || null
  if (formData.event_type !== undefined) payload.event_type = formData.event_type
  if (formData.event_date !== undefined) payload.event_date = formData.event_date || null
  if (formData.location !== undefined) payload.location = formData.location?.trim() || null
  if (formData.total_tickets !== undefined) payload.total_tickets = Math.max(1, Number(formData.total_tickets) || 100)
  if (formData.is_open !== undefined) payload.is_open = formData.is_open

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)

  if (error) {
    console.error('Error updating event:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Quick toggle — Open / Close registrations for a specific event.
 */
export async function toggleEventStatus(
  id: string,
  isOpen: boolean
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('events')
    .update({ is_open: isOpen })
    .eq('id', id)

  if (error) {
    console.error('Error toggling event status:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Delete an event.
 */
export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting event:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Get all registrations for a specific event (for viewing or CSV export).
 */
export async function getEventRegistrations(
  eventId: string
): Promise<EventRegistration[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching event registrations:', error)
    throw new Error(error.message)
  }

  return (data ?? []) as EventRegistration[]
}

/**
 * Fetch all public open events (is_open = true) ordered by event_date ASC.
 */
export async function getPublicEvents(): Promise<EventWithStats[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/events', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.events)) {
          return json.events
        }
      }
    }
  } catch (err) {
    console.warn('[getPublicEvents] API fetch error, falling back to direct query:', err)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, event_registrations(count)')
    .eq('is_open', true)
    .order('event_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching public events:', error)
    throw new Error(error.message)
  }

  const rawRows = (data ?? []) as EventRawRow[]

  return rawRows.map((item) => {
    let regCount = 0
    if (Array.isArray(item.event_registrations)) {
      regCount = Number(item.event_registrations[0]?.count) || 0
    } else if (item.event_registrations && typeof item.event_registrations === 'object') {
      regCount = Number((item.event_registrations as { count: number }).count) || 0
    }

    const total = Math.max(1, Number(item.total_tickets) || 0)
    const remaining = Math.max(0, total - regCount)

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      event_type: item.event_type,
      event_date: item.event_date,
      location: item.location,
      total_tickets: total,
      is_open: Boolean(item.is_open),
      created_at: item.created_at,
      registered_count: regCount,
      remaining_tickets: remaining,
    }
  })
}

/**
 * Fetch a single public event by ID.
 */
export async function getPublicEventById(id: string): Promise<EventWithStats | null> {
  return getEventById(id)
}

/**
 * Check if a user/email is already registered for a specific event.
 * Uses client-side query matching either email or authenticated user_id.
 */
export async function checkUserRegistration(
  eventId: string,
  email?: string | null,
  userId?: string | null
): Promise<boolean> {
  if (!eventId || (!email && !userId)) return false
  try {
    const supabase = createClient()
    let query = supabase.from('event_registrations').select('id').eq('event_id', eventId)

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (email) {
      query = query.eq('email', email.trim().toLowerCase())
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return false
    return true
  } catch {
    return false
  }
}


