export type PhaseStatus = 'upcoming' | 'active' | 'completed'
export type SubmissionType = 'file' | 'link' | 'both'

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
  /** Admin toggle — true = users can submit */
  submission_open: boolean
  /** What kind of submission is accepted */
  submission_type: SubmissionType
  /** Optional: earliest datetime submissions are accepted (null = immediately) */
  submission_opens_at: string | null
  /** Optional: deadline datetime (null = no deadline) */
  submission_closes_at: string | null
  /** Type of competition phase: round, event, or webinar */
  event_type?: 'round' | 'event' | 'webinar'
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
  submission_open: boolean
  submission_type: SubmissionType
  submission_opens_at: string | null
  submission_closes_at: string | null
  event_type?: 'round' | 'event' | 'webinar'
}

/**
 * Gate result — computed client-side from phase submission fields.
 */
export type SubmissionGateStatus =
  | 'closed'       // submission_open = false
  | 'not_yet'      // submission_opens_at is in the future
  | 'expired'      // submission_closes_at is in the past
  | 'open'         // all good, form should render

export function getSubmissionGate(phase: CompetitionPhase): SubmissionGateStatus {
  if (!phase.submission_open) return 'closed'

  const now = Date.now()

  if (phase.submission_opens_at) {
    const opensAt = new Date(phase.submission_opens_at).getTime()
    if (now < opensAt) return 'not_yet'
  }

  if (phase.submission_closes_at) {
    const closesAt = new Date(phase.submission_closes_at).getTime()
    if (now > closesAt) return 'expired'
  }

  return 'open'
}
