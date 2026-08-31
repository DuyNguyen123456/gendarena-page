import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

// ─── In-Memory Rate Limiter (Soft limit per IP: max 5 requests / 10 mins) ─────
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 5 // Max 5 POSTs per window

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  )
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = ipRateLimitMap.get(ip)

  // Periodic cleanup of expired entries
  if (ipRateLimitMap.size > 1000) {
    for (const [key, value] of ipRateLimitMap.entries()) {
      if (now > value.resetAt) {
        ipRateLimitMap.delete(key)
      }
    }
  }

  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count += 1
  return true
}

function isValidUuid(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request)

  try {
    // 0. Soft IP Rate Limit Check
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          code: 'RATE_LIMITED',
          error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
          message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      event_id,
      full_name,
      email,
      phone,
      university,
      faculty,
      student_id,
      user_id,
    } = body

    // 1. Validate required fields
    if (!event_id || typeof event_id !== 'string' || !event_id.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_DATA',
          error: 'Thiếu thông tin mã sự kiện (event_id).',
          message: 'Thiếu thông tin mã sự kiện (event_id).',
        },
        { status: 400 }
      )
    }

    const eventIdClean = event_id.trim()
    if (!isValidUuid(eventIdClean)) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_DATA',
          error: 'Mã sự kiện không đúng định dạng UUID.',
          message: 'Mã sự kiện không đúng định dạng UUID.',
        },
        { status: 400 }
      )
    }

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_DATA',
          error: 'Vui lòng nhập họ và tên đầy đủ.',
          message: 'Vui lòng nhập họ và tên đầy đủ.',
        },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_DATA',
          error: 'Vui lòng nhập địa chỉ email nhận vé.',
          message: 'Vui lòng nhập địa chỉ email nhận vé.',
        },
        { status: 400 }
      )
    }

    const emailNormalized = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailNormalized)) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_DATA',
          error: 'Địa chỉ email không đúng định dạng.',
          message: 'Địa chỉ email không đúng định dạng.',
        },
        { status: 400 }
      )
    }

    const validUserId = user_id && isValidUuid(user_id) ? String(user_id).trim() : null

    // 2. Initialize Service Role Supabase Client
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    const hasServiceKey = Boolean(serviceKey)

    console.info('[Register API] Incoming request:', {
      event_id: eventIdClean,
      hasUser: Boolean(validUserId),
      hasServiceKey,
      ip: clientIp.slice(0, 7) + '***',
    })

    const supabaseAdmin = createSupabaseServiceClient()

    // 3. Primary Path: Call Atomic RPC Function in Postgres
    let rpcExecutedSuccessfully = false
    try {
      const { data: rawRpcData, error: rpcError } = await supabaseAdmin.rpc(
        'register_event_ticket',
        {
          p_event_id: eventIdClean,
          p_full_name: full_name.trim(),
          p_email: emailNormalized,
          p_phone: phone ? String(phone).trim() : null,
          p_university: university ? String(university).trim() : null,
          p_faculty: faculty ? String(faculty).trim() : null,
          p_student_id: student_id ? String(student_id).trim() : null,
          p_user_id: validUserId,
        }
      )

      if (rpcError) {
        console.warn('[Register API RPC Notice]', rpcError.code, rpcError.message)
      } else if (rawRpcData) {
        rpcExecutedSuccessfully = true
        let result = rawRpcData
        if (typeof rawRpcData === 'string') {
          try {
            result = JSON.parse(rawRpcData)
          } catch {
            result = { success: false, code: 'PARSE_ERROR', message: rawRpcData }
          }
        }

        const resCode = result.code || (result.success ? 'SUCCESS' : 'ERROR')
        const resMsg = result.message || (result.success ? 'Đăng ký tham gia sự kiện thành công!' : 'Đăng ký không thành công.')

        if (result.success || resCode === 'SUCCESS') {
          const regId = result.registration_id || result.id || ''
          const ticketCode =
            result.ticket_code ||
            (regId ? `GEND-EVT-${regId.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '')

          return NextResponse.json({
            success: true,
            code: 'SUCCESS',
            registrationId: regId,
            ticketCode,
            message: resMsg,
            registered_count: result.registered_count,
            total_tickets: result.total_tickets,
            remaining_tickets: result.remaining_tickets,
          })
        }

        if (resCode === 'ALREADY_REGISTERED') {
          return NextResponse.json(
            {
              success: false,
              code: 'ALREADY_REGISTERED',
              error: resMsg,
              message: resMsg,
            },
            { status: 409 }
          )
        }

        if (resCode === 'SOLD_OUT') {
          return NextResponse.json(
            {
              success: false,
              code: 'SOLD_OUT',
              error: resMsg,
              message: resMsg,
              remaining_tickets: 0,
            },
            { status: 400 }
          )
        }

        if (resCode === 'EVENT_CLOSED') {
          return NextResponse.json(
            {
              success: false,
              code: 'EVENT_CLOSED',
              error: resMsg,
              message: resMsg,
            },
            { status: 400 }
          )
        }

        if (resCode === 'EVENT_NOT_FOUND') {
          return NextResponse.json(
            {
              success: false,
              code: 'EVENT_NOT_FOUND',
              error: resMsg,
              message: resMsg,
            },
            { status: 404 }
          )
        }

        return NextResponse.json(
          {
            success: false,
            code: resCode,
            error: resMsg,
            message: resMsg,
          },
          { status: 400 }
        )
      }
    } catch (rpcEx) {
      console.warn('[Register API RPC Exception] Falling back to standard query:', rpcEx)
    }

    // 4. Fallback Path: Standard Query Execution (if RPC function not yet run in Postgres)
    if (!rpcExecutedSuccessfully) {
      console.info('[Register API] Running standard fallback query for event:', eventIdClean)

      const { data: eventData, error: eventError } = await supabaseAdmin
        .from('events')
        .select('id, title, event_type, event_date, location, total_tickets, is_open')
        .eq('id', eventIdClean)
        .maybeSingle()

      if (eventError || !eventData) {
        return NextResponse.json(
          {
            success: false,
            code: 'EVENT_NOT_FOUND',
            error: 'Sự kiện không tồn tại hoặc đã bị xóa khỏi hệ thống.',
            message: 'Sự kiện không tồn tại hoặc đã bị xóa khỏi hệ thống.',
          },
          { status: 404 }
        )
      }

      if (!eventData.is_open) {
        return NextResponse.json(
          {
            success: false,
            code: 'EVENT_CLOSED',
            error: 'Sự kiện này hiện đã đóng cổng đăng ký.',
            message: 'Sự kiện này hiện đã đóng cổng đăng ký.',
          },
          { status: 400 }
        )
      }

      // Check duplicate registration by email
      const { data: existingByEmail } = await supabaseAdmin
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventData.id)
        .eq('email', emailNormalized)
        .maybeSingle()

      if (existingByEmail) {
        return NextResponse.json(
          {
            success: false,
            code: 'ALREADY_REGISTERED',
            error: 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.',
            message: 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.',
          },
          { status: 409 }
        )
      }

      // Check duplicate by user_id if logged-in
      if (validUserId) {
        const { data: existingByUser } = await supabaseAdmin
          .from('event_registrations')
          .select('id')
          .eq('event_id', eventData.id)
          .eq('user_id', validUserId)
          .maybeSingle()

        if (existingByUser) {
          return NextResponse.json(
            {
              success: false,
              code: 'ALREADY_REGISTERED',
              error: 'Tài khoản của bạn đã đăng ký tham gia sự kiện này rồi.',
              message: 'Tài khoản của bạn đã đăng ký tham gia sự kiện này rồi.',
            },
            { status: 409 }
          )
        }
      }

      // Check ticket availability
      const { count: registeredCount, error: countError } = await supabaseAdmin
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventData.id)

      if (countError) {
        console.warn('[Register API] Error counting registrations:', countError)
      }

      const currentCount = registeredCount || 0
      const totalTickets = Math.max(1, Number(eventData.total_tickets) || 1)

      if (currentCount >= totalTickets) {
        return NextResponse.json(
          {
            success: false,
            code: 'SOLD_OUT',
            error: 'Sự kiện đã hết vé tham gia. Hẹn gặp bạn ở các sự kiện tiếp theo!',
            message: 'Sự kiện đã hết vé tham gia. Hẹn gặp bạn ở các sự kiện tiếp theo!',
            remaining_tickets: 0,
          },
          { status: 400 }
        )
      }

      // Insert new registration record via Service Role Client
      const { data: newReg, error: insertError } = await supabaseAdmin
        .from('event_registrations')
        .insert({
          event_id: eventData.id,
          user_id: validUserId,
          full_name: full_name.trim(),
          email: emailNormalized,
          phone: phone ? String(phone).trim() : null,
          university: university ? String(university).trim() : null,
          faculty: faculty ? String(faculty).trim() : null,
          student_id: student_id ? String(student_id).trim() : null,
        })
        .select('id')
        .single()

      if (insertError || !newReg) {
        if (insertError && (insertError.code === '23505' || insertError.message?.includes('duplicate key'))) {
          return NextResponse.json(
            {
              success: false,
              code: 'ALREADY_REGISTERED',
              error: 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.',
              message: 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.',
            },
            { status: 409 }
          )
        }

        console.error('[Register API DB Insert Error]', insertError)
        return NextResponse.json(
          {
            success: false,
            code: 'DB_ERROR',
            error: 'Không thể lưu thông tin đăng ký: ' + (insertError?.message || 'Lỗi cơ sở dữ liệu'),
            message: 'Không thể lưu thông tin đăng ký: ' + (insertError?.message || 'Lỗi cơ sở dữ liệu'),
          },
          { status: 500 }
        )
      }

      const ticketCode = `GEND-EVT-${newReg.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

      return NextResponse.json({
        success: true,
        code: 'SUCCESS',
        registrationId: newReg.id,
        ticketCode,
        message: 'Đăng ký tham gia sự kiện thành công!',
        registered_count: currentCount + 1,
        total_tickets: totalTickets,
        remaining_tickets: Math.max(0, totalTickets - (currentCount + 1)),
      })
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL',
        error: 'Đã có lỗi xảy ra trong quá trình xử lý đăng ký. Vui lòng thử lại sau.',
        message: 'Đã có lỗi xảy ra trong quá trình xử lý đăng ký. Vui lòng thử lại sau.',
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('[Register API Fatal Exception]', error)
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL',
        error: 'Hệ thống đang tải cao, vui lòng thử lại sau giây lát.',
        message: 'Hệ thống đang tải cao, vui lòng thử lại sau giây lát.',
      },
      { status: 500 }
    )
  }
}

