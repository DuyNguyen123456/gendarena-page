import { isAdminRole, isJudgeRole } from './roles'

/** Default landing path after login, based on profiles.role */
export function getPostLoginPath(role?: string | null): string {
  if (isAdminRole(role)) return '/admin'
  if (isJudgeRole(role)) return '/judge'
  return '/dashboard'
}

/** Redirect staff away from contestant-only routes */
export function getRoleGuardRedirect(
  role: string | null | undefined,
  pathname: string,
): string | null {
  if (isAdminRole(role)) {
    if (pathname === '/dashboard' || pathname.startsWith('/team/')) {
      return '/admin'
    }
    if (pathname.startsWith('/judge')) {
      return '/admin'
    }
  }

  if (isJudgeRole(role)) {
    if (pathname === '/dashboard' || pathname.startsWith('/team/') || pathname.startsWith('/submissions')) {
      return '/judge'
    }
    if (pathname.startsWith('/admin')) {
      return '/judge'
    }
  }

  return null
}
