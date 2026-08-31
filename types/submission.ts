/**
 * Types matching the actual Supabase DB schema for submission-related tables.
 *
 * After the multi-deliverable update:
 * - Each submission contains two mandatory deliverables:
 *   1. pitch_deck (Slide trình chiếu / Pitch-deck)
 *   2. report (Báo cáo đề án bằng chữ theo mẫu BTC)
 * - Either can be a file or a link, combined total file size <= 10MB
 */

export type SubmissionStatus = 'submitted' | 'reviewing' | 'scored'
export type SubmissionKind = 'file' | 'link' | 'both' | 'multi'

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

export interface DeliverableItem {
  kind: 'file' | 'link'
  file_name?: string | null
  file_path?: string | null
  file_size?: number | null
  file_type?: string | null
  url?: string | null
}

export interface SubmissionAttachments {
  pitch_deck: DeliverableItem
  report: DeliverableItem
}

/**
 * Unified admin submission row — returned by getAllSubmissionsForAdmin().
 * Uses PostgREST foreign-key joins (requires FK constraints to be in DB).
 */
export interface AdminSubmissionRow {
  id: string
  submission_kind: SubmissionKind | string
  file_name: string | null
  file_size?: number | null
  submission_url: string | null
  file_path: string | null
  uploaded_at: string
  status: SubmissionStatus | string
  phase_id: string | null
  topic: TopicCategory | null
  notes?: string | null
  attachments?: SubmissionAttachments | null
  teams: { name: string } | null
  competition_phases: {
    title: string
    scoring_open?: boolean
    scoring_opens_at?: string | null
    scoring_closes_at?: string | null
  } | null
  assigned_judge?: { id: string; judge_id: string; full_name?: string } | null
  scores?: {
    id: string
    judge_id: string
    total_score: number
    comment?: string | null
    round_id?: string | null
    criteria_scores?: Record<string, number>
  }[]
}

export interface Submission {
  id: string
  team_id: string
  phase_id: string
  /** Storage path — primary or combined */
  file_path: string | null
  /** Original filename — primary or summary */
  file_name: string | null
  /** Total bytes of uploaded files */
  file_size: number | null
  file_type: string | null
  /** Public or shared URL */
  submission_url: string | null
  submission_kind: SubmissionKind
  uploaded_by: string
  uploaded_at: string
  status: SubmissionStatus
  notes: string | null
  topic: TopicCategory | null
  attachments?: SubmissionAttachments | null
}

export interface SubmissionHistory {
  id: string
  team_id: string
  phase_id: string
  file_name: string | null
  file_size: number | null
  submission_url?: string | null
  submission_kind: SubmissionKind
  uploaded_by: string
  uploaded_at: string
  deleted_at: string
  reason: string
  topic: TopicCategory | null
  attachments?: SubmissionAttachments | null
  /** Joined from profiles — populated when querying with .select('*, profiles(email)') */
  profiles?: { email: string } | null
}

/** Helper function to parse structured attachments from submission or history row */
export function parseSubmissionAttachments(
  sub: {
    notes?: string | null
    file_name?: string | null
    file_path?: string | null
    file_size?: number | null
    submission_url?: string | null
    submission_kind?: string | null
    reason?: string | null
  } | null | undefined
): SubmissionAttachments | null {
  if (!sub) return null

  // 1. Try parsing JSON from notes
  if (sub.notes) {
    try {
      const parsed = JSON.parse(sub.notes)
      if (parsed && typeof parsed === 'object' && parsed.attachments) {
        return parsed.attachments as SubmissionAttachments
      }
      if (parsed && parsed.pitch_deck && parsed.report) {
        return parsed as SubmissionAttachments
      }
    } catch {
      // notes is not JSON
    }
  }

  // 2. Try parsing JSON from reason (for history items)
  if (sub.reason && sub.reason.startsWith('{')) {
    try {
      const parsed = JSON.parse(sub.reason)
      if (parsed && parsed.attachments) {
        return parsed.attachments as SubmissionAttachments
      }
      if (parsed && parsed.pitch_deck && parsed.report) {
        return parsed as SubmissionAttachments
      }
    } catch {
      // not JSON
    }
  }

  // 3. Fallback for legacy single-item submissions
  const isFile = sub.submission_kind === 'file' || !!sub.file_path || (!!sub.file_name && !sub.submission_url)
  return {
    pitch_deck: {
      kind: isFile ? 'file' : 'link',
      file_name: isFile ? sub.file_name : null,
      file_path: isFile ? sub.file_path : null,
      file_size: isFile ? sub.file_size : null,
      url: !isFile ? sub.submission_url : null,
    },
    report: {
      kind: 'link',
      url: null,
    },
  }
}

/** The team record joined from team_members → teams */
export interface TeamRecord {
  id: string
  name: string
  competition_id: string
  leader_id: string
  status?: string
}

/** Result returned by the submission service functions */
export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }


