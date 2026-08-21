'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, XCircle, User, Mail, Phone, Building2, Lock, Eye, EyeOff } from 'lucide-react'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

export default function RegisterForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const supabase = createClient()
  const prefersReducedMotion = useReducedMotion()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const phone = formData.get('phone') as string
    const organization = formData.get('organization') as string

    const confirmPassword = formData.get('confirmPassword') as string
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      setLoading(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          phone: phone,
          organization: organization,
        } as never)

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
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
            <div className="size-16 rounded-full bg-semantic-success/10 border border-semantic-success/30 flex items-center justify-center mx-auto text-semantic-success mb-5">
              <CheckCircle2 className="size-8" />
            </div>
            <Badge variant="brand" size="sm" className="mb-3">GenD Arena 2026</Badge>
            <h2 className="font-display text-2xl font-semibold text-text-primary mb-2">
              Đăng ký thành công!
            </h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Hệ thống đã gửi email kích hoạt. Vui lòng kiểm tra hộp thư để xác thực tài khoản trước khi truy cập đấu trường.
            </p>
            <Link href="/login" className="block w-full">
              <Button variant="primary" size="lg" className="w-full">
                Đăng nhập ngay
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
        className="relative z-10 w-full max-w-md my-4"
      >
        <Card className="p-6 sm:p-8 bg-surface-raised border border-surface-border shadow-elevation-2">
          {/* Brand header */}
          <div className="text-center mb-6">
            <Badge variant="brand" size="sm" className="mb-3">
              GenD Arena 2026
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary font-display tracking-tight">
              Đăng ký tài khoản
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              Tham gia đấu trường khởi nghiệp công nghệ trẻ
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-start gap-2.5 mb-5">
              <XCircle className="size-4 shrink-0 mt-0.5 text-semantic-danger" />
              <span className="leading-snug">Lỗi: {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Họ và tên <span className="text-brand-cyan">*</span>
              </label>
              <Input
                name="fullName"
                required
                placeholder="Nguyễn Văn A"
                leftIcon={<User className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Email <span className="text-brand-cyan">*</span>
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
              <label className="block text-xs font-semibold text-text-secondary">
                Số điện thoại
              </label>
              <Input
                name="phone"
                placeholder="0901234567"
                leftIcon={<Phone className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Đơn vị / Trường học
              </label>
              <Input
                name="organization"
                placeholder="Đại học ABC"
                leftIcon={<Building2 className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Mật khẩu <span className="text-brand-cyan">*</span>
              </label>
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Ít nhất 6 ký tự"
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Xác nhận mật khẩu <span className="text-brand-cyan">*</span>
              </label>
              <Input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
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
              Đăng ký tài khoản
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface-raised px-3 text-text-tertiary">
                Hoặc
              </span>
            </div>
          </div>

          {/* Google OAuth Login */}
          <GoogleSignInButton label="Tiếp tục với Google" />

          <p className="text-center text-xs text-text-secondary mt-6 font-medium">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="text-brand-cyan hover:text-brand-cyan-bright font-semibold hover:underline transition ml-1"
            >
              Đăng nhập
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}

