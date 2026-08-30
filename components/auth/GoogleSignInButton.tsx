'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getAppUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

interface GoogleSignInButtonProps {
  label?: string
  className?: string
}

function GoogleLogo() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export default function GoogleSignInButton({
  label = 'Tiếp tục với Google',
  className = '',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const redirectTo = `${getAppUrl()}/auth/callback?next=/dashboard`
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (signInError) {
        console.error('Google Sign-In Error:', signInError)
        setError(signInError.message || 'Không thể kết nối Google. Vui lòng thử lại.')
        setLoading(false)
      }
    } catch (err: unknown) {
      console.error('Google Sign-In Exception:', err)
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Đã có lỗi không xác định xảy ra khi đăng nhập bằng Google'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className={`w-full ${className}`}>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 font-medium text-text-primary hover:bg-surface-elevated transition"
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin text-brand-cyan shrink-0" />
        ) : (
          <GoogleLogo />
        )}
        <span>{label}</span>
      </Button>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-xs font-medium text-semantic-danger flex items-start gap-2 animate-in fade-in-0 duration-150">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-semantic-danger" />
          <span className="leading-snug">Lỗi đăng nhập Google: {error}</span>
        </div>
      )}
    </div>
  )
}
