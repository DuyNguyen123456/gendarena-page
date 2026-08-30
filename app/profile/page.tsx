'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  updateProfile,
  uploadAvatar,
  updateProfileExpertise,
  validatePhone,
  validateFacebookUrl,
} from '@/services/profile'
import { TOPIC_CATEGORIES } from '@/types/submission'
import type { TopicCategory } from '@/types/submission'
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Link as LinkIcon,
  Save,
  Camera,
  Shield,
  Hash,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Pencil,
  X,
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  organization: string | null
  uid: string | null
  facebook_url: string | null
  avatar_url: string | null
  role: string | null
  expertise: TopicCategory[] | null
}

type FormState = {
  full_name: string
  phone: string
  organization: string
  facebook_url: string
}

type ToastType = 'success' | 'error'

function Toast({ text, type, onDismiss }: { text: string; type: ToastType; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-xl text-sm font-medium shadow-elevation-3 cursor-pointer max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        type === 'success'
          ? 'bg-surface-raised/95 border-semantic-success/40 text-semantic-success'
          : 'bg-surface-raised/95 border-semantic-danger/40 text-semantic-danger'
      }`}
      onClick={onDismiss}
    >
      {type === 'success' ? (
        <CheckCircle2 className="size-5 text-semantic-success shrink-0" />
      ) : (
        <AlertTriangle className="size-5 text-semantic-danger shrink-0" />
      )}
      <span className="leading-snug">{text}</span>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  participant: 'Thí sinh',
  admin: 'Quản trị viên (BTC)',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({
    full_name: '',
    phone: '',
    organization: '',
    facebook_url: '',
  })
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)


  // Toast
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  const showToast = (text: string, type: ToastType) => setToast({ text, type })

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, phone, organization, uid, facebook_url, avatar_url, role, expertise'
      )
      .eq('id', user.id)
      .single()

    if (error || !data) {
      showToast('Không thể tải thông tin hồ sơ.', 'error')
      setLoading(false)
      return
    }

    const p = data as unknown as Profile

    // If role is participant, redirect to unified participant dashboard
    if (p.role === 'participant') {
      router.replace('/dashboard')
      return
    }

    setProfile(p)
    setForm({
      full_name: p.full_name ?? '',
      phone: p.phone ?? '',
      organization: p.organization ?? '',
      facebook_url: p.facebook_url ?? '',
    })
    setLoading(false)
  }

  useEffect(() => {
    void loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Avatar preview
  const handleAvatarPick = (file: File | null) => {
    setAvatarFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    } else {
      setAvatarPreview(null)
    }
  }

  const validate = (): boolean => {
    const errors: Partial<FormState> = {}
    const phoneErr = form.phone ? validatePhone(form.phone) : null
    if (phoneErr) errors.phone = phoneErr
    const fbErr = form.facebook_url ? validateFacebookUrl(form.facebook_url) : null
    if (fbErr) errors.facebook_url = fbErr
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!validate()) return

    setSaving(true)

    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      const upload = await uploadAvatar(profile.id, avatarFile)
      if (!upload.ok) {
        showToast(upload.error, 'error')
        setSaving(false)
        return
      }
      avatarUrl = upload.url
    }

    const result = await updateProfile(profile.id, {
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      organization: form.organization.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      avatar_url: avatarUrl,
    })

    if (!result.ok) {
      showToast(result.error, 'error')
    } else {
      showToast('Đã lưu hồ sơ thành công.', 'success')
      setAvatarFile(null)
      setAvatarPreview(null)
      await loadProfile()
    }
    setSaving(false)
  }

  if (loading) return <Loading variant="profile" text="Đang tải hồ sơ cá nhân..." />

  const displayAvatar = avatarPreview ?? profile?.avatar_url

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      {/* Hero Header với Subtle Background */}
      <div className="relative overflow-hidden border-b border-surface-border bg-surface-raised/40">
        <DotGridBackground />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <motion.div
            className="absolute -top-20 left-1/2 -translate-x-1/2 size-[450px] rounded-full bg-brand-cyan/8 blur-3xl"
            animate={prefersReducedMotion ? {} : { x: ['-3%', '3%', '-3%'] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan-bright font-medium transition mb-4 group"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            <span>Quay lại Bảng điều khiển</span>
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Badge variant="brand" size="sm">
                  GenD Arena 2026
                </Badge>
                <Badge
                  variant={profile?.role === 'admin' ? 'warning' : 'info'}
                  size="sm"
                >
                  {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? 'Thí sinh'}
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                Hồ sơ cá nhân
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Quản lý thông tin tài khoản và cập nhật hồ sơ của bạn
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <motion.main
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8"
      >
        <form onSubmit={handleSave} className="space-y-8">
          {/* Identity card (read-only + avatar) */}
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-surface-border">
              <Shield className="size-5 text-brand-cyan" />
              <h2 className="font-display text-lg font-semibold text-text-primary">
                Thông tin tài khoản
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
              {/* Avatar Pick */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="size-24 rounded-full border-2 border-brand-cyan/30 bg-surface-overlay overflow-hidden flex items-center justify-center shadow-elevation-1">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="size-12 text-text-tertiary" />
                  )}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Camera className="size-3.5" />}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Đổi ảnh
                </Button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
                />

                {avatarFile && (
                  <button
                    type="button"
                    onClick={() => handleAvatarPick(null)}
                    className="flex items-center gap-1 text-xs text-semantic-danger hover:underline transition"
                  >
                    <X className="size-3" />
                    <span>Huỷ ảnh chọn</span>
                  </button>
                )}
                <p className="text-[11px] text-text-tertiary text-center">
                  JPEG · PNG · WebP<br />tối đa 2 MB
                </p>
              </div>

              {/* Read-only details */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Email liên kết
                  </label>
                  <Input
                    value={profile?.email ?? ''}
                    disabled
                    leftIcon={<Mail className="size-4" />}
                    className="cursor-not-allowed opacity-80"
                  />
                  <p className="text-[11px] text-text-tertiary">Email không thể thay đổi</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">
                    UID cá nhân
                  </label>
                  <Input
                    value={profile?.uid ?? 'Chưa cập nhật'}
                    disabled
                    leftIcon={<Hash className="size-4" />}
                    className="font-mono text-brand-cyan select-all opacity-90"
                  />
                  <p className="text-[11px] text-text-tertiary">Dùng để nhận lời mời vào đội</p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Vai trò trên hệ thống
                  </label>
                  <div className="px-3.5 py-2.5 bg-surface-overlay border border-surface-border rounded-lg flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Quyền hạn tài khoản</span>
                    <Badge
                      variant={profile?.role === 'admin' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? 'Thí sinh'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Editable profile fields */}
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-surface-border">
              <Pencil className="size-5 text-brand-cyan" />
              <h2 className="font-display text-lg font-semibold text-text-primary">
                Thông tin cá nhân
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="profile-full-name" className="block text-xs font-semibold text-text-secondary">
                  Họ và tên
                </label>
                <Input
                  id="profile-full-name"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  leftIcon={<UserIcon className="size-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-phone" className="block text-xs font-semibold text-text-secondary">
                  Số điện thoại
                </label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }))
                    setFormErrors((fe) => ({ ...fe, phone: undefined }))
                  }}
                  placeholder="09xxxxxxxx"
                  error={formErrors.phone}
                  leftIcon={<Phone className="size-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-organization" className="block text-xs font-semibold text-text-secondary">
                  Đơn vị / Trường học
                </label>
                <Input
                  id="profile-organization"
                  type="text"
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder="Tên trường / công ty..."
                  leftIcon={<Building2 className="size-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-facebook" className="block text-xs font-semibold text-text-secondary">
                  Facebook URL
                </label>
                <Input
                  id="profile-facebook"
                  type="url"
                  value={form.facebook_url}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, facebook_url: e.target.value }))
                    setFormErrors((fe) => ({ ...fe, facebook_url: undefined }))
                  }}
                  placeholder="https://facebook.com/..."
                  error={formErrors.facebook_url}
                  leftIcon={<LinkIcon className="size-4" />}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-surface-border">
              {profile?.facebook_url ? (
                <a
                  href={profile.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan-bright transition font-medium"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Xem liên kết Facebook</span>
                </a>
              ) : (
                <div />
              )}

              <Button
                id="save-profile-btn"
                type="submit"
                variant="primary"
                size="md"
                isLoading={saving}
                leftIcon={<Save className="size-4" />}
                className="w-full sm:w-auto"
              >
                Lưu hồ sơ
              </Button>
            </div>
          </Card>
        </form>
      </motion.main>

      {/* Toast notification */}
      {toast && (
        <Toast text={toast.text} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}

