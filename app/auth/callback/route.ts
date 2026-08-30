import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

/** Map Supabase error message → user-facing Vietnamese error string */
function resolveErrorMessage(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('expired') || msg.includes('otp_expired')) {
    return 'Liên kết đã hết hạn. Vui lòng yêu cầu gửi lại email.'
  }
  if (msg.includes('verifier') || msg.includes('pkce')) {
    return 'Phiên xác thực không hợp lệ. Vui lòng mở lại link trên cùng thiết bị đã yêu cầu đặt lại mật khẩu.'
  }
  if (msg.includes('already') || msg.includes('used')) {
    return 'Liên kết đã được sử dụng. Vui lòng yêu cầu gửi lại email nếu cần.'
  }
  return 'Không thể xác thực liên kết. Vui lòng thử lại hoặc gửi lại yêu cầu.'
}

/** Resolves safe origin: guarantees http:// on localhost/127.0.0.1 and https:// in production */
function getSafeOrigin(request: Request, requestUrl: URL): string {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    requestUrl.host

  const host = rawHost.split(',')[0].trim()
  const hostname = host.split(':')[0].toLowerCase()

  // Local environment -> ALWAYS use http://
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${host}`
  }

  // Production / Deployed environment
  const protoHeader = request.headers.get('x-forwarded-proto')
  const proto = protoHeader ? protoHeader.split(',')[0].trim() : 'https'
  return `${proto}://${host}`
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const safeOrigin = getSafeOrigin(request, requestUrl)
  const code = requestUrl.searchParams.get('code')

  // Sanitize next path: must be a relative path, prevent open redirects and protocol forcing
  const rawNext = requestUrl.searchParams.get('next') || '/dashboard'
  const nextPath =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  // Missing code param — user navigated here directly, not via auth provider / email link
  if (!code) {
    console.warn('[auth/callback] Missing code param — direct navigation or malformed link')
    return NextResponse.redirect(
      `${safeOrigin}/login?error=${encodeURIComponent('Truy cập không hợp lệ.')}`
    )
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (!error) {
    return NextResponse.redirect(`${safeOrigin}${nextPath}`)
  }

  // Log real error without leaking sensitive tokens
  const safeMessage = (error.message ?? 'unknown').slice(0, 200)
  console.error(
    `[auth/callback] exchangeCodeForSession failed — status: ${error.status ?? 'n/a'}, message: ${safeMessage}`
  )

  // Return categorised user-facing message
  const userMessage = resolveErrorMessage(error.message ?? '')
  return NextResponse.redirect(
    `${safeOrigin}/login?error=${encodeURIComponent(userMessage)}`
  )
}
