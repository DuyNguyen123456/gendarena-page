import { createClient } from '@/lib/supabase'

export type ScoreLevel = {
  id: string
  criteria_id: string
  label: string
  value: number
  sort_order: number
}

export type ScoringCriterion = {
  id: string
  round_id: string
  name: string
  weight: number
  max_score: number
  sort_order: number
  levels: ScoreLevel[]
}

export type ScoringRound = {
  id: string
  phase_id: string | null
  title: string
  description: string | null
  rubric_url: string | null
  scoring_open: boolean
  sort_order: number
  is_active: boolean
  criteria: ScoringCriterion[]
}

export type Score = {
  id: string
  submission_id: string
  judge_id: string
  round_id?: string | null
  criteria_scores?: Record<string, number>
  innovation_score?: number
  feasibility_score?: number
  presentation_score?: number
  impact_score?: number
  total_score: number
  comment: string | null
}

export type AssignedSubmission = {
  id: string
  team_id: string
  phase_id: string
  submission_kind: 'file' | 'link'
  file_name: string | null
  submission_url: string | null
  file_path: string | null
  uploaded_at: string
  status: string
  topic?: string | null
  teams?: { name: string } | null
  competition_phases?: {
    title: string
    scoring_open?: boolean
    scoring_opens_at?: string | null
    scoring_closes_at?: string | null
  } | null
}

export async function getScoringRounds(): Promise<ScoringRound[]> {
  const supabase = createClient()

  const [{ data: rounds, error: roundError }, { data: criteria, error: criteriaError }, { data: levels, error: levelsError }] =
    await Promise.all([
      supabase.from('scoring_rounds').select('*').order('sort_order', { ascending: true }),
      supabase.from('scoring_criteria').select('*').order('sort_order', { ascending: true }),
      supabase.from('score_levels').select('*').order('sort_order', { ascending: true }),
    ])

  if (roundError || criteriaError || levelsError) {
    console.error('getScoringRounds error:', roundError || criteriaError || levelsError)
    return []
  }

  const criteriaByRound = (criteria ?? []).reduce<Record<string, ScoringCriterion[]>>((acc, item) => {
    const row = item as ScoringCriterion
    acc[row.round_id] = acc[row.round_id] || []
    acc[row.round_id].push({ ...row, levels: [] })
    return acc
  }, {})

  const levelsByCriterion = (levels ?? []).reduce<Record<string, ScoreLevel[]>>((acc, item) => {
    const row = item as ScoreLevel
    acc[row.criteria_id] = acc[row.criteria_id] || []
    acc[row.criteria_id].push(row)
    return acc
  }, {})

  const roundsData = (rounds ?? []).map((round) => {
    const roundRow = round as Omit<ScoringRound, 'criteria'>
    const roundCriteria = (criteriaByRound[roundRow.id] ?? []).map((crit) => ({
      ...crit,
      levels: levelsByCriterion[crit.id] ?? [],
    }))
    return {
      ...roundRow,
      criteria: roundCriteria,
    } as ScoringRound
  })

  return roundsData
}

export async function createOrUpdateScoringRound(
  round: Partial<ScoringRound> & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createClient()
  const payload = {
    phase_id: round.phase_id,
    title: round.title,
    description: round.description,
    rubric_url: round.rubric_url ?? null,
    scoring_open: round.scoring_open ?? false,
    sort_order: round.sort_order ?? 0,
    is_active: round.is_active ?? true,
  }

  if (round.id) {
    const { error } = await supabase.from('scoring_rounds').update(payload as never).eq('id', round.id)
    if (error) {
      console.error('createOrUpdateScoringRound update error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: round.id }
  }

  const { data, error } = await supabase.from('scoring_rounds').insert(payload as never).select('id').single()
  if (error || !data) {
    console.error('createOrUpdateScoringRound insert error:', error)
    return { ok: false, error: error?.message ?? 'Unable to save round' }
  }
  return { ok: true, id: data.id }
}

export async function saveScoringCriterion(
  criterion: Partial<ScoringCriterion> & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createClient()
  const payload = {
    round_id: criterion.round_id,
    name: criterion.name,
    weight: criterion.weight ?? 0,
    max_score: criterion.max_score ?? 10,
    sort_order: criterion.sort_order ?? 0,
  }

  if (criterion.id) {
    const { error } = await supabase.from('scoring_criteria').update(payload as never).eq('id', criterion.id)
    if (error) {
      console.error('saveScoringCriterion update error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: criterion.id }
  }

  const { data, error } = await supabase.from('scoring_criteria').insert(payload as never).select('id').single()
  if (error || !data) {
    console.error('saveScoringCriterion insert error:', error)
    return { ok: false, error: error?.message ?? 'Unable to save criterion' }
  }
  return { ok: true, id: data.id }
}

export async function deleteScoringCriterion(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('scoring_criteria').delete().eq('id', id)
  if (error) {
    console.error('deleteScoringCriterion error:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function saveScoreLevel(
  level: Partial<ScoreLevel> & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createClient()
  const payload = {
    criteria_id: level.criteria_id,
    label: level.label,
    value: level.value ?? 0,
    sort_order: level.sort_order ?? 0,
  }

  if (level.id) {
    const { error } = await supabase.from('score_levels').update(payload as never).eq('id', level.id)
    if (error) {
      console.error('saveScoreLevel update error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: level.id }
  }

  const { data, error } = await supabase.from('score_levels').insert(payload as never).select('id').single()
  if (error || !data) {
    console.error('saveScoreLevel insert error:', error)
    return { ok: false, error: error?.message ?? 'Unable to save score level' }
  }
  return { ok: true, id: data.id }
}

export async function deleteScoreLevel(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('score_levels').delete().eq('id', id)
  if (error) {
    console.error('deleteScoreLevel error:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function getAssignedSubmissions(judgeId: string): Promise<AssignedSubmission[]> {
  const supabase = createClient()

  const { data: assignments, error: assignError } = await supabase
    .from('judge_assignments')
    .select('submission_id')
    .eq('judge_id', judgeId)

  if (assignError) {
    console.error('getAssignedSubmissions error:', assignError)
    return []
  }

  if (!assignments?.length) return []

  const ids = assignments.map((a) => a.submission_id)

  const { data, error } = await supabase
    .from('submissions')
    .select('*, teams(name), competition_phases(title, scoring_open, scoring_opens_at, scoring_closes_at)')
    .in('id', ids)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('getAssignedSubmissions details error:', error)
    return []
  }

  return (data ?? []) as AssignedSubmission[]
}

export async function getMyScores(judgeId: string, roundId?: string | null): Promise<Record<string, Score>> {
  const supabase = createClient()
  let query = supabase
    .from('scores')
    .select('*')
    .eq('judge_id', judgeId)

  if (roundId) {
    query = query.eq('round_id', roundId)
  }

  const { data, error } = await query

  if (error) {
    console.error('getMyScores error:', error)
    return {}
  }

  const map: Record<string, Score> = {}
  for (const row of (data ?? []) as Score[]) {
    map[row.submission_id] = row
  }
  return map
}

export type ScorePayload = {
  submission_id: string
  judge_id: string
  round_id?: string | null
  criteria_scores?: Record<string, number>
  innovation_score?: number
  feasibility_score?: number
  presentation_score?: number
  impact_score?: number
  comment: string
}

import { getScoringGate } from '@/types/phase'

export async function upsertScore(
  payload: ScorePayload,
  existingId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()

  // Validate scoring gate against competition_phases (source of truth)
  const { data: subData, error: subError } = await supabase
    .from('submissions')
    .select('id, phase_id, competition_phases(scoring_open, scoring_opens_at, scoring_closes_at)')
    .eq('id', payload.submission_id)
    .single()

  if (subError || !subData) {
    console.error('upsertScore error fetching phase:', subError)
    return { ok: false, error: 'Không thể xác thực vòng thi của bài nộp.' }
  }

  const phaseInfo = Array.isArray(subData.competition_phases)
    ? subData.competition_phases[0]
    : subData.competition_phases

  const gate = getScoringGate(phaseInfo)
  if (gate !== 'open') {
    return { ok: false, error: 'Vòng chấm điểm cho bài nộp này hiện đang đóng.' }
  }

  const { error } = existingId
    ? await supabase.from('scores').update(payload as never).eq('id', existingId)
    : await supabase.from('scores').insert(payload as never)

  if (error) {
    console.error('upsertScore error:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export type LeaderboardRow = {
  submission_id: string
  team_name: string
  phase_title: string | null
  avg_score: number
  judge_count: number
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_leaderboard')

  if (error) {
    console.error('getLeaderboard error:', error)
    return []
  }

  return (data ?? []) as LeaderboardRow[]
}

export async function getJudges(): Promise<{ id: string; full_name: string; email: string }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'judge')
    .order('full_name')

  if (error) {
    console.error('getJudges error:', error)
    return []
  }
  return (data ?? []) as { id: string; full_name: string; email: string }[]
}

export async function getAllSubmissionsForAssign(): Promise<{ id: string; label: string }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('id, teams(name), competition_phases(title), uploaded_at')
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('getAllSubmissionsForAssign error:', error)
    return []
  }

  return (data ?? []).map((s) => {
    const row = s as {
      id: string
      teams?: { name: string } | { name: string }[] | null
      competition_phases?: { title: string } | { title: string }[] | null
    }
    const teamName = Array.isArray(row.teams) ? row.teams[0]?.name : row.teams?.name
    const phaseTitle = Array.isArray(row.competition_phases)
      ? row.competition_phases[0]?.title
      : row.competition_phases?.title
    return {
      id: row.id,
      label: `${teamName ?? 'Team'} — ${phaseTitle ?? 'Phase'}`,
    }
  })
}

export async function assignJudgeToSubmission(
  judgeId: string,
  submissionId: string,
  assignedBy: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  // Ensure single judge per submission constraint
  const { error: delErr } = await supabase.from('judge_assignments').delete().eq('submission_id', submissionId)
  if (delErr) {
    console.error('assignJudgeToSubmission clean delete error:', delErr)
  }

  const { error } = await supabase.from('judge_assignments').insert({
    judge_id: judgeId,
    submission_id: submissionId,
    assigned_by: assignedBy,
  } as never)

  if (error) {
    console.error('assignJudgeToSubmission insert error:', error)
    return { ok: false, error: error.message }
  }

  // Update submission status in DB to 'reviewing' (assigned)
  const { error: updateErr } = await supabase
    .from('submissions')
    .update({ status: 'reviewing' } as never)
    .eq('id', submissionId)

  if (updateErr) {
    console.error('assignJudgeToSubmission status update error:', updateErr)
  }

  return { ok: true }
}

export async function removeAssignment(assignmentId: string, submissionId?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()

  let subId = submissionId
  if (!subId) {
    const { data, error: fetchErr } = await supabase
      .from('judge_assignments')
      .select('submission_id')
      .eq('id', assignmentId)
      .single()
    if (fetchErr) console.error('removeAssignment fetch subId error:', fetchErr)
    subId = data?.submission_id
  }

  const { error } = await supabase.from('judge_assignments').delete().eq('id', assignmentId)
  if (error) {
    console.error('removeAssignment delete error:', error)
    return { ok: false, error: error.message }
  }

  if (subId) {
    const { count, error: countErr } = await supabase
      .from('judge_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('submission_id', subId)

    if (countErr) console.error('removeAssignment count error:', countErr)

    if (!count || count === 0) {
      await supabase
        .from('submissions')
        .update({ status: 'submitted' } as never)
        .eq('id', subId)
    }
  }

  return { ok: true }
}

export async function getAssignments(): Promise<
  { id: string; judge_id: string; submission_id: string; judge?: { full_name: string }; submission_label?: string }[]
> {
  const supabase = createClient()
  const { data: assignData, error: assignError } = await supabase
    .from('judge_assignments')
    .select('id, judge_id, submission_id')
    .order('assigned_at', { ascending: false })

  if (assignError) {
    console.error('getAssignments assignError:', assignError)
    return []
  }

  const judgeIds = Array.from(new Set((assignData ?? []).map((a) => a.judge_id).filter(Boolean)))
  let profileMap = new Map<string, string>()

  if (judgeIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', judgeIds)

    if (profilesError) {
      console.error('getAssignments profilesError:', profilesError)
    } else {
      profileMap = new Map((profilesData ?? []).map((p) => [p.id, p.full_name ?? 'Giám khảo']))
    }
  }

  const subs = await getAllSubmissionsForAssign()
  const subMap = Object.fromEntries(subs.map((s) => [s.id, s.label]))

  return (assignData ?? []).map((row) => {
    return {
      id: row.id,
      judge_id: row.judge_id,
      submission_id: row.submission_id,
      judge: { full_name: profileMap.get(row.judge_id) ?? 'Giám khảo' },
      submission_label: subMap[row.submission_id],
    }
  })
}

