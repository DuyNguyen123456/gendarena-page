'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Search, Pencil, CheckCircle, AlertCircle } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updateProfileExpertise } from '@/services/profile'
import type { TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORIES, TOPIC_CATEGORY_CONFIG } from '@/types/submission'

interface UserRow {
  id: string
  full_name: string
  email: string
  phone?: string
  organization?: string
  role?: string
  expertise?: string[] | null
  created_at: string
}

// ─── Expertise Editor Modal ──────────────────────────────────────────────────

function ExpertiseEditorModal({
  userId,
  current,
  onSave,
  onClose,
}: {
  userId: string
  current: string[]
  onSave: () => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<TopicCategory[]>(
    (current ?? []).filter((e): e is TopicCategory =>
      TOPIC_CATEGORIES.includes(e as TopicCategory)
    )
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const toggle = (cat: TopicCategory) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await updateProfileExpertise(userId, selected)
    setSaving(false)
    if (!result.ok) {
      setMsg({ ok: false, text: result.error })
    } else {
      setMsg({ ok: true, text: 'Đã cập nhật lĩnh vực chuyên môn.' })
      setTimeout(() => {
        onSave()
        onClose()
      }, 700)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-expertise-title">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-overlay p-6 shadow-elevation-3 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div>
          <h3 id="modal-expertise-title" className="font-display text-base font-semibold text-text-primary">
            Lĩnh vực chuyên môn của giám khảo
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Chọn các lĩnh vực để hỗ trợ thuật toán phân công bài nộp chuẩn xác.
          </p>
        </div>

        <div className="space-y-2">
          {TOPIC_CATEGORIES.map((cat) => {
            const cfg = TOPIC_CATEGORY_CONFIG[cat]
            const isSelected = selected.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggle(cat)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors duration-[150ms]',
                  isSelected
                    ? cfg.cls
                    : 'border-surface-border bg-surface-base text-text-secondary hover:border-surface-border-strong',
                ].join(' ')}
              >
                <span
                  className={[
                    'size-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'bg-current border-current' : 'border-text-tertiary',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isSelected && <span className="text-[9px] text-surface-base font-bold">✓</span>}
                </span>
                {cfg.label}
              </button>
            )
          })}
        </div>

        {msg && (
          <div
            role={msg.ok ? 'status' : 'alert'}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              msg.ok
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {msg.ok ? <CheckCircle className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            isLoading={saving}
            onClick={handleSave}
            className="flex-1"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Huỷ
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Users Page ───────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingExpertiseFor, setEditingExpertiseFor] = useState<UserRow | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, organization, role, expertise, created_at')
      .order('created_at', { ascending: false })
    setUsers((data as UserRow[]) || [])
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!isMounted) return
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      await loadUsers()
      if (!isMounted) return
      setLoading(false)
    }
    init()
    return () => { isMounted = false }
  }, [supabase, router, loadUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles').update({ role: newRole } as never).eq('id', userId)
    if (error) {
      setMessage({ type: 'error', text: 'Lỗi cập nhật quyền: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Đã cập nhật quyền người dùng thành công.' })
      await loadUsers()
    }
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.organization?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading text="Đang tải danh sách người dùng..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
      </div>

      {editingExpertiseFor && (
        <ExpertiseEditorModal
          userId={editingExpertiseFor.id}
          current={editingExpertiseFor.expertise ?? []}
          onSave={() => loadUsers()}
          onClose={() => setEditingExpertiseFor(null)}
        />
      )}

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-8">
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
                <Users className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý người dùng & phân quyền
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Giám sát danh sách thành viên, cập nhật quyền hạn và lĩnh vực chuyên môn của BGK
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" size="md">Tổng số: {users.length} thành viên</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Status Message */}
        {message && (
          <div
            role={message.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, email, đơn vị..."
            leftIcon={<Search className="size-4" />}
          />
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden p-0 border-surface-border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-overlay text-text-secondary font-medium text-xs">
                  <th scope="col" className="px-5 py-3.5">Họ và tên</th>
                  <th scope="col" className="px-5 py-3.5">Email</th>
                  <th scope="col" className="px-5 py-3.5">SĐT</th>
                  <th scope="col" className="px-5 py-3.5">Đơn vị</th>
                  <th scope="col" className="px-5 py-3.5">Quyền truy cập</th>
                  <th scope="col" className="px-5 py-3.5">Chuyên môn (BGK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-overlay/50 transition-colors duration-150">
                    <td className="px-5 py-4 font-medium text-text-primary whitespace-nowrap">
                      {u.full_name || 'Chưa cập nhật'}
                    </td>
                    <td className="px-5 py-4 text-text-secondary whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="px-5 py-4 text-text-tertiary whitespace-nowrap">
                      {u.phone || '—'}
                    </td>
                    <td className="px-5 py-4 text-text-tertiary whitespace-nowrap">
                      {u.organization || '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <select
                        value={u.role || 'participant'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="h-8 rounded-md border border-surface-border bg-surface-raised px-2.5 text-xs text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors cursor-pointer"
                      >
                        <option value="participant">Thí sinh</option>
                        <option value="judge">Giám khảo</option>
                        <option value="admin">Quản trị viên</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      {u.role === 'judge' ? (
                        <div className="space-y-1.5">
                          {u.expertise?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {u.expertise.map((e) => {
                                const cfg = TOPIC_CATEGORY_CONFIG[e as TopicCategory]
                                return cfg ? (
                                  <span
                                    key={e}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.cls}`}
                                  >
                                    {cfg.label}
                                  </span>
                                ) : null
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-text-tertiary italic">Chưa khai báo</span>
                          )}
                          <div>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Pencil className="size-3" />}
                              onClick={() => setEditingExpertiseFor(u)}
                              className="h-6 px-2 text-xs text-brand-cyan hover:text-brand-cyan-bright"
                            >
                              Cập nhật
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-disabled text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-text-tertiary">
              <Users className="size-10 text-text-disabled mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-medium text-text-secondary">Không tìm thấy người dùng</p>
              <p className="text-xs text-text-tertiary mt-1">Không có kết quả nào phù hợp với từ khóa tìm kiếm.</p>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  )
}
