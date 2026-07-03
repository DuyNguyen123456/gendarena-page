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
