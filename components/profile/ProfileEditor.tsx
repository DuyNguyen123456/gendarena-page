'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DobPicker from '@/components/ui/dob-picker'
import {
  updateProfile,
  uploadAvatar,
  validatePhone,
  validateFacebookUrl,
} from '@/services/profile'
import { formatDob } from '@/lib/utils'
import {
  User as UserIcon,
  Phone,
  Building2,
  GraduationCap,
  Calendar,
  BookOpen,
  Link as LinkIcon,
  Camera,
  Save,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Trophy,
  Globe,
  ShieldCheck,
} from 'lucide-react'
import type { PublicProfileFields } from '@/types/profile'

export type ProfileData = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  dob?: string | null
  university?: string | null
  faculty?: string | null
  major?: string | null
  organization: string | null
  uid: string | null
  facebook_url: string | null
  avatar_url: string | null
  role?: string | null
  achievements?: string | null
  is_profile_public?: boolean | null
  public_fields?: PublicProfileFields | null
}

export const DEFAULT_PUBLIC_FIELDS: PublicProfileFields = {
  phone: false,
  email: false,
  facebook_url: true,
  university: true,
  faculty: true,
  major: true,
  achievements: true,
}

type FormState = {
  full_name: string
  phone: string
  dob: string
  university: string
  faculty: string
  major: string
  organization: string
  facebook_url: string
  achievements: string
  is_profile_public: boolean
  public_fields: PublicProfileFields
}

export default function ProfileEditor({
  profile,
  onProfileUpdated,
  isCompact = false,
  onCancel,
}: {
  profile: ProfileData
  onProfileUpdated?: (updated: ProfileData) => void
  isCompact?: boolean
  onCancel?: () => void
}) {
  const [form, setForm] = useState<FormState>({
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    dob: formatDob(profile.dob ?? ''),
    university: profile.university ?? '',
    faculty: profile.faculty ?? '',
    major: profile.major ?? '',
    organization: profile.organization ?? '',
    facebook_url: profile.facebook_url ?? '',
    achievements: profile.achievements ?? '',
    is_profile_public: Boolean(profile.is_profile_public),
    public_fields: {
      ...DEFAULT_PUBLIC_FIELDS,
      ...(profile.public_fields || {}),
    },
  })
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      dob: formatDob(profile.dob ?? ''),
      university: profile.university ?? '',
      faculty: profile.faculty ?? '',
      major: profile.major ?? '',
      organization: profile.organization ?? '',
      facebook_url: profile.facebook_url ?? '',
      achievements: profile.achievements ?? '',
      is_profile_public: Boolean(profile.is_profile_public),
      public_fields: {
        ...DEFAULT_PUBLIC_FIELDS,
        ...(profile.public_fields || {}),
      },
    })
  }, [profile])

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
    if (!validate()) return

    setSaving(true)
    setStatusMessage(null)

    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      const upload = await uploadAvatar(profile.id, avatarFile)
      if (!upload.ok) {
        setStatusMessage({ text: upload.error, type: 'error' })
        setSaving(false)
        return
      }
      avatarUrl = upload.url
    }

    const payload = {
      email: profile.email || null,
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      dob: form.dob.trim() || null,
      university: form.university.trim() || null,
      faculty: form.faculty.trim() || null,
      major: form.major.trim() || null,
      organization: form.organization.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      avatar_url: avatarUrl,
      achievements: form.achievements.trim() || null,
      is_profile_public: form.is_profile_public,
      public_fields: form.public_fields,
    }

    const result = await updateProfile(profile.id, payload)

    if (!result.ok) {
      setStatusMessage({ text: `Không thể lưu thông tin hồ sơ: ${result.error}`, type: 'error' })
    } else {
      setStatusMessage({ text: 'Đã lưu thông tin hồ sơ thành công!', type: 'success' })
      setAvatarFile(null)
      setAvatarPreview(null)
      onProfileUpdated?.({
        ...profile,
        ...payload,
      })
    }
    setSaving(false)
  }

  const displayAvatar = avatarPreview ?? profile.avatar_url

  const content = (
    <form onSubmit={handleSave} className="space-y-6">
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
              : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0 text-semantic-success" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-semantic-danger" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Avatar Section */}
      <div className="flex items-center gap-4 pb-4 border-b border-surface-border">
        <div className="relative group shrink-0">
          <div className="size-16 sm:size-20 rounded-full border-2 border-surface-border group-hover:border-brand-cyan/60 transition overflow-hidden bg-surface-overlay flex items-center justify-center">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-2xl font-bold text-brand-cyan select-none">
                {(form.full_name || profile.email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-0 right-0 size-6 sm:size-7 rounded-full bg-brand-cyan text-brand-navy flex items-center justify-center shadow-md hover:bg-brand-cyan-bright transition"
            title="Đổi ảnh đại diện"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-1 min-w-0">
          <p className="font-display font-semibold text-text-primary text-sm sm:text-base truncate">
            {form.full_name || 'Chưa đặt họ tên'}
          </p>
          <p className="text-xs text-text-tertiary font-mono truncate">
            UID: {profile.uid || 'Chưa tạo'}
          </p>
          <p className="text-[11px] text-text-disabled">
            Ảnh JPEG/PNG/WebP, tối đa 2 MB
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {/* Email Read-only */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-secondary">
            Địa chỉ Email (Định danh)
          </label>
          <Input
            type="email"
            value={profile.email ?? ''}
            disabled
            leftIcon={<Mail className="size-4 text-text-disabled" />}
            className="bg-surface-base text-text-disabled cursor-not-allowed border-surface-border"
          />
        </div>

        {/* Full Name & DOB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Họ và tên <span className="text-semantic-danger">*</span>
            </label>
            <Input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
                if (formErrors.full_name) setFormErrors((prev) => ({ ...prev, full_name: undefined }))
              }}
              placeholder="VD: Nguyễn Văn A"
              leftIcon={<UserIcon className="size-4" />}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Ngày sinh (DD/MM/YYYY) <span className="text-semantic-danger">*</span>
            </label>
            <DobPicker
              value={form.dob}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, dob: val }))
                if (formErrors.dob) setFormErrors((prev) => ({ ...prev, dob: undefined }))
              }}
              placeholder="Chọn ngày sinh (DD/MM/YYYY)"
              error={!!formErrors.dob}
            />
          </div>
        </div>

        {/* Phone & Organization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Số điện thoại <span className="text-semantic-danger">*</span>
            </label>
            <Input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, phone: e.target.value }))
                if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }))
              }}
              placeholder="VD: 0912345678"
              leftIcon={<Phone className="size-4" />}
            />
            {formErrors.phone && (
              <p className="text-xs text-semantic-danger flex items-center gap-1">
                <AlertTriangle className="size-3" /> {formErrors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Trường học (Đại học / Cao đẳng) <span className="text-semantic-danger">*</span>
            </label>
            <Input
              type="text"
              required
              value={form.university}
              onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))}
              placeholder="VD: Đại học Bách Khoa Hà Nội"
              leftIcon={<GraduationCap className="size-4" />}
            />
          </div>
        </div>

        {/* Faculty & Major */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Khoa / Viện đào tạo <span className="text-semantic-danger">*</span>
            </label>
            <Input
              type="text"
              required
              value={form.faculty}
              onChange={(e) => setForm((prev) => ({ ...prev, faculty: e.target.value }))}
              placeholder="VD: Trường CNTT & Truyền thông"
              leftIcon={<Building2 className="size-4" />}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Ngành học <span className="text-semantic-danger">*</span>
            </label>
            <Input
              type="text"
              required
              value={form.major}
              onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
              placeholder="VD: Khoa học Máy tính"
              leftIcon={<BookOpen className="size-4" />}
            />
          </div>
        </div>

        {/* Additional Info: Organization & Facebook */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Đơn vị / Doanh nghiệp công tác
            </label>
            <Input
              type="text"
              value={form.organization}
              onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
              placeholder="VD: Viettel, FPT..."
              leftIcon={<Building2 className="size-4" />}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Link Facebook cá nhân
            </label>
            <Input
              type="url"
              value={form.facebook_url}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, facebook_url: e.target.value }))
                if (formErrors.facebook_url) setFormErrors((prev) => ({ ...prev, facebook_url: undefined }))
              }}
              placeholder="VD: https://facebook.com/username"
              leftIcon={<LinkIcon className="size-4" />}
            />
            {formErrors.facebook_url && (
              <p className="text-xs text-semantic-danger flex items-center gap-1">
                <AlertTriangle className="size-3" /> {formErrors.facebook_url}
              </p>
            )}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Trophy className="size-3.5 text-brand-gold" />
              Thành tích &amp; Kỹ năng nổi bật
            </label>
            <span className="text-[11px] text-text-disabled">Khuyến khích</span>
          </div>
          <textarea
            rows={3}
            value={form.achievements}
            onChange={(e) => setForm((prev) => ({ ...prev, achievements: e.target.value }))}
            placeholder="VD: Giải Ba Hackathon AI 2025, chuyên môn Fullstack React/Next.js & Python, nghiên cứu khoa học cấp trường, IELTS 7.0..."
            className="w-full px-3.5 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand-cyan text-sm transition resize-none leading-relaxed"
          />
          <p className="text-[11px] text-text-tertiary">
            Thông tin này sẽ được hiển thị cho các thí sinh khác khi bạn bật chế độ tìm bạn ghép đội.
          </p>
        </div>

        {/* Teaming & Privacy Settings */}
        <div className="p-4 rounded-xl border border-surface-border bg-surface-overlay/50 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Globe className="size-4 text-brand-cyan" />
                <span className="text-sm font-semibold text-text-primary">
                  Công khai hồ sơ để tìm bạn ghép đội
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                    form.is_profile_public
                      ? 'bg-semantic-success/15 text-semantic-success border border-semantic-success/30'
                      : 'bg-surface-raised text-text-disabled border border-surface-border'
                  }`}
                >
                  {form.is_profile_public ? 'Đang Bật' : 'Đang Tắt'}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cho phép các thí sinh chưa có đội khác tìm thấy và liên hệ với bạn để lập nhóm dự thi. Mặc định luôn tắt để bảo vệ quyền riêng tư.
              </p>
            </div>

            {/* Toggle switch button */}
            <button
              type="button"
              role="switch"
              aria-checked={form.is_profile_public}
              onClick={() =>
                setForm((prev) => ({ ...prev, is_profile_public: !prev.is_profile_public }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.is_profile_public ? 'bg-brand-cyan' : 'bg-surface-raised border-surface-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form.is_profile_public ? 'translate-x-5 bg-brand-navy' : 'translate-x-0 bg-text-disabled'
                }`}
              />
            </button>
          </div>

          {/* Selective Fields Options (Visible when is_profile_public is true) */}
          {form.is_profile_public && (
            <div className="pt-3 border-t border-surface-border/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-brand-cyan" />
                  Chọn thông tin bạn muốn hiển thị công khai:
                </span>
                <span className="text-[11px] text-text-tertiary">
                  Họ tên &amp; Avatar luôn hiển thị
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'phone', label: 'Số điện thoại (Gọi / Zalo)', desc: 'Tiện cho thí sinh khác liên hệ nhanh' },
                  { key: 'email', label: 'Địa chỉ Email', desc: 'Thí sinh có thể gửi thư trao đổi' },
                  { key: 'facebook_url', label: 'Link Facebook cá nhân', desc: 'Nhắn tin qua trang cá nhân Facebook' },
                  { key: 'university', label: 'Trường học & Khoa / Ngành', desc: 'Tìm đồng đội cùng trường hoặc ngành phù hợp' },
                  { key: 'achievements', label: 'Thành tích & Kỹ năng nổi bật', desc: 'Tăng cơ hội được mời vào đội mạnh' },
                ].map((item) => {
                  const isChecked = form.public_fields[item.key as keyof PublicProfileFields] !== false
                  return (
                    <label
                      key={item.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                        isChecked
                          ? 'bg-brand-cyan/5 border-brand-cyan/30 text-text-primary'
                          : 'bg-surface-raised/40 border-surface-border/60 text-text-tertiary opacity-70 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setForm((prev) => ({
                            ...prev,
                            public_fields: {
                              ...prev.public_fields,
                              [item.key]: checked,
                            },
                          }))
                        }}
                        className="mt-0.5 rounded border-surface-border text-brand-cyan focus:ring-brand-cyan size-4 accent-brand-cyan"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-none">{item.label}</p>
                        <p className="text-[10px] text-text-disabled mt-1 truncate">{item.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={saving}
          >
            Đóng
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={saving}
          leftIcon={<Save className="size-4" />}
        >
          Lưu thông tin hồ sơ
        </Button>
      </div>
    </form>
  )

  if (isCompact) {
    return content
  }

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-primary">
          Thông tin cá nhân
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Cập nhật hồ sơ đầy đủ để nhận huy hiệu Xác thực và giúp ban tổ chức liên hệ trao giải
        </p>
      </div>
      {content}
    </Card>
  )
}
