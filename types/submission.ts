/**
 * Types matching the actual Supabase DB schema for submission-related tables.
 *
 * After the schema update:
 * - file_path, file_name, file_size are NULLABLE (link submissions don't have them)
 * - submission_url is NULLABLE (file submissions don't have it)
 * - submission_kind distinguishes the two modes
 */

export type SubmissionStatus = 'submitted' | 'reviewing' | 'scored'
export type SubmissionKind = 'file' | 'link'

export type TopicCategory =
  | 'Giáo dục'
  | 'Y tế và Sức khỏe'
  | 'Kinh doanh, Thương mại và Tài chính'
  | 'Logistics và Chuỗi cung ứng'
  | 'Xã hội và Môi trường'

export const TOPIC_CATEGORIES: TopicCategory[] = [
  'Giáo dục',
  'Y tế và Sức khỏe',
  'Kinh doanh, Thương mại và Tài chính',
  'Logistics và Chuỗi cung ứng',
  'Xã hội và Môi trường',
]

/** Color config for topic category badges — used on admin/assign, admin/submissions */
export const TOPIC_CATEGORY_CONFIG: Record<TopicCategory, { label: string; cls: string }> = {
  'Giáo dục':                           { label: '📚 Giáo dục',             cls: 'bg-blue-950/50 border-blue-500/40 text-blue-300' },
  'Y tế và Sức khỏe':                   { label: '💊 Y tế & Sức khỏe',      cls: 'bg-rose-950/50 border-rose-500/40 text-rose-300' },
  'Kinh doanh, Thương mại và Tài chính': { label: '💼 Kinh doanh & Tài chính', cls: 'bg-amber-950/50 border-amber-500/40 text-amber-300' },
  'Logistics và Chuỗi cung ứng':         { label: '🚚 Logistics',             cls: 'bg-violet-950/50 border-violet-500/40 text-violet-300' },
  'Xã hội và Môi trường':                { label: '🌿 Xã hội & Môi trường',   cls: 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' },
}

/**
 * Unified admin submission row — returned by getAllSubmissionsForAdmin().
 * Uses PostgREST foreign-key joins (requires FK constraints to be in DB).
 */
export interface AdminSubmissionRow {
  id: string
  submission_kind: SubmissionKind
  file_name: string | null
  submission_url: string | null
  file_path: string | null
  uploaded_at: string
  status: SubmissionStatus | string
  phase_id: string | null
  topic: TopicCategory | null
  teams: { name: string } | null
  competition_phases: { title: string } | null
  assigned_judge?: { id: string; judge_id: string; full_name?: string } | null
}

export interface Submission {
  id: string
  team_id: string
  phase_id: string
  /** Storage path — only set for kind='file' */
  file_path: string | null
  /** Original filename — only set for kind='file' */
  file_name: string | null
  /** Bytes — only set for kind='file' */
  file_size: number | null
  file_type: string | null
  /** Public or shared URL — only set for kind='link' */
  submission_url: string | null
  submission_kind: SubmissionKind
  uploaded_by: string
  uploaded_at: string
  status: SubmissionStatus
  notes: string | null
  topic: TopicCategory | null
}

export interface SubmissionHistory {
  id: string
  team_id: string
  phase_id: string
  /** null for link submissions archived in history */
  file_name: string | null
  /** null for link submissions archived in history */
  file_size: number | null
  submission_kind: SubmissionKind
  uploaded_by: string
  uploaded_at: string
  deleted_at: string
  reason: string
  topic: TopicCategory | null
  /** Joined from profiles — populated when querying with .select('*, profiles(email)') */
  profiles?: { email: string } | null
}

/** The team record joined from team_members → teams */
export interface TeamRecord {
  id: string
  name: string
  competition_id: string
  leader_id: string
}

/** Result returned by the submission service functions */
export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

