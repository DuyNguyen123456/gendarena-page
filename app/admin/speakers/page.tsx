'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mic, Plus, Pencil, Trash2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type Speaker = {
  id: string
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  avatar_url: string | null
  linkedin_url: string | null
  display_order: number
  category: 'speaker' | 'judge' | 'mentor'
  is_featured: boolean
}

const EMPTY_FORM: Omit<Speaker, 'id'> = {
  name: '',
  title: '',
  organization: '',
  bio: '',
  avatar_url: '',
  linkedin_url: '',
  display_order: 0,
  category: 'speaker',
  is_featured: true,
}

const CATEGORIES: Speaker['category'][] = ['speaker', 'judge', 'mentor']
const CATEGORY_CONFIG: Record<Speaker['category'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }> = {
  speaker: { label: 'Diễn giả', variant: 'info' },
  judge: { label: 'Giám khảo', variant: 'warning' },
  mentor: { label: 'Cố vấn', variant: 'brand' },
}

export default function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Speaker, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const loadSpeakers = async () => {
    const { data } = await supabase
      .from('speakers')
      .select('*')
      .order('display_order', { ascending: true })
    if (data) setSpeakers(data as Speaker[])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
      if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
      await loadSpeakers()
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Vui lòng nhập họ và tên.'); return }
    setSaving(true)
    setError('')

    if (editId) {
      const { error: updateError } = await supabase.from('speakers').update(form).eq('id', editId)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase.from('speakers').insert(form)
      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
    await loadSpeakers()
  }

  const handleEdit = (s: Speaker) => {
    const { id, ...rest } = s
    setEditId(id)
    setForm(rest)
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa thông tin diễn giả "${name}"?`)) return
    await supabase.from('speakers').delete().eq('id', id)
    await loadSpeakers()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  if (loading) return <Loading text="Đang tải danh sách diễn giả..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
      </div>

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-[150ms] mb-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại Control Center
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mic className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý diễn giả, giám khảo & cố vấn
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Cập nhật hồ sơ chuyên gia hiển thị trên trang chủ và thông tin sự kiện
              </p>
            </div>
            {!showForm && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setShowForm(true)}
              >
                Thêm diễn giả mới
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Error alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 px-4 py-3 text-sm text-semantic-danger"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Create / Edit */}
        {showForm && (
          <Card className="border-brand-cyan/30 shadow-elevation-2 bg-surface-overlay">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="size-5 text-brand-cyan" />
                {editId ? 'Chỉnh sửa thông tin chuyên gia' : 'Thêm chuyên gia mới'}
              </CardTitle>
              <CardDescription>
                Điền thông tin giới thiệu và liên kết xã hội để hoàn thiện hồ sơ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sp-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    id="sp-name"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    required
                    placeholder="VD: TS. Nguyễn Văn A"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sp-category" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Vai trò danh mục
                  </label>
                  <select
                    id="sp-category"
                    value={form.category}
                    onChange={e => setField('category', e.target.value as Speaker['category'])}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sp-title" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Chức danh / Học hàm
                  </label>
                  <input
                    id="sp-title"
                    value={form.title ?? ''}
                    onChange={e => setField('title', e.target.value)}
                    placeholder="VD: Giám đốc Công nghệ (CTO)"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sp-org" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Tổ chức / Doanh nghiệp
                  </label>
                  <input
                    id="sp-org"
                    value={form.organization ?? ''}
                    onChange={e => setField('organization', e.target.value)}
                    placeholder="VD: Tập đoàn Công nghệ FPT"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sp-avatar" className="block text-xs font-medium text-text-secondary mb-1.5">
                    URL Ảnh đại diện
                  </label>
                  <input
                    id="sp-avatar"
                    value={form.avatar_url ?? ''}
                    onChange={e => setField('avatar_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sp-linkedin" className="block text-xs font-medium text-text-secondary mb-1.5">
                    URL LinkedIn
                  </label>
                  <input
                    id="sp-linkedin"
                    value={form.linkedin_url ?? ''}
                    onChange={e => setField('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sp-order" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Thứ tự sắp xếp
                  </label>
                  <input
                    id="sp-order"
                    type="number"
                    value={form.display_order}
                    onChange={e => setField('display_order', parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={e => setField('is_featured', e.target.checked)}
                      className="size-4 rounded border-surface-border text-brand-cyan focus:ring-brand-cyan/20"
                    />
                    <span className="text-sm text-text-secondary font-medium">Hiển thị nổi bật trên trang chủ</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="sp-bio" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Tiểu sử ngắn
                  </label>
                  <textarea
                    id="sp-bio"
                    value={form.bio ?? ''}
                    onChange={e => setField('bio', e.target.value)}
                    rows={3}
                    placeholder="Giới thiệu kinh nghiệm và chuyên môn của diễn giả..."
                    className="w-full px-3 py-2 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors resize-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={saving}
                  >
                    {saving ? 'Đang lưu...' : editId ? 'Lưu thay đổi' : 'Thêm mới'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={handleCancel}
                  >
                    Huỷ
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Speakers List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Danh sách chuyên gia ({speakers.length})
          </h2>

          {speakers.length === 0 ? (
            <Card className="p-12 text-center text-text-tertiary">
              <Mic className="size-10 text-text-disabled mx-auto mb-2" />
              <p className="text-sm">Chưa có diễn giả nào được thêm vào hệ thống.</p>
            </Card>
          ) : (
            speakers.map((s) => {
              const catCfg = CATEGORY_CONFIG[s.category] ?? { label: s.category, variant: 'default' }
              return (
                <Card key={s.id} className="p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar preview */}
                      <div className="size-12 rounded-full border border-surface-border bg-surface-overlay flex items-center justify-center shrink-0 overflow-hidden">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-display text-base font-bold text-brand-cyan">{s.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-text-primary truncate">
                            {s.name}
                          </h3>
                          <Badge variant={catCfg.variant} size="sm">
                            {catCfg.label}
                          </Badge>
                          {!s.is_featured && (
                            <Badge variant="default" size="sm" className="opacity-60">
                              <EyeOff className="size-3 mr-1" />
                              Ẩn trang chủ
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 truncate">
                          {s.title}{s.organization ? ` · ${s.organization}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="size-3.5" />}
                        onClick={() => handleEdit(s)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="size-3.5" />}
                        onClick={() => handleDelete(s.id, s.name)}
                        className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger"
                      >
                        Xoá
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
