import { createClient } from '@/lib/supabase'
import type { CompetitionPhase, PhaseFormData } from '@/types/phase'

/**
 * Fetch all competition phases ordered by display_order.
 * Uses the browser client — safe to call from Client Components.
 * For Server Components, use createSupabaseServerClient() directly.
 */
export async function getPhases(): Promise<CompetitionPhase[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competition_phases')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CompetitionPhase[]
}

export async function getPhaseById(id: string): Promise<CompetitionPhase | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competition_phases')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as CompetitionPhase
}

export async function createPhase(
  formData: PhaseFormData
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('competition_phases').insert({
    ...formData,
    start_date: formData.start_date || null,
    end_date: formData.end_date || null,
  })
  return { error: error?.message ?? null }
}

export async function updatePhase(
  id: string,
  formData: PhaseFormData
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('competition_phases')
    .update({
      ...formData,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deletePhase(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('competition_phases')
    .delete()
    .eq('id', id)
  return { error: error?.message ?? null }
}
