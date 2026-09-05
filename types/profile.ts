import type { TopicCategory } from './submission'

export type Role = 'admin' | 'participant' | 'tester'

export interface PublicProfileFields {
  phone?: boolean
  email?: boolean
  facebook_url?: boolean
  university?: boolean
  faculty?: boolean
  major?: boolean
  achievements?: boolean
}

export interface Profile {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  organization?: string | null
  university?: string | null
  faculty?: string | null
  major?: string | null
  dob?: string | null
  uid?: string | null
  facebook_url?: string | null
  avatar_url?: string | null
  role?: Role | string | null
  expertise?: TopicCategory[] | null
  achievements?: string | null
  is_profile_public?: boolean | null
  public_fields?: PublicProfileFields | null
  created_at?: string | null
  updated_at?: string | null
}

export interface TeamingContestant {
  id: string
  uid?: string | null
  full_name: string | null
  avatar_url?: string | null
  email?: string | null
  phone?: string | null
  facebook_url?: string | null
  university?: string | null
  faculty?: string | null
  major?: string | null
  achievements?: string | null
  public_fields?: PublicProfileFields | null
  created_at?: string | null
}

