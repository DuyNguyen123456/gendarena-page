import type { TopicCategory } from './submission'

export type Role = 'admin' | 'participant'

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
  created_at?: string | null
  updated_at?: string | null
}
