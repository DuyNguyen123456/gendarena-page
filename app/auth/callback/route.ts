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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/reset-password'

  // G-2 / G-6: Missing code param — user navigated here directly, not via email link
  if (!code) {
    console.warn('[auth/callback] Missing code param — direct navigation or malformed link')
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('Truy cập không hợp lệ.')}`
    )
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (!error) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    if (isLocalEnv) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`)
    } else {
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // G-1: Log real error without leaking tokens (message + status only, capped at 200 chars)
  const safeMessage = (error.message ?? 'unknown').slice(0, 200)
  console.error(
    `[auth/callback] exchangeCodeForSession failed — status: ${error.status ?? 'n/a'}, message: ${safeMessage}`
  )

  // G-2: Return categorised user-facing message
  const userMessage = resolveErrorMessage(error.message ?? '')
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=${encodeURIComponent(userMessage)}`
  )
}
