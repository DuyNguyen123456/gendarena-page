'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Listens for Supabase auth state changes at the app level.
 *
 * When the Supabase SDK detects a stale/invalid refresh token it emits a
 * SIGNED_OUT event automatically. Without a listener the stale cookie
 * lingers and every subsequent page load retries the dead refresh, producing
 * repeated "refresh_token_not_found" errors in server logs.
 *
 * This component clears the invalid session and redirects to /login so the
 * user can sign in again cleanly.
 */
export default function AuthStateListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          // Purge any remaining stale cookies and redirect to login.
          // signOut() is a no-op when no session exists, so this is safe.
          supabase.auth.signOut().finally(() => {
            router.push('/login')
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Renders nothing — purely a side-effect component.
  return null
}
