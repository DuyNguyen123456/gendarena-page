import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Verify user session via server client
    const supabaseUser = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabaseUser.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để thực hiện.' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện hành động này.' },
        { status: 403 }
      )
    }

    // 2. Parse and validate body
    const body = await request.json()
    const { email, full_name, organization } = body

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email không được để trống.' },
        { status: 400 }
      )
    }

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json(
        { error: 'Họ và tên không được để trống.' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedFullName = full_name.trim()
    const trimmedOrg = organization && typeof organization === 'string' ? organization.trim() : null

    // 3. Initialize Admin Supabase Client with service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not defined in server environment.')
      return NextResponse.json(
        { error: 'Cấu hình hệ thống chưa có SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Determine redirect url for email invite
    const requestUrl = new URL(request.url)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback?next=/reset-password`

    // 4. Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(trimmedEmail, {
        redirectTo,
        data: {
          full_name: trimmedFullName,
          role: 'judge',
          organization: trimmedOrg,
        },
      })

    if (inviteError) {
      let errorMsg = inviteError.message
      const lower = inviteError.message.toLowerCase()
      if (lower.includes('already') || lower.includes('exists') || inviteError.status === 422) {
        errorMsg = 'Email này đã tồn tại trên hệ thống.'
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    // 5. Upsert profile record with role 'judge'
    if (inviteData?.user) {
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
        {
          id: inviteData.user.id,
          email: trimmedEmail,
          full_name: trimmedFullName,
          organization: trimmedOrg,
          role: 'judge',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (profileError) {
        console.warn('Profile upsert warning after invite:', profileError.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi email mời cho Giám khảo thành công.',
    })
  } catch (err: unknown) {
    console.error('Error in invite-judge handler:', err)
    const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi xử lý.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
