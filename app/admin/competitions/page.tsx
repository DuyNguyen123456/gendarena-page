'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, Plus, Pencil, Trash2, CheckCircle, AlertCircle, Calendar, Users as UsersIcon } from 'lucide-react'
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

type Competition = {
  id: string
  title: string
  description: string
  rules?: string | null
  prizes?: string | null
  status: string
  registration_start?: string | null
  registration_end?: string | null
  submission_start?: string | null
  submission_end?: string | null
  max_team_size?: number | null
  created_at?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }> = {
  upcoming: { label: 'Sắp diễn ra', variant: 'default' },
  registration: { label: 'Mở đăng ký', variant: 'info' },
  submission: { label: 'Đang nộp bài', variant: 'brand' },
  judging: { label: 'Đang chấm điểm', variant: 'warning' },
  completed: { label: 'Đã kết thúc', variant: 'success' },
}

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadCompetitions = useCallback(async () => {
    const { data } = await supabase
      .from('competitions').select('*').order('created_at', { ascending: false })
    setCompetitions(data || [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string }>()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await loadCompetitions()
      setLoading(false)
    }
    init()
  }, [router, supabase, loadCompetitions])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      rules: formData.get('rules') as string,
      prizes: formData.get('prizes') as string,
      status: formData.get('status') as string,
      registration_start: (formData.get('registration_start') as string) || null,
      registration_end: (formData.get('registration_end') as string) || null,
      submission_start: (formData.get('submission_start') as string) || null,
      submission_end: (formData.get('submission_end') as string) || null,
      max_team_size: parseInt(formData.get('max_team_size') as string) || 5,
    }

    const { error } = editingId
      ? await supabase.from('competitions').update(payload as never).eq('id', editingId)
      : await supabase.from('competitions').insert(payload as never)

    if (error) {
      setMessage({ type: 'error', text: 'Lỗi lưu dữ liệu: ' + error.message })
    } else {
      setMessage({
        type: 'success',
        text: editingId ? 'Đã cập nhật thông tin cuộc thi thành công.' : 'Đã tạo cuộc thi mới thành công.',
      })
      setShowForm(false)
      setEditingId(null)
      await loadCompetitions()
    }
    setSubmitLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('competitions').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: 'Lỗi xoá cuộc thi: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Đã xoá cuộc thi thành công.' })
      await loadCompetitions()
    }
  }

  const handleEdit = (comp: Competition) => {
    setEditingId(comp.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editingComp = competitions.find(c => c.id === editingId)

  const formatDateTimeLocal = (iso?: string | null) => {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 16)
  }

  const formatDisplayDate = (iso?: string | null) => {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  if (loading) return <Loading text="Đang tải dữ liệu cuộc thi..." />

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
                <Trophy className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý phân khu cuộc thi
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Thiết lập thông số, thể lệ, cơ cấu giải thưởng và thời gian cho các Arena
              </p>
            </div>
            {!showForm && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="size-4" />}
                onClick={() => { setShowForm(true); setEditingId(null) }}
              >
                Thiết lập cuộc thi mới
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
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

        {/* Create / Edit Form */}
        {showForm && (
          <Card className="border-brand-cyan/30 shadow-elevation-2 bg-surface-overlay">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="size-5 text-brand-cyan" />
                {editingId ? 'Hiệu chỉnh thông số cuộc thi' : 'Thiết lập cuộc thi mới'}
              </CardTitle>
              <CardDescription>
                Điền đầy đủ thông tin chi tiết để công bố lên hệ thống đấu trường
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="comp-title" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Tên cuộc thi / Arena *
                  </label>
                  <input
                    id="comp-title"
                    name="title"
                    required
                    defaultValue={editingComp?.title || ''}
                    placeholder="VD: GenD Arena 2026 Innovation Challenge"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="comp-desc" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Mô tả ngắn gọn *
                  </label>
                  <textarea
                    id="comp-desc"
                    name="description"
                    required
                    rows={2}
                    defaultValue={editingComp?.description || ''}
                    placeholder="Mô tả tóm tắt nội dung và mục tiêu thi đấu..."
                    className="w-full px-3 py-2 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="comp-rules" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Thể lệ thi đấu chi tiết
                    </label>
                    <textarea
                      id="comp-rules"
                      name="rules"
                      rows={4}
                      defaultValue={editingComp?.rules || ''}
                      placeholder="Các quy định và luật chơi trên sàn đấu..."
                      className="w-full px-3 py-2 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="comp-prizes" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Cơ cấu giải thưởng
                    </label>
                    <textarea
                      id="comp-prizes"
                      name="prizes"
                      rows={4}
                      defaultValue={editingComp?.prizes || ''}
                      placeholder="Danh sách phần thưởng cho các thứ hạng..."
                      className="w-full px-3 py-2 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="comp-status" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Trạng thái hoạt động
                    </label>
                    <select
                      id="comp-status"
                      name="status"
                      defaultValue={editingComp?.status || 'upcoming'}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors cursor-pointer"
                    >
                      <option value="upcoming">Sắp diễn ra (Upcoming)</option>
                      <option value="registration">Mở đăng ký (Registration)</option>
                      <option value="submission">Đang nộp bài (Submission)</option>
                      <option value="judging">Đang chấm điểm (Judging)</option>
                      <option value="completed">Đã kết thúc (Completed)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="comp-max-team" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Số thành viên tối đa / đội
                    </label>
                    <input
                      id="comp-max-team"
                      name="max_team_size"
                      type="number"
                      min="1"
                      max="20"
                      defaultValue={editingComp?.max_team_size || 5}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="comp-reg-start" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Mở cổng đăng ký
                    </label>
                    <input
                      id="comp-reg-start"
                      name="registration_start"
                      type="datetime-local"
                      defaultValue={formatDateTimeLocal(editingComp?.registration_start)}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="comp-reg-end" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Đóng cổng đăng ký
                    </label>
                    <input
                      id="comp-reg-end"
                      name="registration_end"
                      type="datetime-local"
                      defaultValue={formatDateTimeLocal(editingComp?.registration_end)}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="comp-sub-start" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Bắt đầu nộp bài
                    </label>
                    <input
                      id="comp-sub-start"
                      name="submission_start"
                      type="datetime-local"
                      defaultValue={formatDateTimeLocal(editingComp?.submission_start)}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="comp-sub-end" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Hạn nộp bài cuối cùng
                    </label>
                    <input
                      id="comp-sub-end"
                      name="submission_end"
                      type="datetime-local"
                      defaultValue={formatDateTimeLocal(editingComp?.submission_end)}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={submitLoading}
                  >
                    {submitLoading ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo cuộc thi'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => { setShowForm(false); setEditingId(null) }}
                  >
                    Huỷ
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Competitions List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Danh sách các phân khu ({competitions.length})
          </h2>

          {competitions.length === 0 ? (
            <Card className="p-12 text-center text-text-tertiary">
              <Trophy className="size-10 text-text-disabled mx-auto mb-3" />
              <p className="text-sm font-medium text-text-secondary">Chưa có cuộc thi nào</p>
              <p className="text-xs text-text-tertiary mt-1">Nhấn &quot;Thiết lập cuộc thi mới&quot; để tạo phân khu đầu tiên.</p>
            </Card>
          ) : (
            competitions.map((comp) => {
              const statusCfg = STATUS_CONFIG[comp.status] ?? { label: comp.status, variant: 'default' }
              return (
                <Card key={comp.id} className="p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-lg font-semibold text-text-primary truncate">
                          {comp.title}
                        </h3>
                        <Badge variant={statusCfg.variant} size="sm">
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-text-secondary text-sm line-clamp-2">
                        {comp.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary pt-1">
                        <span className="inline-flex items-center gap-1">
                          <UsersIcon className="size-3.5" />
                          Tối đa {comp.max_team_size || 5} thành viên/đội
                        </span>
                        {comp.submission_end && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            Hạn nộp: {formatDisplayDate(comp.submission_end)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="size-3.5" />}
                        onClick={() => handleEdit(comp)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="size-3.5" />}
                        onClick={() => setDeleteTarget({ id: comp.id, name: comp.title })}
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
            <DialogTitle>Xác nhận xoá cuộc thi</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá cuộc thi &quot;{deleteTarget?.name}&quot;? Hành động này không thể hoàn tác.
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