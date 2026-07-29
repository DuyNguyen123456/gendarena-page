import { createClient } from '@/lib/supabase'
import type { TopicCategory } from '@/types/submission'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type ProfileUpdate = {
  phone?: string | null
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

export async function updateProfile(
  userId: string,
  fields: ProfileUpdate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (fields.facebook_url !== undefined && fields.facebook_url) {
    const err = validateFacebookUrl(fields.facebook_url)
    if (err) return { ok: false, error: err }
  }
  if (fields.phone !== undefined && fields.phone) {
    const err = validatePhone(fields.phone)
    if (err) return { ok: false, error: err }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update(fields as never)
    .eq('id', userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
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
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ expertise } as never)
    .eq('id', userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
