export type UserRole = 'participant' | 'admin'

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin'
}

export function isParticipantRole(role?: string | null): boolean {
  return !role || role === 'participant'
}

