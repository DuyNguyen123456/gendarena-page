'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter'

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    let settled = false

    const settle = (ready: boolean) => {
      if (settled) return
      settled = true
      setHasSession(ready)
      setCheckingSession(false)
    }

    // Layer 1: Check for an existing session immediately.
    // This covers the case where /auth/callback already exchanged the code and
    // set the session cookie before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settle(true)
      }
    })

    // Layer 2: Listen for auth state events in case session arrives after mount
    // (e.g. slow network, cold-start server latency)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') &&
        session
      ) {
        settle(true)
      }
    })

    // Fallback: 10s timeout — wider window than the original 3s to avoid
    // false negatives on slow networks or cold-start server responses
    const timer = setTimeout(() => {
      settle(false)
    }, 10000)

    return () => {
      clearTimeout(timer)
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Vui lòng nhập mật khẩu mới.')
      return
    }

    if (password.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Đã có lỗi xảy ra khi cập nhật mật khẩu.')
      return
    }

    setSuccess(true)

    // Sign out to clear recovery session and force user to log in with new credentials
    await supabase.auth.signOut()

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login?reset=success')
    }, 3000)
  }

  if (checkingSession) {
    return <Loading text="Đang kiểm tra thông tin khôi phục..." />
  }

  if (!hasSession && !success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden bg-surface-base">
        {/* Background layer 1: Dot grid */}
        <DotGridBackground />

        {/* Background layer 2: Subtle beam */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute -top-40 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-brand-cyan/8 blur-3xl"
            animate={prefersReducedMotion ? {} : { x: ['-5%', '5%', '-5%'], y: ['-3%', '3%', '-3%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="p-8 bg-surface-raised border border-surface-border text-center shadow-elevation-2">
            <div className="size-16 rounded-full bg-semantic-danger/10 border border-semantic-danger/30 flex items-center justify-center mx-auto text-semantic-danger mb-5">
              <AlertTriangle className="size-8" />
            </div>
            <Badge variant="brand" size="sm" className="mb-3">GenD Arena 2026</Badge>
            <h2 className="font-display text-2xl font-semibold text-text-primary mb-2">
              Liên kết không hợp lệ
            </h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Phiên khôi phục mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng gửi lại yêu cầu đặt lại mật khẩu từ trang đăng nhập.
            </p>
            <Link href="/login" className="block w-full">
              <Button variant="secondary" size="lg" className="w-full">
                Quay lại Đăng nhập
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden bg-surface-base">
      {/* Background layer 1: Dot grid */}
      <DotGridBackground />

      {/* Background layer 2: Subtle beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -top-40 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-brand-cyan/8 blur-3xl"
          animate={prefersReducedMotion ? {} : { x: ['-5%', '5%', '-5%'], y: ['-3%', '3%', '-3%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="p-6 sm:p-8 bg-surface-raised border border-surface-border shadow-elevation-2">
          {/* Brand header */}
          <div className="text-center mb-6">
            <Badge variant="brand" size="sm" className="mb-3">
              GenD Arena 2026
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary font-display tracking-tight">
              Đặt lại mật khẩu
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              Chọn mật khẩu mới cho tài khoản của bạn
            </p>
          </div>

          {success ? (
            <div className="p-6 rounded-xl bg-semantic-success/10 border border-semantic-success/30 text-center space-y-4 animate-in fade-in duration-300">
              <CheckCircle2 className="size-12 text-semantic-success mx-auto" />
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary mb-1">
                  Đổi mật khẩu thành công!
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Mật khẩu mới đã được cập nhật. Bạn sẽ tự động chuyển về trang đăng nhập trong giây lát...
                </p>
              </div>
              <Link href="/login" className="block w-full">
                <Button variant="primary" size="md" className="w-full">
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-start gap-2.5 mb-5">
                  <XCircle className="size-4 shrink-0 mt-0.5 text-semantic-danger" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Mật khẩu mới (tối thiểu 8 ký tự)
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    leftIcon={<Lock className="size-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="pointer-events-auto text-text-tertiary hover:text-text-primary transition focus:outline-none"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    }
                  />
                  <PasswordStrengthMeter password={password} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Xác nhận mật khẩu mới
                  </label>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    leftIcon={<Lock className="size-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="pointer-events-auto text-text-tertiary hover:text-text-primary transition focus:outline-none"
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    }
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  className="w-full mt-2"
                >
                  Cập nhật mật khẩu
                </Button>
              </form>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

