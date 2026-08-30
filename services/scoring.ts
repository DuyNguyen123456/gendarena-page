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
  created_at?: string
  updated_at?: string
}

export type AdminScorePayload = {
  submission_id: string
  admin_id: string
  round_id?: string | null
  criteria_scores: Record<string, number>
  offline_judge_name?: string | null
  comment?: string | null
  total_score?: number
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

export async function getScoreForSubmission(submissionId: string): Promise<Score | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (error) {
    console.error('getScoreForSubmission error:', error)
    return null
  }
  return data as Score | null
}

export async function saveAdminScore(
  payload: AdminScorePayload,
): Promise<{ ok: true; score: Score } | { ok: false; error: string }> {
  const supabase = createClient()

  try {
    // Check if score already exists for this submission
    const { data: existingScore, error: fetchErr } = await supabase
      .from('scores')
      .select('id, comment')
      .eq('submission_id', payload.submission_id)
      .maybeSingle()

    if (fetchErr) {
      console.error('[saveAdminScore] Error checking existing score:', fetchErr)
    }

    // Build comment formatted with offline judge name if provided
    let finalComment = (payload.comment || '').trim()
    if (payload.offline_judge_name?.trim()) {
      const prefix = `[BGK: ${payload.offline_judge_name.trim()}]`
      if (!finalComment.startsWith('[BGK:')) {
        finalComment = finalComment ? `${prefix} ${finalComment}` : prefix
      }
    }

    const scoreData: Record<string, unknown> = {
      submission_id: payload.submission_id,
      judge_id: payload.admin_id,
      round_id: payload.round_id || null,
      criteria_scores: payload.criteria_scores || {},
      comment: finalComment || null,
      innovation_score: 0,
      feasibility_score: 0,
      presentation_score: 0,
      impact_score: 0,
    }

    if (typeof payload.total_score === 'number' && !isNaN(payload.total_score)) {
      scoreData.total_score = payload.total_score
    }

    let savedData: Score | null = null

    if (existingScore?.id) {
      const { data, error: updateErr } = await supabase
        .from('scores')
        .update(scoreData as never)
        .eq('id', existingScore.id)
        .select('*')
        .single()

      if (updateErr) {
        console.error('[saveAdminScore] Update score error:', updateErr)
        return { ok: false, error: updateErr.message }
      }
      savedData = data as Score
    } else {
      const { data, error: insertErr } = await supabase
        .from('scores')
        .insert(scoreData as never)
        .select('*')
        .single()

      if (insertErr) {
        console.error('[saveAdminScore] Insert score error:', insertErr)
        return { ok: false, error: insertErr.message }
      }
      savedData = data as Score
    }

    // Update submission status to 'scored'
    await supabase
      .from('submissions')
      .update({ status: 'scored' } as never)
      .eq('id', payload.submission_id)

    return { ok: true, score: savedData! }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi lưu điểm.'
    console.error('[saveAdminScore] Exception:', err)
    return { ok: false, error: msg }
  }
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

  const rows = (data ?? []) as LeaderboardRow[]
  return rows.sort((a, b) => Number(b.avg_score || 0) - Number(a.avg_score || 0))
}
