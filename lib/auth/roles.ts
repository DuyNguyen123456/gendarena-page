export type UserRole = 'participant' | 'admin' | 'tester'

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin'
}

export function isParticipantRole(role?: string | null): boolean {
  return !role || role === 'participant' || role === 'tester'
}

export function isTesterRole(role?: string | null): boolean {
  return role === 'tester'
}

export function isRealParticipantRole(role?: string | null): boolean {
  return !role || role === 'participant'
}

export function isTesterOrAdminRole(role?: string | null): boolean {
  return role === 'tester' || role === 'admin'
}

