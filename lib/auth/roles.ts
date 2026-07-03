export type UserRole = 'participant' | 'judge' | 'admin'

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin'
}

export function isJudgeRole(role?: string | null): boolean {
  return role === 'judge'
}

export function isParticipantRole(role?: string | null): boolean {
  return !role || role === 'participant'
}
