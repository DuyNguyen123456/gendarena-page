export type TeamPaymentStatus =
  | 'draft'
  | 'locked_pending_payment'
  | 'verified'
  | 'payment_rejected'

export interface AdminPaymentTeam {
  id: string
  name: string
  description: string | null
  max_members: number
  status: TeamPaymentStatus
  payment_amount: number
  payment_receipt_url: string | null
  payment_submitted_at: string | null
  payment_verified_at: string | null
  payment_rejected_reason: string | null
  created_at: string
  leader_id: string
  leader?: {
    id?: string
    full_name: string | null
    email: string | null
    phone: string | null
    university: string | null
  } | null
  competitions?: {
    title: string
  } | null
  members_count: number
  member_user_ids: string[]
}

/**
 * Calculates standard expected fee based on team member count
 * 3 members -> 36,000 VND
 * 4 members -> 44,000 VND
 * 5 members -> 50,000 VND
 */
export function calculateExpectedFee(memberCount: number): number {
  if (memberCount <= 3) return 36000
  if (memberCount === 4) return 44000
  return 50000
}
