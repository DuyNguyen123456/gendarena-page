import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import type { TopicCategory } from '@/types/submission'
import type { Profile } from '@/types/profile'
export type { Profile } from '@/types/profile'
import { dobToDbFormat, dobToUiFormat } from '@/lib/utils'
import { isProfileComplete } from '@/lib/profile-utils'
import { notifyProfileUpdateStatus } from '@/services/notifications'
export { isProfileComplete, dobToDbFormat, dobToUiFormat } from '@/lib/profile-utils'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type ProfileUpdate = {
  full_name?: string | null
  email?: string | null
  organization?: string | null
  university?: string | null
  faculty?: string | null
  major?: string | null
  phone?: string | null
  dob?: string | null
  facebook_url?: string | null
  avatar_url?: string | null
}

export function validateFacebookUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (!/^https?:\/\/(www\.)?(facebook|fb)\.com\/.+/i.test(trimmed)) {
    return 'Facebook URL phải dạng https://facebook.com/... hoặc https://fb.com/...'
  }
  return null
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return null
  if (!/^(\+84|0)[0-9]{8,10}$/.test(trimmed.replace(/\s/g, ''))) {
    return 'Số điện thoại không hợp lệ (VD: 09xxxxxxxx hoặc +849xxxxxxxx)'
  }
  return null
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP'
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return 'Ảnh đại diện tối đa 2 MB'
  }
  return null
}

function avatarPath(userId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  return `${userId}/avatar.${ext}`
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validation = validateAvatarFile(file)
  if (validation) return { ok: false, error: validation }

  const supabase = createClient()
  const path = avatarPath(userId, file.name)

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[profile.ts getProfile Error]:', error)
      return null
    }
    if (!data) return null
    const p = data as Profile
    if (p.dob) {
      p.dob = dobToUiFormat(p.dob)
    }
    return p
  } catch (err) {
    console.error('[profile.ts getProfile Exception]:', err)
    return null
  }
}

export async function updateProfile(
  userId: string,
  fields: ProfileUpdate,
): Promise<{ ok: true; data?: Profile } | { ok: false; error: string }> {
  try {
    if (fields.facebook_url !== undefined && fields.facebook_url) {
      const err = validateFacebookUrl(fields.facebook_url)
      if (err) return { ok: false, error: err }
    }
    if (fields.phone !== undefined && fields.phone) {
      const err = validatePhone(fields.phone)
      if (err) return { ok: false, error: err }
    }

    const supabase = createClient()
    const payload: Record<string, any> = {
      id: userId,
      ...fields,
    }

    if (fields.dob !== undefined) {
      payload.dob = dobToDbFormat(fields.dob)
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload as never, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[profile.ts updateProfile Error]:', error)
      return { ok: false, error: error.message }
    }

    const updated = data?.[0] as Profile
    if (updated && updated.dob) {
      updated.dob = dobToUiFormat(updated.dob)
    }

    // Gửi thông báo 'Thông tin của bạn đã được cập nhật thành công' hoặc 'Thí sinh lưu ý cập nhật đủ thông tin cá nhân'
    notifyProfileUpdateStatus(userId, isProfileComplete(updated)).catch((err) =>
      console.warn('[services/profile] notifyProfileUpdateStatus error:', err)
    )

    return { ok: true, data: updated }
  } catch (err: any) {
    console.error('[profile.ts updateProfile Exception]:', err)
    return { ok: false, error: err?.message || 'Lỗi không xác định khi lưu hồ sơ.' }
  }
}

/**
 * Update the expertise areas for a judge profile.
 * Can be called by the judge themselves or by an admin on behalf of a judge.
 * @param userId - The user ID whose profile to update
 * @param expertise - Array of TopicCategory values (the 5 standard topics)
 */
export async function updateProfileExpertise(
  userId: string,
  expertise: TopicCategory[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ expertise } as never)
      .eq('id', userId)

    if (error) {
      console.error('[profile.ts updateProfileExpertise Error]:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('[profile.ts updateProfileExpertise Exception]:', err)
    return { ok: false, error: err?.message || 'Lỗi khi cập nhật chuyên môn' }
  }
}

/**
 * Ensures that a user profile exists in the `profiles` table.
 * If the profile does not exist, automatically creates a minimal profile record.
 * Never throws, catches any RLS / database error and returns gracefully.
 *
 * @param user - Supabase Auth User object or user object with id, email, user_metadata
 */
export async function ensureProfileExists(
  user: User | { id: string; email?: string | null; user_metadata?: Record<string, any> | null }
): Promise<{ ok: boolean; error?: string; data?: Profile | null }> {
  if (!user?.id) {
    return { ok: false, error: 'User ID is missing', data: null }
  }

  try {
    const supabase = createClient()

    // 1. Kiểm tra xem profile đã tồn tại chưa
    const { data, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[profile.ts selectError]:', selectError)
    }

    if (data) {
      const p = data as Profile
      if (p.dob) {
        p.dob = dobToUiFormat(p.dob)
      }
      return { ok: true, data: p }
    }

    // 2. Khởi tạo profile mặc định từ user_metadata nếu chưa có
    const meta = user.user_metadata || {}
    const fullName =
      meta.full_name ||
      meta.fullName ||
      meta.name ||
      user.email?.split('@')[0] ||
      'Thí sinh'

    const profilePayload = {
      id: user.id,
      email: user.email || '',
      full_name: fullName,
      role: (meta.role as any) || 'participant',
      phone: meta.phone || '',
      dob: dobToDbFormat(meta.dob),
      university: meta.university || '',
      faculty: meta.faculty || '',
      major: meta.major || '',
    }

    const { data: upsertData, error: upsertError } = await supabase
      .from('profiles')
      .upsert(profilePayload as never, { onConflict: 'id' })
      .select()
      .maybeSingle()

    if (upsertError) {
      console.error('[profile.ts upsertError]:', upsertError)
      return { ok: false, error: upsertError.message, data: null }
    }

    const p = (upsertData as Profile) ?? null
    if (p && p.dob) {
      p.dob = dobToUiFormat(p.dob)
    }

    return { ok: true, data: p }
  } catch (err: any) {
    console.error('[profile.ts ensureProfileExists Exception]:', err)
    return { ok: false, error: err?.message || 'Lỗi ngoại lệ khi tạo profile', data: null }
  }
}
