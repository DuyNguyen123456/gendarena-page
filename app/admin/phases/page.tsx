'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { CompetitionPhase, PhaseFormData, PhaseStatus, SubmissionType } from '@/types/phase'
import { getPhases, createPhase, updatePhase, deletePhase, toggleSubmissionOpen, toggleScoringOpen } from '@/services/phases'
import { Edit2, Trash2, Plus, ToggleLeft, ToggleRight, Scale } from 'lucide-react'
import Loading from '@/components/loading'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PhaseStatus }) {
  if (status === 'active') {
    return <span className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">● ĐANG MỞ</span>
  }
  if (status === 'completed') {
    return <span className="bg-blue-950/50 border border-blue-500/40 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">✓ ĐÃ KẾT THÚC</span>
  }
  return <span className="bg-slate-800/60 border border-slate-600/40 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">SẮP TỚI</span>
}

function SubmissionTypeBadge({ type }: { type: SubmissionType }) {
  const config = {
    file: { label: '📄 FILE', className: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' },
    link: { label: '🔗 LINK', className: 'bg-violet-950/40 border-violet-500/30 text-violet-400' },
    both: { label: '📄+🔗 CẢ HAI', className: 'bg-amber-950/40 border-amber-500/30 text-amber-400' },
  }
  const c = config[type] ?? config.file
  return (
    <span className={`border px-2 py-0.5 rounded text-[10px] font-bold tracking-widest font-orbitron ${c.className}`}>
      {c.label}
    </span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    if (!confirm('Bạn có chắc chắn muốn xoá phase này không?')) return
    try {
      const { error } = await deletePhase(id)
      if (error) throw new Error(error)
      await loadData()
    } catch (e) {
      console.error('Failed to delete phase:', e)
      setMessage({ text: 'Lỗi khi xóa phase.', ok: false })
    }
  }

  /** Inline submission toggle */
  const handleToggleOpen = async (phase: CompetitionPhase) => {
    setTogglingId(phase.id)
    const { error } = await toggleSubmissionOpen(phase.id, !phase.submission_open)
    setTogglingId(null)
    if (error) {
      console.error('Toggle error:', error)
      setMessage({ text: 'Lỗi khi thay đổi trạng thái nộp bài.', ok: false })
    } else {
      setPhases((prev) =>
        prev.map((p) => (p.id === phase.id ? { ...p, submission_open: !p.submission_open } : p))
      )
    }
  }

  /** Inline scoring toggle */
  const handleToggleScoringOpen = async (phase: CompetitionPhase) => {
    setTogglingScoringId(phase.id)
    const { error } = await toggleScoringOpen(phase.id, !phase.scoring_open)
    setTogglingScoringId(null)
    if (error) {
      console.error('Toggle scoring error:', error)
      setMessage({ text: 'Lỗi khi thay đổi trạng thái chấm điểm.', ok: false })
    } else {
      setPhases((prev) =>
        prev.map((p) => (p.id === phase.id ? { ...p, scoring_open: !p.scoring_open } : p))
      )
      setMessage({ text: `Đã ${!phase.scoring_open ? 'MỞ' : 'ĐÓNG'} chấm bài cho vòng "${phase.title}".`, ok: true })
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
      setMessage({ text: editingId ? 'Đã cập nhật phase.' : 'Đã tạo phase mới.', ok: true })
      await loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      console.error('Save phase error:', msg)
      setMessage({ text: 'Lỗi khi lưu: ' + msg, ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Shared input classes ────────────────────────────────────────────────────

  const inputCls = 'w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/60 focus:outline-none transition'
  const labelCls = 'block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest'

  if (loading) return <Loading text="LOADING TIMELINE DATA" />

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4 relative scanline-container">
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              🗓️ QUẢN LÝ LỊCH TRÌNH & MỞ CHẤM BÀI
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              TIMELINE & SCORING WINDOW TERMINAL
            </p>
          </div>
          <button
            id="add-phase-btn"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 text-sm font-orbitron bg-cyan-950/50 border border-cyan-500/50 px-4 py-2 rounded-lg text-cyan-400 hover:bg-cyan-900/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
          >
            <Plus className="w-4 h-4" />
            THÊM PHASE MỚI
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div className={`mb-5 px-5 py-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2.5 ${
            message.ok
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
              : 'bg-red-950/50 border-red-500/40 text-red-400'
          }`}>
            {message.ok ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Phase List */}
        <div className="grid gap-4">
          {phases.length === 0 ? (
            <div className="tech-panel p-8 text-center text-slate-400 text-sm">
              Chưa có phase nào. Hãy thêm phase mới!
            </div>
          ) : (
            phases.map((phase) => (
              <div
                key={phase.id}
                className="tech-panel p-5 border-[#1e2d5a]/60 hover:border-cyan-500/20 transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-4 justify-between md:items-start">
                  {/* Left: Phase info */}
                  <div className="flex gap-4 items-start flex-1">
                    <div className="w-10 h-10 rounded-full bg-[#0b1124] border border-[#1e2d5a] flex items-center justify-center font-orbitron font-bold text-cyan-500 shrink-0">
                      {phase.phase_number}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-orbitron font-bold text-white tracking-wide uppercase flex flex-wrap items-center gap-2">
                        {phase.title}
                        <StatusBadge status={phase.status} />
                        <SubmissionTypeBadge type={phase.submission_type ?? 'file'} />
                        {/* Scoring badge */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-orbitron border ${
                          phase.scoring_open
                            ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                            : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                          ⚖️ {phase.scoring_open ? 'MỞ CHẤM' : 'ĐÓNG CHẤM'}
                        </span>
                      </h3>
                      <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>Order: {phase.display_order}</span>
                        {phase.start_date && (
                          <span>
                            {new Date(phase.start_date).toLocaleDateString('vi-VN')}
                            {phase.end_date ? ` → ${new Date(phase.end_date).toLocaleDateString('vi-VN')}` : ''}
                          </span>
                        )}
                        {phase.submission_opens_at && (
                          <span className="text-cyan-500/70">
                            Nộp từ: {new Date(phase.submission_opens_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                        {phase.scoring_opens_at && (
                          <span className="text-purple-400/70">
                            Chấm từ: {new Date(phase.scoring_opens_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Submission & Scoring toggles + actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Inline submission toggle */}
                    <button
                      id={`toggle-submission-${phase.id}`}
                      onClick={() => handleToggleOpen(phase)}
                      disabled={togglingId === phase.id}
                      title={phase.submission_open ? 'Tắt nộp bài' : 'Bật nộp bài'}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold tracking-wider font-orbitron uppercase transition-all ${
                        phase.submission_open
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                          : 'bg-slate-800/40 border-[#1e2d5a] text-slate-500 hover:border-cyan-500/30 hover:text-slate-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {togglingId === phase.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : phase.submission_open ? (
                        <ToggleRight className="w-3.5 h-3.5" />
                      ) : (
                        <ToggleLeft className="w-3.5 h-3.5" />
                      )}
                      NỘP: {phase.submission_open ? 'MỞ' : 'ĐÓNG'}
                    </button>

                    {/* Inline scoring toggle */}
                    <button
                      id={`toggle-scoring-${phase.id}`}
                      onClick={() => handleToggleScoringOpen(phase)}
                      disabled={togglingScoringId === phase.id}
                      title={phase.scoring_open ? 'Tắt chấm điểm' : 'Bật chấm điểm'}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold tracking-wider font-orbitron uppercase transition-all ${
                        phase.scoring_open
                          ? 'bg-purple-950/50 border-purple-500/40 text-purple-300 hover:bg-purple-900/50'
                          : 'bg-slate-800/40 border-[#1e2d5a] text-slate-500 hover:border-purple-500/30 hover:text-slate-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {togglingScoringId === phase.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : (
                        <Scale className="w-3.5 h-3.5" />
                      )}
                      CHẤM: {phase.scoring_open ? 'MỞ' : 'ĐÓNG'}
                    </button>

                    <button
                      id={`edit-phase-${phase.id}`}
                      onClick={() => handleOpenModal(phase)}
                      className="p-2 bg-blue-950/30 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-900/50 transition"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-phase-${phase.id}`}
                      onClick={() => handleDelete(phase.id)}
                      className="p-2 bg-red-950/30 border border-red-500/30 rounded text-red-400 hover:bg-red-900/50 transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Modal ────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1124] border border-cyan-500/30 p-6 rounded-xl max-w-2xl w-full shadow-[0_0_40px_rgba(0,240,255,0.08)] relative">
            <h2 className="font-orbitron text-xl font-bold text-white uppercase mb-6 tracking-wide border-b border-[#1e2d5a] pb-3">
              {editingId ? 'CHỈNH SỬA PHASE' : 'THÊM PHASE MỚI'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Basic info ───────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phase Number</label>
                  <input type="number" required value={formData.phase_number}
                    onChange={e => setFormData({ ...formData, phase_number: Number(e.target.value) })}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Display Order</label>
                  <input type="number" required value={formData.display_order}
                    onChange={e => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Tiêu đề</label>
                <input type="text" required value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className={inputCls} placeholder="VD: VÒNG SƠ KHẢO" />
              </div>

              <div>
                <label className={labelCls}>Mô tả</label>
                <textarea required value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={`${inputCls} h-20 resize-none`} placeholder="Chi tiết vòng thi..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ngày bắt đầu</label>
                  <input type="date" value={formData.start_date || ''}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value || null })}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ngày kết thúc</label>
                  <input type="date" value={formData.end_date || ''}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value || null })}
                    className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Trạng thái phase</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as PhaseStatus })}
                    className={inputCls}>
                    <option value="upcoming">SẮP TỚI</option>
                    <option value="active">ĐANG MỞ</option>
                    <option value="completed">ĐÃ KẾT THÚC</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Icon (Lucide name)</label>
                  <input type="text" required value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className={inputCls} placeholder="book, trophy, target..." />
                </div>
              </div>

              {/* ── Submission controls section ──────────────────────────── */}
              <div className="border-t border-[#1e2d5a] pt-5 space-y-4">
                <h3 className="font-orbitron text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  📤 CÀI ĐẶT NỘP BÀI (THÍ SINH)
                </h3>

                {/* submission_open toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-[#1e2d5a] rounded-lg">
                  <div>
                    <p className="text-sm font-bold text-white">Mở nộp bài</p>
                    <p className="text-xs text-slate-500 mt-0.5">Cho phép thí sinh nộp bài trong vòng này</p>
                  </div>
                  <button
                    type="button"
                    id="modal-submission-open-toggle"
                    onClick={() => setFormData({ ...formData, submission_open: !formData.submission_open })}
                    className={`relative inline-flex h-6 w-11 rounded-full border-2 transition-colors duration-200 focus:outline-none ${
                      formData.submission_open
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-slate-700 border-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        formData.submission_open ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* submission_type */}
                <div>
                  <label className={labelCls}>Loại nộp bài</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['file', 'link', 'both'] as SubmissionType[]).map((t) => {
                      const labels = { file: '📄 File', link: '🔗 Link', both: '📄+🔗 Cả hai' }
                      const isSelected = formData.submission_type === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, submission_type: t })}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold tracking-wide transition ${
                            isSelected
                              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                              : 'bg-slate-950/40 border-[#1e2d5a] text-slate-500 hover:border-cyan-500/30 hover:text-slate-300'
                          }`}
                        >
                          {labels[t]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* submission windows */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Mở nộp lúc (tuỳ chọn)</label>
                    <input
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.submission_opens_at)}
                      onChange={e => setFormData({ ...formData, submission_opens_at: e.target.value || null })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Đóng nộp lúc (tuỳ chọn)</label>
                    <input
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.submission_closes_at)}
                      onChange={e => setFormData({ ...formData, submission_closes_at: e.target.value || null })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* ── Scoring controls section ───────────────────────────── */}
              <div className="border-t border-[#1e2d5a] pt-5 space-y-4">
                <h3 className="font-orbitron text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                  ⚖️ CÀI ĐẶT CHẤM ĐIỂM (BAN GIÁM KHẢO)
                </h3>

                {/* scoring_open toggle */}
                <div className="flex items-center justify-between p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-lg">
                  <div>
                    <p className="text-sm font-bold text-white">Mở chấm điểm</p>
                    <p className="text-xs text-slate-400 mt-0.5">Cho phép Giám khảo nhập/sửa điểm bài nộp của vòng này</p>
                  </div>
                  <button
                    type="button"
                    id="modal-scoring-open-toggle"
                    onClick={() => setFormData({ ...formData, scoring_open: !formData.scoring_open })}
                    className={`relative inline-flex h-6 w-11 rounded-full border-2 transition-colors duration-200 focus:outline-none ${
                      formData.scoring_open
                        ? 'bg-purple-500 border-purple-400'
                        : 'bg-slate-700 border-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        formData.scoring_open ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* scoring windows */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Mở chấm lúc (tuỳ chọn)</label>
                    <input
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.scoring_opens_at)}
                      onChange={e => setFormData({ ...formData, scoring_opens_at: e.target.value || null })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Đóng chấm lúc (tuỳ chọn)</label>
                    <input
                      type="datetime-local"
                      value={isoToDatetimeLocal(formData.scoring_closes_at)}
                      onChange={e => setFormData({ ...formData, scoring_closes_at: e.target.value || null })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-[#1e2d5a]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wide transition disabled:opacity-50"
                >
                  {submitting ? '⏳ ĐANG LƯU...' : '💾 LƯU PHASE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
