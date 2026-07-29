/**
 * Submission service — all upload/query logic lives here.
 * Uses @supabase/ssr browser client (createClient from @/lib/supabase).
 *
 * Storage path format enforced by RLS:
 *   {auth.uid()}/{phase_id}/{timestamp}-{sanitized_filename}
 */

import { createClient } from '@/lib/supabase'
import type {
  Submission,
  SubmissionHistory,
  TeamRecord,
  ServiceResult,
  TopicCategory,
} from '@/types/submission'

const BUCKET = 'submissions'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB in bytes
const ALLOWED_MIME = 'application/pdf'
const ALLOWED_EXT = '.pdf'

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Client-side file validation.
 * Returns null if valid, or a Vietnamese error message string.
 */
export function validateFile(file: File): string | null {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  if (file.type !== ALLOWED_MIME || ext !== ALLOWED_EXT) {
    return 'Chỉ chấp nhận file PDF'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File tối đa 10 MB. Vui lòng nén trước khi nộp.'
  }
  return null
}

const URL_REGEX = /^https?:\/\/.+\..+/

/**
 * Client-side URL validation.
 * Returns null if valid, or a Vietnamese error message string.
 */
export function validateUrl(url: string): string | null {
  if (!url.trim()) return 'Vui lòng nhập đường dẫn bài nộp.'
  if (!URL_REGEX.test(url.trim())) return 'Đường dẫn không hợp lệ. Phải bắt đầu bằng http:// hoặc https://'
  return null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Remove characters unsafe for storage paths. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

/** Build the storage path following RLS format: {uid}/{phase_id}/{ts}-{name} */
function buildStoragePath(userId: string, phaseId: string, filename: string): string {
  const sanitized = sanitizeFilename(filename)
  return `${userId}/${phaseId}/${Date.now()}-${sanitized}`
}

// ─── Team queries ─────────────────────────────────────────────────────────────

/**
 * Get all teams the current user belongs to.
 * Returns empty array if user has no team membership.
 */
export async function getMyTeams(userId: string): Promise<TeamRecord[]> {
  const supabase = createClient()

  type MemberRow = {
    team_id: string
    teams: TeamRecord[] | null
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name, competition_id, leader_id)')
    .eq('user_id', userId) as { data: MemberRow[] | null; error: unknown }

  if (error) {
    console.error('getMyTeams error:', error)
    return []
  }

  return (data ?? []).flatMap((m) => m.teams ?? [])
}

// ─── Submission queries ───────────────────────────────────────────────────────

/**
 * Get the current active submission for a given (team_id, phase_id) pair.
 * Returns null if none exists.
 */
export async function getCurrentSubmission(
  teamId: string,
  phaseId: string,
): Promise<Submission | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', teamId)
    .eq('phase_id', phaseId)
    .maybeSingle()

  if (error) {
    console.error('getCurrentSubmission error:', error)
    return null
  }

  return data as Submission | null
}

/**
 * Get submission history for a given (team_id, phase_id) pair,
 * sorted newest first.
 */
export async function getSubmissionHistory(
  teamId: string,
  phaseId: string,
): Promise<SubmissionHistory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('submission_history')
    .select('*, profiles(email)')
    .eq('team_id', teamId)
    .eq('phase_id', phaseId)
    .order('deleted_at', { ascending: false })

  if (error) {
    console.error('getSubmissionHistory error:', error)
    return []
  }

  return (data ?? []) as SubmissionHistory[]
}

/**
 * Generate a temporary signed download URL for a private storage file.
 * Valid for 60 seconds.
 */
export async function getDownloadUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60)

  if (error) {
    console.error('getDownloadUrl error:', error)
    return null
  }

  return data.signedUrl
}

// ─── Upload workflows — FILE ──────────────────────────────────────────────────

/**
 * INSERT flow (file) — no existing submission.
 * 1. Upload file to Storage
 * 2. INSERT row into submissions (submission_kind='file')
 * 3. On DB failure → delete uploaded file (cleanup)
 */
export async function insertFileSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  file: File,
  topic: TopicCategory,
): Promise<ServiceResult> {
  const supabase = createClient()
  const storagePath = buildStoragePath(userId, phaseId, file.name)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: ALLOWED_MIME, upsert: false })

  if (uploadError) {
    console.error('Storage upload error (insert-file):', uploadError)
    return { ok: false, error: 'Upload file thất bại: ' + uploadError.message }
  }

  const { error: dbError } = await supabase.from('submissions').insert({
    team_id: teamId,
    phase_id: phaseId,
    file_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    submission_url: null,
    submission_kind: 'file',
    uploaded_by: userId,
    uploaded_at: new Date().toISOString(),
    status: 'submitted',
    notes: null,
    topic,
  })

  if (dbError) {
    console.error('DB insert error (file):', dbError)
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { ok: false, error: 'Lưu dữ liệu thất bại: ' + dbError.message }
  }

  return { ok: true, data: undefined }
}

/**
 * REPLACE flow (file) — existing submission present.
 * Order is mandatory:
 *   1. Upload new file to Storage          → fail: abort
 *   2. INSERT old data into history        → fail: delete new file, abort
 *   3. DELETE old file from Storage        → fail: warn only, continue
 *   4. UPDATE submissions row              → fail: delete new file, abort
 */
export async function replaceFileSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  file: File,
  existing: Submission,
  topic: TopicCategory,
): Promise<ServiceResult> {
  const supabase = createClient()
  const newStoragePath = buildStoragePath(userId, phaseId, file.name)

  // Step 1
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newStoragePath, file, { contentType: ALLOWED_MIME, upsert: false })

  if (uploadError) {
    console.error('Storage upload error (replace-file):', uploadError)
    return { ok: false, error: 'Upload file mới thất bại: ' + uploadError.message }
  }

  // Step 2
  const { error: historyError } = await supabase.from('submission_history').insert({
    team_id: existing.team_id,
    phase_id: existing.phase_id,
    file_name: existing.file_name,
    file_size: existing.file_size,
    submission_kind: existing.submission_kind,
    uploaded_by: existing.uploaded_by,
    uploaded_at: existing.uploaded_at,
    deleted_at: new Date().toISOString(),
    reason: 'replaced',
    topic: existing.topic,
  })

  if (historyError) {
    console.error('DB history insert error (replace-file):', historyError)
    await supabase.storage.from(BUCKET).remove([newStoragePath])
    return { ok: false, error: 'Lưu lịch sử thất bại: ' + historyError.message }
  }

  // Step 3 (non-critical)
  if (existing.file_path) {
    const { error: deleteStorageError } = await supabase.storage
      .from(BUCKET)
      .remove([existing.file_path])
    if (deleteStorageError) {
      console.warn('Could not delete old storage file (non-critical):', deleteStorageError)
    }
  }

  // Step 4
  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      file_path: newStoragePath,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      submission_url: null,
      submission_kind: 'file',
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      status: 'submitted',
      notes: null,
      topic,
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error('DB update error (replace-file):', updateError)
    await supabase.storage.from(BUCKET).remove([newStoragePath])
    return { ok: false, error: 'Cập nhật bài nộp thất bại: ' + updateError.message }
  }

  return { ok: true, data: undefined }
}

// ─── Upload workflows — LINK ──────────────────────────────────────────────────

/**
 * INSERT flow (link) — no existing submission.
 * No file upload; just INSERT the row with submission_kind='link'.
 */
export async function insertLinkSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  url: string,
  topic: TopicCategory,
): Promise<ServiceResult> {
  const supabase = createClient()

  const { error } = await supabase.from('submissions').insert({
    team_id: teamId,
    phase_id: phaseId,
    file_path: null,
    file_name: null,
    file_size: null,
    file_type: null,
    submission_url: url.trim(),
    submission_kind: 'link',
    uploaded_by: userId,
    uploaded_at: new Date().toISOString(),
    status: 'submitted',
    notes: null,
    topic,
  })

  if (error) {
    console.error('DB insert error (link):', error)
    return { ok: false, error: 'Lưu bài nộp thất bại: ' + error.message }
  }

  return { ok: true, data: undefined }
}

/**
 * REPLACE flow (link) — existing submission present.
 * 1. INSERT old data into history
 * 2. UPDATE submissions row with new link
 */
export async function replaceLinkSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  url: string,
  existing: Submission,
  topic: TopicCategory,
): Promise<ServiceResult> {
  const supabase = createClient()

  // Step 1: History
  const { error: historyError } = await supabase.from('submission_history').insert({
    team_id: existing.team_id,
    phase_id: existing.phase_id,
    file_name: existing.file_name,
    file_size: existing.file_size,
    submission_kind: existing.submission_kind,
    uploaded_by: existing.uploaded_by,
    uploaded_at: existing.uploaded_at,
    deleted_at: new Date().toISOString(),
    reason: 'replaced',
    topic: existing.topic,
  })

  if (historyError) {
    console.error('DB history insert error (replace-link):', historyError)
    return { ok: false, error: 'Lưu lịch sử thất bại: ' + historyError.message }
  }

  // If old submission was a file, try to clean up storage (non-critical)
  if (existing.file_path) {
    const supabaseClient = createClient()
    const { error: delErr } = await supabaseClient.storage
      .from(BUCKET)
      .remove([existing.file_path])
    if (delErr) {
      console.warn('Could not delete old file when replacing with link (non-critical):', delErr)
    }
  }

  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      file_path: null,
      file_name: null,
      file_size: null,
      file_type: null,
      submission_url: url.trim(),
      submission_kind: 'link',
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      status: 'submitted',
      notes: null,
      topic,
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error('DB update error (replace-link):', updateError)
    return { ok: false, error: 'Cập nhật bài nộp thất bại: ' + updateError.message }
  }

  return { ok: true, data: undefined }
}

// ─── Backward compat aliases ──────────────────────────────────────────────────
// Keep old names so any future callers don't break immediately.
export { insertFileSubmission as insertSubmission }
export { replaceFileSubmission as replaceSubmission }

// ─── Admin helpers ────────────────────────────────────────────────────────────

/**
 * Fetch ALL submissions with joined team name, phase title, and assignment info.
 * This is the single source of truth for /admin/submissions and /admin/assign.
 *
 * IMPLEMENTATION NOTE:
 * We intentionally split this into TWO separate queries instead of one complex join.
 * The reason: PostgREST alias syntax `profiles:judge_id(full_name)` inside
 * judge_assignments requires the FK relationship to be registered by the exact
 * name in PostgREST's schema cache. If not registered, it throws PGRST200 and
 * the ENTIRE query silently returns []. Splitting avoids this fragile dependency.
 *
 * IMPORTANT: This query requires the FK constraint submissions_phase_id_fkey
 * to exist in the database. Without it, PostgREST cannot resolve
 * competition_phases(title) and will silently return null data.
 * Run fix_dataflow_and_expertise_migration.sql first if the join fails.
 */
export async function getAllSubmissionsForAdmin() {
  const supabase = createClient()

  // ── Query 1: submissions with team name and phase title ──────────────────
  const { data: subData, error: subError } = await supabase
    .from('submissions')
    .select('id, submission_kind, file_name, submission_url, file_path, uploaded_at, status, phase_id, topic, teams(name), competition_phases(title)')
    .order('uploaded_at', { ascending: false })

  if (subError) {
    console.error('[getAllSubmissionsForAdmin] submissions query failed:', JSON.stringify(subError, null, 2))
    return []
  }

  // ── Query 2: assignments with judge profile (safe separate query) ─────────
  const { data: assignData, error: assignError } = await supabase
    .from('judge_assignments')
    .select('id, judge_id, submission_id, profiles(full_name)')

  if (assignError) {
    // Non-fatal: continue without assignment data, just log
    console.error('[getAllSubmissionsForAdmin] judge_assignments query failed:', JSON.stringify(assignError, null, 2))
  }

  // Build a map: submission_id → assignment info
  type AssignMap = Record<string, { id: string; judge_id: string; full_name?: string }>
  const assignMap: AssignMap = {}

  for (const row of (assignData ?? [])) {
    type RawAssign = { id: string; judge_id: string; submission_id: string; profiles?: { full_name: string } | { full_name: string }[] | null }
    const r = row as RawAssign
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    assignMap[r.submission_id] = {
      id: r.id,
      judge_id: r.judge_id,
      full_name: prof?.full_name,
    }
  }

  // ── Normalize and merge ───────────────────────────────────────────────────
  type RawSub = {
    id: string
    submission_kind: string
    file_name: string | null
    submission_url: string | null
    file_path: string | null
    uploaded_at: string
    status: string
    phase_id: string | null
    topic: string | null
    teams: { name: string } | { name: string }[] | null
    competition_phases: { title: string } | { title: string }[] | null
  }

  return (subData ?? []).map((row): import('@/types/submission').AdminSubmissionRow => {
    const r = row as RawSub
    const teams = Array.isArray(r.teams) ? (r.teams[0] ?? null) : r.teams
    const competition_phases = Array.isArray(r.competition_phases)
      ? (r.competition_phases[0] ?? null)
      : r.competition_phases

    const asgn = assignMap[r.id] ?? null
    const assigned_judge = asgn
      ? { id: asgn.id, judge_id: asgn.judge_id, full_name: asgn.full_name }
      : null

    return {
      id: r.id,
      submission_kind: r.submission_kind as import('@/types/submission').SubmissionKind,
      file_name: r.file_name,
      submission_url: r.submission_url,
      file_path: r.file_path,
      uploaded_at: r.uploaded_at,
      status: r.status,
      phase_id: r.phase_id,
      topic: r.topic as import('@/types/submission').TopicCategory | null,
      teams,
      competition_phases,
      assigned_judge,
    }
  })
}

