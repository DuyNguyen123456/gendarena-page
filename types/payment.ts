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

export interface FeeTier {
  count: number
  unitPrice: number
  total: number
  perPersonLabel: string
  totalLabel: string
}

export const FEE_TIERS: FeeTier[] = [
  { count: 1, unitPrice: 25000, total: 25000, perPersonLabel: '25k', totalLabel: '25.000đ' },
  { count: 2, unitPrice: 20000, total: 40000, perPersonLabel: '20k/người', totalLabel: '40.000đ' },
  { count: 3, unitPrice: 15000, total: 45000, perPersonLabel: '15k/người', totalLabel: '45.000đ' },
  { count: 4, unitPrice: 12000, total: 48000, perPersonLabel: '12k/người', totalLabel: '48.000đ' },
  { count: 5, unitPrice: 10000, total: 50000, perPersonLabel: '10k/người', totalLabel: '50.000đ' },
]

/**
 * Calculates standard expected fee based on team member count
 * 1 member  -> 25,000 VND (25k)
 * 2 members -> 40,000 VND (20k/người - 40k)
 * 3 members -> 45,000 VND (15k/người - 45k)
 * 4 members -> 48,000 VND (12k/người - 48k)
 * 5 members -> 50,000 VND (10k/người - 50k)
 */
export function calculateExpectedFee(memberCount: number): number {
  if (memberCount <= 1) return 25000
  if (memberCount === 2) return 40000
  if (memberCount === 3) return 45000
  if (memberCount === 4) return 48000
  return 50000
}

