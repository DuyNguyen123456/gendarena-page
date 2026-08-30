import type { Profile } from '@/types/profile'

/**
 * Checks if a profile is complete.
 * A complete profile must have 7 non-empty required fields:
 * - full_name
 * - email
 * - university
 * - faculty
 * - major
 * - phone
 * - dob
 */
export function isProfileComplete(profile?: Partial<Profile> | null): boolean {
  if (!profile) return false
  return Boolean(
    profile.full_name?.trim() &&
    profile.email?.trim() &&
    profile.university?.trim() &&
    profile.faculty?.trim() &&
    profile.major?.trim() &&
    profile.phone?.trim() &&
    profile.dob?.trim()
  )
}

export { dobToDbFormat, dobToUiFormat } from './utils'
