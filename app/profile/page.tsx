'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
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
  Loader2,
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
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-xl text-sm font-semibold shadow-2xl cursor-pointer max-w-sm ${
        type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
          : 'bg-red-950/90 border-red-500/50 text-red-300'
      }`}
      onClick={onDismiss}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  )
}

function FieldRow({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyValue({ value, mono }: { value: string | null | undefined; mono?: boolean }) {
  return (
    <div
      className={`px-4 py-3 bg-slate-950/60 border border-[#1e2d5a]/60 rounded-lg text-sm ${
        mono ? 'font-mono text-cyan-300 select-all' : 'text-slate-400'
      }`}
    >
      {value || <span className="text-slate-600 italic">Chưa cập nhật</span>}
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  participant: 'Thí sinh',
  judge: 'Giám khảo',
  admin: 'Quản trị viên',
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

  // Expertise (judge only)
  const [expertise, setExpertise] = useState<TopicCategory[]>([])
  const [expertiseSaving, setExpertiseSaving] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

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
      .select('id, full_name, email, phone, organization, uid, facebook_url, avatar_url, role, expertise')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      showToast('Không thể tải thông tin hồ sơ.', 'error')
      setLoading(false)
      return
    }

    const p = data as unknown as Profile
    setProfile(p)
    setForm({
      full_name: p.full_name ?? '',
      phone: p.phone ?? '',
      organization: p.organization ?? '',
      facebook_url: p.facebook_url ?? '',
    })
    setExpertise(p.expertise ?? [])
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

  const handleExpertiseSave = async () => {
    if (!profile) return
    setExpertiseSaving(true)
    const result = await updateProfileExpertise(profile.id, expertise)
    if (!result.ok) {
      showToast(result.error, 'error')
    } else {
      showToast('Đã cập nhật chuyên môn.', 'success')
    }
    setExpertiseSaving(false)
  }

  const toggleExpertise = (cat: TopicCategory) => {
    setExpertise((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  if (loading) return <Loading text="Đang tải hồ sơ..." />

  const isJudge = profile?.role === 'judge'
  const displayAvatar = avatarPreview ?? profile?.avatar_url

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-orbitron font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Dashboard</span>
        </Link>

        {/* Page header */}
        <div className="mb-8 border-b border-[#1e2d5a] pb-6">
          <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-cyan-400" />
            <span>Hồ sơ cá nhân</span>
          </h1>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Identity card (read-only + avatar) */}
          <div className="tech-panel p-6 border-cyan-500/20 relative cyber-corners">
            <h2 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Thông tin tài khoản</span>
            </h2>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full border-2 border-cyan-500/40 bg-[#131e3d] overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-slate-600" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-cyan-400 hover:text-cyan-300 uppercase border border-cyan-500/30 px-3 py-1.5 rounded-lg transition hover:bg-cyan-950/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Đổi ảnh</span>
                </button>
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
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition"
                  >
                    <X className="w-3 h-3" />
                    <span>Huỷ</span>
                  </button>
                )}
                <p className="text-[9px] text-slate-600 text-center">JPEG · PNG · WebP<br />tối đa 2 MB</p>
              </div>

              {/* Read-only fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <FieldRow label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                  <ReadOnlyValue value={profile?.email} />
                </FieldRow>

                <FieldRow label="UID cá nhân" icon={<Hash className="w-3.5 h-3.5" />}>
                  <ReadOnlyValue value={profile?.uid} mono />
                </FieldRow>

                <FieldRow label="Vai trò" icon={<Shield className="w-3.5 h-3.5" />}>
                  <div className="px-4 py-3 bg-slate-950/60 border border-[#1e2d5a]/60 rounded-lg flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isJudge
                          ? 'bg-purple-400'
                          : profile?.role === 'admin'
                          ? 'bg-red-400'
                          : 'bg-cyan-400'
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-300">
                      {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? 'Thí sinh'}
                    </span>
                  </div>
                </FieldRow>
              </div>
            </div>
          </div>

          {/* Editable profile fields */}
          <div className="tech-panel p-6 border-cyan-500/20 relative">
            <h2 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-cyan-400" />
              <span>Thông tin cá nhân</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldRow label="Họ và tên" icon={<UserIcon className="w-3.5 h-3.5" />}>
                <input
                  id="profile-full-name"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-[#1e2d5a] focus:border-cyan-400/60 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
              </FieldRow>

              <FieldRow label="Số điện thoại" icon={<Phone className="w-3.5 h-3.5" />}>
                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }))
                    setFormErrors((fe) => ({ ...fe, phone: undefined }))
                  }}
                  placeholder="09xxxxxxxx"
                  className={`w-full px-4 py-3 bg-slate-950/80 border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition ${
                    formErrors.phone
                      ? 'border-red-500/60 bg-red-950/10'
                      : 'border-[#1e2d5a] focus:border-cyan-400/60'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.phone}
                  </p>
                )}
              </FieldRow>

              <FieldRow label="Đơn vị / Trường học" icon={<Building2 className="w-3.5 h-3.5" />}>
                <input
                  id="profile-organization"
                  type="text"
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder="Tên trường / công ty..."
                  className="w-full px-4 py-3 bg-slate-950/80 border border-[#1e2d5a] focus:border-cyan-400/60 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
              </FieldRow>

              <FieldRow label="Facebook URL" icon={<LinkIcon className="w-3.5 h-3.5" />}>
                <input
                  id="profile-facebook"
                  type="url"
                  value={form.facebook_url}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, facebook_url: e.target.value }))
                    setFormErrors((fe) => ({ ...fe, facebook_url: undefined }))
                  }}
                  placeholder="https://facebook.com/..."
                  className={`w-full px-4 py-3 bg-slate-950/80 border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition ${
                    formErrors.facebook_url
                      ? 'border-red-500/60 bg-red-950/10'
                      : 'border-[#1e2d5a] focus:border-cyan-400/60'
                  }`}
                />
                {formErrors.facebook_url && (
                  <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.facebook_url}
                  </p>
                )}
              </FieldRow>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                id="save-profile-btn"
                type="submit"
                disabled={saving}
                className="tech-btn-accent font-orbitron px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu hồ sơ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Judge expertise section */}
        {isJudge && (
          <div className="tech-panel p-6 border-purple-500/20 relative mt-8">
            <h2 className="font-orbitron text-xs font-bold tracking-widest text-purple-400 uppercase mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Chuyên môn giám khảo</span>
            </h2>
            <p className="text-xs text-slate-500 mb-5">Chọn các nhóm chủ đề bạn có chuyên môn đánh giá.</p>

            <div className="space-y-3">
              {TOPIC_CATEGORIES.map((cat) => {
                const selected = expertise.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    id={`expertise-${cat.replace(/[\s,/]/g, '-')}`}
                    onClick={() => toggleExpertise(cat)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition text-left cursor-pointer ${
                      selected
                        ? 'border-purple-500/50 bg-purple-950/30 text-purple-300'
                        : 'border-[#1e2d5a] bg-slate-950/30 text-slate-400 hover:border-purple-500/30 hover:text-purple-400'
                    }`}
                  >
                    {selected ? (
                      <CheckSquare className="w-5 h-5 text-purple-400 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600 shrink-0" />
                    )}
                    <span>{cat}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                id="save-expertise-btn"
                type="button"
                disabled={expertiseSaving}
                onClick={handleExpertiseSave}
                className="px-6 py-2.5 border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 text-xs font-orbitron font-bold tracking-wider rounded-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {expertiseSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu chuyên môn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Facebook quick link */}
        {profile?.facebook_url && (
          <div className="mt-6 flex justify-end">
            <a
              href={profile.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Xem Facebook</span>
            </a>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast text={toast.text} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
