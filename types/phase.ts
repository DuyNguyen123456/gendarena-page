export type PhaseStatus = 'upcoming' | 'active' | 'completed'

export interface CompetitionPhase {
  id: string
  phase_number: number
  title: string
  description: string
  start_date: string | null
  end_date: string | null
  status: PhaseStatus
  icon: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface PhaseFormData {
  phase_number: number
  title: string
  description: string
  start_date: string | null
  end_date: string | null
  status: PhaseStatus
  icon: string
  display_order: number
}
