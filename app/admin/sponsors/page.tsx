'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Handshake, Building2, Plus, Pencil, Trash2, AlertCircle, ExternalLink, EyeOff } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type Sponsor = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  tier: 'platinum' | 'gold' | 'silver' | 'partner'
  display_order: number
  is_active: boolean
}

const EMPTY_FORM: Omit<Sponsor, 'id'> = {
  name: '',
  logo_url: '',
  website_url: '',
  tier: 'partner',
  display_order: 0,
  is_active: true,
}

const TIERS: Sponsor['tier'][] = ['platinum', 'gold', 'silver', 'partner']
const TIER_CONFIG: Record<Sponsor['tier'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }> = {
  platinum: { label: 'Platinum', variant: 'brand' },
  gold: { label: 'Gold', variant: 'warning' },
  silver: { label: 'Silver', variant: 'default' },
  partner: { label: 'Partner', variant: 'info' },
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<Omit<Sponsor, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const loadSponsors = async () => {
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true })
    if (data) setSponsors(data as Sponsor[])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
      if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
      await loadSponsors()
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Vui lòng nhập tên nhà tài trợ.'); return }
    if (!form.logo_url.trim()) { setError('Vui lòng nhập URL logo.'); return }
    setSaving(true)
    setError('')

    if (editId) {
      const { error: updateError } = await supabase.from('sponsors').update(form).eq('id', editId)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase.from('sponsors').insert(form)
      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
    await loadSponsors()
  }

  const handleEdit = (s: Sponsor) => {
    const { id, ...rest } = s
    setEditId(id)
    setForm(rest)
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    await supabase.from('sponsors').delete().eq('id', id)
    await loadSponsors()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  if (loading) return <Loading text="Đang tải danh sách đối tác & nhà tài trợ..." />

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
                <Handshake className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý đối tác & nhà tài trợ
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Quản lý danh sách logo, phân cấp tài trợ và liên kết website của các đơn vị đồng hành
              </p>
            </div>
            {!showForm && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setShowForm(true)}
              >
                Thêm nhà tài trợ
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
                <Handshake className="size-5 text-brand-cyan" />
                {editId ? 'Chỉnh sửa thông tin nhà tài trợ' : 'Thêm nhà tài trợ mới'}
              </CardTitle>
              <CardDescription>
                Điền thông tin và liên kết logo định dạng PNG/SVG để hiển thị tối ưu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="spons-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Tên đơn vị tài trợ *
                  </label>
                  <input
                    id="spons-name"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    required
                    placeholder="VD: Google Cloud / Techcombank"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="spons-tier" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Hạng tài trợ (Tier)
                  </label>
                  <select
                    id="spons-tier"
                    value={form.tier}
                    onChange={e => setField('tier', e.target.value as Sponsor['tier'])}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors cursor-pointer"
                  >
                    {TIERS.map(t => (
                      <option key={t} value={t}>{TIER_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="spons-logo" className="block text-xs font-medium text-text-secondary mb-1.5">
                    URL Logo (ưu tiên nền trong suốt) *
                  </label>
                  <input
                    id="spons-logo"
                    value={form.logo_url}
                    onChange={e => setField('logo_url', e.target.value)}
                    required
                    placeholder="https://.../logo.png"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="spons-web" className="block text-xs font-medium text-text-secondary mb-1.5">
                    URL Website
                  </label>
                  <input
                    id="spons-web"
                    value={form.website_url ?? ''}
                    onChange={e => setField('website_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="spons-order" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Thứ tự hiển thị
                  </label>
                  <input
                    id="spons-order"
                    type="number"
                    value={form.display_order}
                    onChange={e => setField('display_order', parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setField('is_active', e.target.checked)}
                      className="size-4 rounded border-surface-border text-brand-cyan focus:ring-brand-cyan/20"
                    />
                    <span className="text-sm text-text-secondary font-medium">Đang hoạt động (hiển thị trên website)</span>
                  </label>
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={saving}
                  >
                    {saving ? 'Đang lưu...' : editId ? 'Lưu thay đổi' : 'Thêm nhà tài trợ'}
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

        {/* Sponsors List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Danh sách đối tác & nhà tài trợ ({sponsors.length})
          </h2>

          {sponsors.length === 0 ? (
            <Card className="p-12 text-center text-text-tertiary">
              <Building2 className="size-10 text-text-disabled mx-auto mb-3" />
              <p className="text-sm font-medium text-text-secondary">Chưa có nhà tài trợ nào</p>
              <p className="text-xs text-text-tertiary mt-1">Nhấn &quot;Thêm nhà tài trợ&quot; để thiết lập thông tin đối tác.</p>
            </Card>
          ) : (
            sponsors.map((s) => {
              const tierCfg = TIER_CONFIG[s.tier] ?? { label: s.tier, variant: 'default' }
              return (
                <Card key={s.id} className="p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Logo preview */}
                      <div className="w-24 h-12 rounded-lg border border-surface-border bg-surface-overlay flex items-center justify-center shrink-0 overflow-hidden px-2">
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            className="max-h-8 max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-text-tertiary text-[10px]">NO LOGO</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-text-primary truncate">
                            {s.name}
                          </h3>
                          <Badge variant={tierCfg.variant} size="sm">
                            {tierCfg.label}
                          </Badge>
                          {!s.is_active && (
                            <Badge variant="default" size="sm" className="opacity-60">
                              <EyeOff className="size-3 mr-1" />
                              Đang ẩn
                            </Badge>
                          )}
                        </div>
                        {s.website_url && (
                          <a
                            href={s.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline mt-0.5"
                          >
                            <span>{s.website_url}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        )}
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
                        onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xoá nhà tài trợ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá nhà tài trợ &quot;{deleteTarget?.name}&quot;? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setDeleteTarget(null)}
            >
              Huỷ
            </Button>
            <Button
              variant="primary"
              size="md"
              className="bg-semantic-danger text-white hover:bg-semantic-danger/90 active:bg-semantic-danger/80"
              onClick={() => {
                if (deleteTarget) {
                  handleDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Xác nhận xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
