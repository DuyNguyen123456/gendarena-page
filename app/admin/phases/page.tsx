'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CompetitionPhase, PhaseFormData, PhaseStatus, SubmissionType } from '@/types/phase'
import { getPhases, createPhase, updatePhase, deletePhase, toggleSubmissionOpen, toggleScoringOpen } from '@/services/phases'
import { ArrowLeft, Calendar, Plus, Pencil, Trash2, Scale, CheckCircle, AlertCircle, Clock, FileText, Link2, Layers } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PhaseStatus }) {
  if (status === 'active') {
    return <Badge variant="success" size="sm">Đang mở</Badge>
  }
  if (status === 'completed') {
    return <Badge variant="info" size="sm">Đã kết thúc</Badge>
  }
  return <Badge variant="default" size="sm">Sắp tới</Badge>
}

function SubmissionTypeBadge({ type }: { type: SubmissionType }) {
  const config = {
    file: { label: 'File PDF', variant: 'info' as const, icon: FileText },
    link: { label: 'Link URL', variant: 'brand' as const, icon: Link2 },
    both: { label: 'File + Link', variant: 'warning' as const, icon: Layers },
  }
  const c = config[type] ?? config.file
  const Icon = c.icon
  return (
    <Badge variant={c.variant} size="sm">
      <Icon className="size-3 mr-1" />
      {c.label}
    </Badge>
  )
}

// ─── Default form data ────────────────────────────────────────────────────────

const DEFAULT_FORM: PhaseFormData = {
  phase_number: 1,
  title: '',
  description: '',
  start_date: null,
  end_date: null,
  status: 'upcoming',
  icon: 'circle',
  display_order: 1,
  submission_open: false,
  submission_type: 'file',
  submission_opens_at: null,
  submission_closes_at: null,
  scoring_open: false,
  scoring_opens_at: null,
  scoring_closes_at: null,
}

/** Convert ISO string to local datetime-local input value */
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

/** Convert datetime-local input value to ISO string (UTC) */
function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  return new Date(value).toISOString()
}

function formatDisplayDate(iso: string | null) {
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

function formatDisplayDateTime(iso: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AdminPhasesPage() {
  const [phases, setPhases] = useState<CompetitionPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingScoringId, setTogglingScoringId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const [formData, setFormData] = useState<PhaseFormData>(DEFAULT_FORM)

  const router = useRouter()
  const supabase = createClient()

  const loadData = async () => {
    try {
      const data = await getPhases()
      setPhases(data)
    } catch (e) {
      console.error('Failed to load phases:', e)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await loadData()
      if (isMounted) setLoading(false)
    }
    init()
    return () => { isMounted = false }
  }, [router, supabase])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenModal = (phase?: CompetitionPhase) => {
    if (phase) {
      setEditingId(phase.id)
      setFormData({
        phase_number: phase.phase_number,
        title: phase.title,
        description: phase.description,
        start_date: phase.start_date ? phase.start_date.substring(0, 10) : null,
        end_date: phase.end_date ? phase.end_date.substring(0, 10) : null,
        status: phase.status,
        icon: phase.icon,
        display_order: phase.display_order,
        submission_open: phase.submission_open ?? false,
        submission_type: phase.submission_type ?? 'file',
        submission_opens_at: phase.submission_opens_at ?? null,
        submission_closes_at: phase.submission_closes_at ?? null,
        scoring_open: phase.scoring_open ?? false,
        scoring_opens_at: phase.scoring_opens_at ?? null,
        scoring_closes_at: phase.scoring_closes_at ?? null,
      })
    } else {
      setEditingId(null)
      setFormData({
        ...DEFAULT_FORM,
        phase_number: phases.length + 1,
        display_order: phases.length + 1,
      })
    }
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá giai đoạn này không?')) return
    try {
      const { error } = await deletePhase(id)
      if (error) throw new Error(error)
      await loadData()
      setMessage({ text: 'Đã xoá giai đoạn thành công.', ok: true })
    } catch (e) {
      console.error('Failed to delete phase:', e)
      setMessage({ text: 'Lỗi khi xóa phase: ' + (e instanceof Error ? e.message : 'Không xác định'), ok: false })
    }
  }

  /** Inline submission toggle */
  const handleToggleOpen = async (phase: CompetitionPhase) => {
    setTogglingId(phase.id)
    const { error } = await toggleSubmissionOpen(phase.id, !phase.submission_open)
    setTogglingId(null)
    if (error) {
      console.error('Toggle error:', error)
      setMessage({ text: 'Lỗi khi thay đổi trạng thái nộp bài: ' + error, ok: false })
    } else {
      setPhases((prev) =>
        prev.map((p) => (p.id === phase.id ? { ...p, submission_open: !p.submission_open } : p))
      )
      setMessage({
        text: `Đã ${!phase.submission_open ? 'mở' : 'đóng'} cổng nộp bài cho "${phase.title}".`,
        ok: true,
      })
    }
  }

  /** Inline scoring toggle */
  const handleToggleScoringOpen = async (phase: CompetitionPhase) => {
    setTogglingScoringId(phase.id)
    const { error } = await toggleScoringOpen(phase.id, !phase.scoring_open)
    setTogglingScoringId(null)
    if (error) {
      console.error('Toggle scoring error:', error)
      setMessage({ text: 'Lỗi khi thay đổi trạng thái chấm điểm: ' + error, ok: false })
    } else {
      setPhases((prev) =>
        prev.map((p) => (p.id === phase.id ? { ...p, scoring_open: !p.scoring_open } : p))
      )
      setMessage({
        text: `Đã ${!phase.scoring_open ? 'mở' : 'đóng'} cổng chấm bài cho "${phase.title}".`,
        ok: true,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const payload: PhaseFormData = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        submission_opens_at: formData.submission_opens_at
          ? datetimeLocalToIso(formData.submission_opens_at)
          : null,
        submission_closes_at: formData.submission_closes_at
          ? datetimeLocalToIso(formData.submission_closes_at)
          : null,
        scoring_opens_at: formData.scoring_opens_at
          ? datetimeLocalToIso(formData.scoring_opens_at)
          : null,
        scoring_closes_at: formData.scoring_closes_at
          ? datetimeLocalToIso(formData.scoring_closes_at)
          : null,
      }
      const result = editingId
        ? await updatePhase(editingId, payload)
        : await createPhase(payload)

      if (result.error) throw new Error(result.error)

      setShowModal(false)
      setMessage({ text: editingId ? 'Đã cập nhật giai đoạn thành công.' : 'Đã tạo giai đoạn mới thành công.', ok: true })
      await loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      console.error('Save phase error:', msg)
      setMessage({ text: 'Lỗi khi lưu: ' + msg, ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading text="Đang tải dữ liệu lịch trình..." />

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
                <Calendar className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý lịch trình & mở cổng chấm điểm
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Kiểm soát các giai đoạn thi đấu, thời gian nộp bài của thí sinh và gating chấm điểm cho BGK
              </p>
            </div>
            <Button
              id="add-phase-btn"
              variant="primary"
              size="md"
              leftIcon={<Plus className="size-4" />}
              onClick={() => handleOpenModal()}
            >
              Thêm giai đoạn mới
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Status Message */}
        {message && (
          <div
            role={message.ok ? 'status' : 'alert'}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              message.ok
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {message.ok ? <CheckCircle className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Phase List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Danh sách giai đoạn thi đấu ({phases.length})
          </h2>

          {phases.length === 0 ? (
            <Card className="p-12 text-center text-text-tertiary">
              <Calendar className="size-10 text-text-disabled mx-auto mb-2" />
              <p className="text-sm">Chưa có giai đoạn nào được tạo. Nhấn &quot;Thêm giai đoạn mới&quot; để thiết lập.</p>
            </Card>
          ) : (
            phases.map((phase) => (
              <Card key={phase.id} className="p-5">
                <div className="flex flex-col md:flex-row gap-5 justify-between md:items-center">
                  {/* Left: Phase Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="size-10 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center font-mono font-bold text-brand-cyan shrink-0">
                      {phase.phase_number}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-text-primary truncate">
                          {phase.title}
                        </h3>
                        <StatusBadge status={phase.status} />
                        <SubmissionTypeBadge type={phase.submission_type ?? 'file'} />
                        <Badge variant={phase.scoring_open ? 'brand' : 'default'} size="sm">
                          <Scale className="size-3 mr-1" />
                          {phase.scoring_open ? 'Đang mở chấm' : 'Đóng chấm'}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {phase.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary pt-0.5">
                        <span>Thứ tự: {phase.display_order}</span>
                        {phase.start_date && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDisplayDate(phase.start_date)}
                            {phase.end_date ? ` → ${formatDisplayDate(phase.end_date)}` : ''}
                          </span>
                        )}
                        {phase.submission_opens_at && (
                          <span className="text-brand-cyan/80">
                            Nộp từ: {formatDisplayDateTime(phase.submission_opens_at)}
                          </span>
                        )}
                        {phase.scoring_opens_at && (
                          <span className="text-accent-violet/90">
                            Chấm từ: {formatDisplayDateTime(phase.scoring_opens_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Gating Toggles & Actions */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-surface-border">
                    {/* Submission Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={phase.submission_open}
                      id={`toggle-submission-${phase.id}`}
                      onClick={() => handleToggleOpen(phase)}
                      disabled={togglingId === phase.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
                        phase.submission_open
                          ? 'bg-semantic-success/15 border-semantic-success/30 text-semantic-success hover:bg-semantic-success/20'
                          : 'bg-surface-overlay border-surface-border text-text-tertiary hover:border-surface-border-strong hover:text-text-secondary'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {togglingId === phase.id ? (
                        <span className="size-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : (
                        <span className={`size-2 rounded-full ${phase.submission_open ? 'bg-semantic-success' : 'bg-text-tertiary'}`} />
                      )}
                      Nộp: {phase.submission_open ? 'Mở' : 'Đóng'}
                    </button>

                    {/* Scoring Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={phase.scoring_open}
                      id={`toggle-scoring-${phase.id}`}
                      onClick={() => handleToggleScoringOpen(phase)}
                      disabled={togglingScoringId === phase.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
                        phase.scoring_open
                          ? 'bg-brand-cyan/15 border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/20'
                          : 'bg-surface-overlay border-surface-border text-text-tertiary hover:border-surface-border-strong hover:text-text-secondary'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {togglingScoringId === phase.id ? (
                        <span className="size-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : (
                        <Scale className="size-3" />
                      )}
                      Chấm: {phase.scoring_open ? 'Mở' : 'Đóng'}
                    </button>

                    {/* Edit & Delete Buttons */}
                    <Button
                      id={`edit-phase-${phase.id}`}
                      variant="secondary"
                      size="sm"
                      leftIcon={<Pencil className="size-3.5" />}
                      onClick={() => handleOpenModal(phase)}
                    >
                      Sửa
                    </Button>
                    <Button
                      id={`delete-phase-${phase.id}`}
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="size-3.5" />}
                      onClick={() => handleDelete(phase.id)}
                      className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger"
                    >
                      Xoá
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* ─── Modal Form ────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-phase-title">
          <div className="w-full max-w-2xl rounded-xl border border-surface-border bg-surface-overlay p-6 shadow-elevation-3 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h2 id="modal-phase-title" className="font-display text-lg font-semibold text-text-primary border-b border-surface-border pb-3">
              {editingId ? 'Chỉnh sửa giai đoạn thi đấu' : 'Thêm giai đoạn mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-number" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Số thứ tự Phase *
                  </label>
                  <input
                    id="p-number"
                    type="number"
                    required
                    value={formData.phase_number}
                    onChange={e => setFormData({ ...formData, phase_number: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="p-order" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Thứ tự hiển thị *
                  </label>
                  <input
                    id="p-order"
                    type="number"
                    required
                    value={formData.display_order}
                    onChange={e => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="p-title" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Tiêu đề giai đoạn *
                </label>
                <input
                  id="p-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: VÒNG SƠ KHẢO — Ý TƯỞNG & ĐỀ ÁN"
                  className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="p-desc" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Mô tả chi tiết *
                </label>
                <textarea
                  id="p-desc"
                  required
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Chi tiết yêu cầu và nội dung của vòng thi..."
                  className="w-full px-3 py-2 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-start-date" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Ngày bắt đầu
                  </label>
                  <input
                    id="p-start-date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value || null })}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="p-end-date" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Ngày kết thúc
                  </label>
                  <input
                    id="p-end-date"
                    type="date"
                    value={formData.end_date || ''}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value || null })}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-status" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Trạng thái giai đoạn
                  </label>
                  <select
                    id="p-status"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as PhaseStatus })}
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors cursor-pointer"
                  >
                    <option value="upcoming">Sắp tới (Upcoming)</option>
                    <option value="active">Đang mở (Active)</option>
                    <option value="completed">Đã kết thúc (Completed)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="p-icon" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Biểu tượng (Lucide icon name)
                  </label>
                  <input
                    id="p-icon"
                    type="text"
                    required
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="circle, trophy, target..."
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>
              </div>

              {/* Submission Controls Section */}
              <div className="border-t border-surface-border pt-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                  Cài đặt nộp bài (Thí sinh)
                </h3>

                <div className="flex items-center justify-between p-3.5 bg-surface-base border border-surface-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Mở cổng nộp bài</p>
                    <p className="text-xs text-text-tertiary">Cho phép các đội nộp hoặc thay thế bài thi</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.submission_open}
                    id="modal-submission-open-toggle"
                    onClick={() => setFormData({ ...formData, submission_open: !formData.submission_open })}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
                      formData.submission_open ? 'bg-semantic-success' : 'bg-surface-elevated'
                    }`}
                  >
                    <span
                      className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        formData.submission_open ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Hình thức nộp bài
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['file', 'link', 'both'] as SubmissionType[]).map((t) => {
                      const labels = { file: 'File PDF', link: 'Link URL', both: 'Cả hai' }
                      const isSelected = formData.submission_type === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, submission_type: t })}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-semibold'
                              : 'bg-surface-base border-surface-border text-text-secondary hover:border-surface-border-strong'
                          }`}
                        >
                          {labels[t]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="p-sub-open" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Mở nộp lúc (tuỳ chọn)
                    </label>
                    <input
                      id="p-sub-open"
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.submission_opens_at)}
                      onChange={e => setFormData({ ...formData, submission_opens_at: e.target.value || null })}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="p-sub-close" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Đóng nộp lúc (tuỳ chọn)
                    </label>
                    <input
                      id="p-sub-close"
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.submission_closes_at)}
                      onChange={e => setFormData({ ...formData, submission_closes_at: e.target.value || null })}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Scoring Controls Section */}
              <div className="border-t border-surface-border pt-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-violet">
                  Cài đặt chấm điểm (Ban Giám khảo)
                </h3>

                <div className="flex items-center justify-between p-3.5 bg-surface-base border border-surface-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Mở cổng chấm điểm</p>
                    <p className="text-xs text-text-tertiary">Cho phép Giám khảo nhập và cập nhật điểm bài nộp</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.scoring_open}
                    id="modal-scoring-open-toggle"
                    onClick={() => setFormData({ ...formData, scoring_open: !formData.scoring_open })}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
                      formData.scoring_open ? 'bg-accent-violet' : 'bg-surface-elevated'
                    }`}
                  >
                    <span
                      className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        formData.scoring_open ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="p-score-open" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Mở chấm lúc (tuỳ chọn)
                    </label>
                    <input
                      id="p-score-open"
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.scoring_opens_at)}
                      onChange={e => setFormData({ ...formData, scoring_opens_at: e.target.value || null })}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="p-score-close" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Đóng chấm lúc (tuỳ chọn)
                    </label>
                    <input
                      id="p-score-close"
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.scoring_closes_at)}
                      onChange={e => setFormData({ ...formData, scoring_closes_at: e.target.value || null })}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowModal(false)}
                >
                  Huỷ bỏ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={submitting}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu giai đoạn'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
