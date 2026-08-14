'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, XCircle, CheckCircle, KeyRound } from 'lucide-react'
import { getPostLoginPath } from '@/lib/auth/routing'
import { getAppUrl } from '@/lib/utils'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

  // Password Recovery state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string>('')
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const resetParam = searchParams.get('reset')

    if (resetParam === 'success') {
      setTimeout(() => {
        setToast({
          text: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.',
          type: 'success',
        })
      }, 0)
    } else if (errorParam) {
      setTimeout(() => {
        setError(errorParam)
      }, 0)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      const msg = typeof authError === 'string' ? authError : authError.message || 'Đã có lỗi xảy ra'
      if (msg.includes('For security purposes') || (msg.includes('after ') && msg.includes('seconds'))) {
        setError('Bạn vừa gửi yêu cầu. Vui lòng đợi khoảng 1 phút trước khi gửi lại.')
      } else {
        setError(msg)
      }
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user!.id)
      .single()

    router.refresh()
    router.push(getPostLoginPath(profile?.role))
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')

    try {
      const redirectUrl = `${getAppUrl()}/auth/callback?next=/reset-password`
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      })

      setResetLoading(false)

      if (resetErr) {
        const msg = typeof resetErr === 'string' ? resetErr : resetErr.message || 'Đã có lỗi xảy ra'
        if (msg.includes('For security purposes') || (msg.includes('after ') && msg.includes('seconds'))) {
          setResetError('Bạn vừa gửi yêu cầu. Vui lòng đợi khoảng 1 phút trước khi gửi lại.')
        } else {
          setResetError(msg)
        }
      } else {
        setShowResetModal(false)
        setToast({
          text: 'Email khôi phục đã được gửi! Vui lòng kiểm tra hộp thư.',
          type: 'success',
        })
        setTimeout(() => setToast(null), 6000)
      }
    } catch (err: unknown) {
      setResetLoading(false)
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Đã có lỗi xảy ra'
      if (msg.includes('For security purposes') || (msg.includes('after ') && msg.includes('seconds'))) {
        setResetError('Bạn vừa gửi yêu cầu. Vui lòng đợi khoảng 1 phút trước khi gửi lại.')
      } else {
        setResetError(msg)
      }
    }
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

      {/* Form Card */}
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
              Đăng nhập
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              Chào mừng bạn trở lại hệ thống đấu trường
            </p>
          </div>

          {/* Toast / Success notification */}
          {toast && (
            <div className="p-3.5 rounded-lg bg-semantic-success/10 border border-semantic-success/30 text-sm text-semantic-success flex items-start gap-2.5 mb-5">
              <CheckCircle className="size-4 shrink-0 mt-0.5 text-semantic-success" />
              <span className="leading-snug">{toast.text}</span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3.5 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-start gap-2.5 mb-5">
              <XCircle className="size-4 shrink-0 mt-0.5 text-semantic-danger" />
              <span className="leading-snug">Lỗi: {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Email
              </label>
              <Input
                name="email"
                type="email"
                required
                placeholder="email@example.com"
                leftIcon={<Mail className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-text-secondary">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail('')
                    setResetError('')
                    setShowResetModal(true)
                  }}
                  className="text-xs text-brand-cyan hover:text-brand-cyan-bright font-medium transition cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
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
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
            >
              Đăng nhập
            </Button>
          </form>

          <p className="text-center text-xs text-text-secondary mt-6 font-medium">
            Chưa có tài khoản?{' '}
            <Link
              href="/register"
              className="text-brand-cyan hover:text-brand-cyan-bright font-semibold hover:underline transition ml-1"
            >
              Đăng ký ngay
            </Link>
          </p>
        </Card>
      </motion.div>

      {/* Password Recovery Dialog Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-brand-cyan" />
              <span>Khôi phục mật khẩu</span>
            </DialogTitle>
            <DialogDescription>
              Nhập địa chỉ email đã đăng ký tài khoản. Chúng tôi sẽ gửi đường dẫn khôi phục mật khẩu vào email của bạn.
            </DialogDescription>
          </DialogHeader>

          {resetError && (
            <div className="p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-xs font-medium text-semantic-danger flex items-start gap-2">
              <XCircle className="size-4 shrink-0 mt-0.5 text-semantic-danger" />
              <span>{resetError}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Email liên kết
              </label>
              <Input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="email@example.com"
                leftIcon={<Mail className="size-4" />}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowResetModal(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={resetLoading}
              >
                Gửi email khôi phục
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

