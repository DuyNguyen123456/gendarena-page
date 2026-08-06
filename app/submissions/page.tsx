'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LoadingScreen from '@/components/loading-screen'
import { getPhases } from '@/services/phases'
import {
  validateFile,
  validateUrl,
  getMyTeams,
  getCurrentSubmission,
  getSubmissionHistory,
  getDownloadUrl,
  insertFileSubmission,
  replaceFileSubmission,
  insertLinkSubmission,
  replaceLinkSubmission,
} from '@/services/submissions'
import type { Submission, SubmissionHistory, TeamRecord, TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORIES } from '@/types/submission'
import { CompetitionPhase } from '@/types/phase'
import { getSubmissionGate } from '@/types/phase'
import {
  CheckCircle2,
  XCircle,
  Radio,
  AlertTriangle,
  Check,
  Lock,
  Clock,
  Ban,
  FileText,
  Link as LinkIcon,
  Info,
  Tag,
  Upload,
  Package,
  Download,
  ExternalLink,
  RefreshCw,
  User as UserIcon,
  Calendar,
  Archive,
  ArrowLeft,
  ClipboardPen,
  Users,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  submitted: {
    label: 'ĐÃ NỘP',
    className: 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.15)]',
  },
  reviewing: {
    label: 'ĐANG CHẤM',
    className: 'bg-amber-950/40 border border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(234,179,8,0.15)]',
  },
  scored: {
    label: 'ĐÃ CHẤM',
    className: 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,163,74,0.15)]',
  },
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'
interface ToastMsg { id: number; type: ToastType; text: string }

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-xl text-sm font-semibold tracking-wide max-w-sm shadow-2xl cursor-pointer animate-[slide-in_0.3s_ease-out] ${
            t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            : t.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-300'
            : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
          }`}>
          <span className="shrink-0">
            {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : t.type === 'error' ? <XCircle className="w-5 h-5 text-red-400" /> : <Radio className="w-5 h-5 text-cyan-400" />}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const idRef = useRef(0)
  const add = useCallback((type: ToastType, text: string) => {
    const id = ++idRef.current
    setToasts((p) => [...p, { id, type, text }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000)
  }, [])
  const dismiss = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), [])
  return { toasts, add, dismiss }
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="tech-panel-glow max-w-md w-full p-7 rounded-2xl space-y-5 border-amber-500/30 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          <h3 className="font-orbitron text-base font-bold text-amber-400 tracking-wider uppercase">Xác nhận nộp lại</h3>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          Nộp bài mới sẽ <span className="text-amber-400 font-bold">thay thế bài cũ</span>. Bài cũ sẽ lưu trong lịch sử nhưng <span className="text-red-400 font-bold">KHÔNG</span> thể tải lại.
        </p>
        <div className="flex gap-3 pt-1">
          <button id="confirm-replace-btn" onClick={onConfirm}
            className="flex-1 tech-btn-accent font-orbitron px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>Xác nhận</span>
          </button>
          <button id="cancel-replace-btn" onClick={onCancel}
            className="flex-1 px-5 py-2.5 border border-[#1e2d5a] bg-transparent hover:bg-slate-900/60 text-slate-300 text-xs font-semibold tracking-wider rounded-lg cursor-pointer transition">
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Gate Banner ──────────────────────────────────────────────────────────────

function GateBanner({ phase }: { phase: CompetitionPhase }) {
  const gate = getSubmissionGate(phase)

  if (gate === 'open') return null

  const configs = {
    closed: {
      icon: <Lock className="w-6 h-6 shrink-0" />, title: 'Chưa mở nộp bài',
      sub: 'Ban tổ chức chưa mở vòng nộp bài này.',
      cls: 'border-slate-700/60 bg-slate-900/40 text-slate-400',
    },
    not_yet: {
      icon: <Clock className="w-6 h-6 shrink-0" />, title: 'Chưa đến thời gian',
      sub: `Nộp bài mở lúc: ${formatDate(phase.submission_opens_at!)}`,
      cls: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    },
    expired: {
      icon: <Ban className="w-6 h-6 shrink-0" />, title: 'Đã đóng nộp bài',
      sub: `Hạn nộp đã kết thúc lúc: ${formatDate(phase.submission_closes_at!)}`,
      cls: 'border-red-500/30 bg-red-950/20 text-red-400',
    },
  }

  const c = configs[gate]
  return (
    <div className={`flex items-center gap-4 p-5 border rounded-xl ${c.cls}`}>
      {c.icon}
      <div>
        <p className="font-orbitron font-bold text-sm uppercase tracking-wider">{c.title}</p>
        <p className="text-xs mt-0.5 opacity-70">{c.sub}</p>
      </div>
    </div>
  )
}

// ─── Dropzone (file upload) ───────────────────────────────────────────────────

function FileDropzone({
  file, error, onFile, onClear,
}: {
  file: File | null
  error: string | null
  onFile: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pick(files: FileList | null) {
    const f = files?.[0]
    if (f) onFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files)
  }

  if (file && !error) {
    return (
      <div className="flex items-center gap-4 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
        <FileText className="w-8 h-8 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-300 text-sm break-all">{file.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
        </div>
        <button onClick={onClear} type="button" title="Xóa file"
          className="p-1.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/50 transition shrink-0">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`w-full p-8 rounded-xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer ${
          dragging
            ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
            : error
            ? 'border-red-500/50 bg-red-950/10'
            : 'border-[#1e2d5a] bg-slate-950/30 hover:border-cyan-500/40 hover:bg-cyan-950/10'
        }`}
      >
        <FileText className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
        <p className="text-white font-semibold text-sm">Kéo thả PDF vào đây</p>
        <p className="text-slate-500 text-xs mt-1">hoặc click để chọn</p>
        <div className="mt-4 space-y-1 text-xs font-bold text-amber-400/80">
          <p className="flex items-center justify-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Chỉ chấp nhận: PDF</p>
          <p className="flex items-center justify-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Kích thước tối đa: 10 MB</p>
        </div>
      </button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={(e) => pick(e.target.files)} />
      {error && (
        <p className="mt-2 text-xs text-red-400 font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Link Input ───────────────────────────────────────────────────────────────

function LinkInput({
  value, error, onChange,
}: {
  value: string
  error: string | null
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className={`border rounded-xl overflow-hidden transition ${
        error ? 'border-red-500/50' : 'border-[#1e2d5a] focus-within:border-cyan-400/60'
      }`}>
        <div className="px-4 py-3 bg-slate-950/50">
          <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1.5">
            <LinkIcon className="w-4 h-4 text-cyan-400" />
            <span>Đường dẫn bài nộp</span>
          </label>
          <input
            id="link-submission-input"
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none"
          />
        </div>
        <div className="px-4 py-3 bg-[#050d1e]/60 border-t border-[#1e2d5a] text-xs text-slate-500 space-y-0.5">
          <p className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Hỗ trợ: Google Drive, GitHub, Figma, Notion, v.v.</p>
          <p className="text-amber-400/70 font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Đảm bảo link CÔNG KHAI để ban giám khảo xem được</p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400 font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-400">
        <span>Đang tải lên...</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,240,255,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ─── Submit Form (per-phase) ──────────────────────────────────────────────────

function SubmitForm({
  phase,
  teamId,
  userId,
  onSuccess,
  onCancel,
}: {
  phase: CompetitionPhase
  teamId: string
  userId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const type = phase.submission_type ?? 'file'
  // For 'both', default to whichever tab makes sense
  const [activeTab, setActiveTab] = useState<'file' | 'link'>(type === 'link' ? 'link' : 'file')

  const [topic, setTopic] = useState<TopicCategory | ''>('')
  const [topicError, setTopicError] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [linkValue, setLinkValue] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingExisting, setPendingExisting] = useState<Submission | null>(null)
  const { toasts, add: addToast, dismiss: dismissToast } = useToast()

  function handleFileSet(f: File) {
    setFile(f)
    setFileError(validateFile(f))
  }

  function handleFileClear() {
    setFile(null)
    setFileError(null)
  }

  function handleLinkChange(v: string) {
    setLinkValue(v)
    setLinkError(v ? validateUrl(v) : null)
  }

  async function doSubmit(existing: Submission | null) {
    if (!topic) {
      setTopicError('Vui lòng chọn 1 trong 5 nhóm chủ đề bắt buộc.')
      return
    }

    setUploading(true)
    setUploadProgress(10)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      addToast('error', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      setUploading(false)
      return
    }

    setUploadProgress(30)
    let result

    if (activeTab === 'file' && file) {
      setUploadProgress(50)
      result = existing
        ? await replaceFileSubmission(user.id, teamId, phase.id, file, existing, topic)
        : await insertFileSubmission(user.id, teamId, phase.id, file, topic)
    } else {
      setUploadProgress(60)
      result = existing
        ? await replaceLinkSubmission(user.id, teamId, phase.id, linkValue, existing, topic)
        : await insertLinkSubmission(user.id, teamId, phase.id, linkValue, topic)
    }

    setUploadProgress(100)
    setUploading(false)
    setPendingExisting(null)

    if (!result.ok) {
      addToast('error', result.error)
      setUploadProgress(0)
      return
    }

    addToast('success', 'Nộp bài thành công! Hệ thống đã ghi nhận.')
    setTimeout(() => onSuccess(), 800)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!topic) {
      setTopicError('Vui lòng chọn 1 trong 5 nhóm chủ đề bắt buộc.')
      return
    }

    if (activeTab === 'file') {
      if (!file) { addToast('error', 'Vui lòng chọn file PDF.'); return }
      const err = validateFile(file)
      if (err) { setFileError(err); return }
    } else {
      const err = validateUrl(linkValue)
      if (err) { setLinkError(err); return }
    }

    // Check existing submission
    const existing = await getCurrentSubmission(teamId, phase.id)
    if (existing) {
      setPendingExisting(existing)
      setShowConfirm(true)
      return
    }

    await doSubmit(null)
  }

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          onConfirm={() => { setShowConfirm(false); doSubmit(pendingExisting) }}
          onCancel={() => { setShowConfirm(false); setPendingExisting(null) }}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Topic Category Selector */}
        <div>
          <label className="block text-xs font-orbitron font-bold tracking-widest text-cyan-400 uppercase mb-2 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-cyan-400" />
            <span>Nhóm chủ đề bài thi</span> <span className="text-red-400">*</span>
          </label>
          <select
            id={`topic-select-${phase.id}`}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value as TopicCategory)
              setTopicError(null)
            }}
            className={`w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition ${
              topicError ? 'border-red-500/60 bg-red-950/20' : 'border-[#1e2d5a] focus:border-cyan-400/60'
            }`}
          >
            <option value="" disabled>-- Chọn 1 trong 5 nhóm chủ đề --</option>
            {TOPIC_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-slate-900 text-white">
                {cat}
              </option>
            ))}
          </select>
          {topicError && (
            <p className="mt-1.5 text-xs text-red-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {topicError}
            </p>
          )}
        </div>

        {/* Tab selector for 'both' */}
        {type === 'both' && (
          <div className="flex rounded-lg border border-[#1e2d5a] overflow-hidden">
            {(['file', 'link'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-orbitron font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-cyan-950/60 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                }`}
              >
                {tab === 'file' ? <><FileText className="w-3.5 h-3.5" /> Nộp File</> : <><LinkIcon className="w-3.5 h-3.5" /> Nộp Link</>}
              </button>
            ))}
          </div>
        )}

        {/* File input */}
        {(type === 'file' || (type === 'both' && activeTab === 'file')) && (
          <FileDropzone file={file} error={fileError} onFile={handleFileSet} onClear={handleFileClear} />
        )}

        {/* Link input */}
        {(type === 'link' || (type === 'both' && activeTab === 'link')) && (
          <LinkInput value={linkValue} error={linkError} onChange={handleLinkChange} />
        )}

        {/* Progress */}
        {uploading && <UploadProgress progress={uploadProgress} />}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            id={`submit-btn-${phase.id}`}
            type="submit"
            disabled={uploading || (activeTab === 'file' ? !!fileError : !!linkError)}
            className="tech-btn-accent font-orbitron px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider cursor-pointer text-black disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Nộp bài</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-[#1e2d5a] bg-transparent hover:bg-slate-900/60 text-slate-400 text-xs font-semibold tracking-wider rounded-lg cursor-pointer transition"
          >
            Hủy
          </button>
        </div>
      </form>
    </>
  )
}

// ─── Current Submission Card ──────────────────────────────────────────────────

function CurrentSubmissionCard({
  submission,
  phase,
  onResubmit,
}: {
  submission: Submission
  phase: CompetitionPhase
  onResubmit: () => void
}) {
  const [loadingUrl, setLoadingUrl] = useState(false)
  const status = STATUS_LABELS[submission.status] ?? STATUS_LABELS['submitted']
  const gate = getSubmissionGate(phase)
  const isFile = submission.submission_kind === 'file'

  async function handleDownload() {
    if (!submission.file_path) return
    setLoadingUrl(true)
    const url = await getDownloadUrl(submission.file_path)
    setLoadingUrl(false)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else alert('Không thể tạo link tải. Vui lòng thử lại.')
  }

  return (
    <div className="tech-panel-glow border-cyan-500/20 p-6 rounded-xl relative hover:border-cyan-400/35 transition duration-200">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-lg" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 rounded-br-lg" />

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-3 flex-1 min-w-0">
          {/* Kind indicator */}
          <div className="flex items-center gap-2.5">
            <span className="shrink-0">{isFile ? <FileText className="w-5 h-5 text-cyan-400" /> : <LinkIcon className="w-5 h-5 text-cyan-400" />}</span>
            <span className="font-orbitron font-bold text-white tracking-wide text-sm break-all">
              {isFile ? submission.file_name : 'Bài nộp bằng link'}
            </span>
          </div>
          {submission.topic ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-xs font-semibold text-cyan-300">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chủ đề:</span>
              <span>{submission.topic}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-600/40 rounded-lg text-xs font-semibold text-slate-500">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Chủ đề:</span>
              <span>Chưa chọn chủ đề</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold">
            {isFile && submission.file_size && <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-slate-400" /> {formatBytes(submission.file_size)}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Nộp lúc: {formatDate(submission.uploaded_at)}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-widest font-orbitron uppercase flex items-center gap-1.5 self-start whitespace-nowrap ${status.className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        {isFile && submission.file_path && (
          <button
            id={`download-btn-${submission.id}`}
            onClick={handleDownload}
            disabled={loadingUrl}
            className="flex items-center gap-2 px-4 py-2 bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white text-xs font-bold tracking-wider rounded-lg cursor-pointer transition disabled:opacity-50"
          >
            {loadingUrl ? (
              <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Tải xuống</span>
          </button>
        )}
        {!isFile && submission.submission_url && (
          <a
            href={submission.submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#131e3d] border border-[#1e2d5a] hover:border-violet-400 text-violet-400 hover:text-white text-xs font-bold tracking-wider rounded-lg transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Mở link</span>
          </a>
        )}
        {/* Only show re-submit button if gate is still open */}
        {gate === 'open' && (
          <button
            id={`resubmit-btn-${submission.id}`}
            onClick={onResubmit}
            className="flex items-center gap-2 px-4 py-2 border border-[#1e2d5a] hover:border-amber-400/50 bg-transparent text-slate-400 hover:text-amber-400 text-xs font-bold tracking-wider rounded-lg cursor-pointer transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Nộp lại</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ item }: { item: SubmissionHistory }) {
  const isFile = item.submission_kind === 'file'
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-950/40 border border-[#1e2d5a]/60 rounded-xl hover:border-[#1e2d5a] transition">
      <span className="shrink-0 mt-0.5 text-slate-500">{isFile ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}</span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-slate-400 break-all">
          {isFile && item.file_name ? item.file_name : 'Nộp bằng link'}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 font-semibold">
          {isFile && item.file_size && <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {formatBytes(item.file_size)}</span>}
          <span>Nộp lúc: {formatDate(item.uploaded_at)}</span>
          <span>Bị thay thế lúc: {formatDate(item.deleted_at)}</span>
          {item.profiles?.email && <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {item.profiles.email}</span>}
        </div>
      </div>
      <span className="text-[10px] font-orbitron font-bold text-slate-600 uppercase tracking-widest shrink-0">CŨ</span>
    </div>
  )
}

// ─── Phase Submission Section ─────────────────────────────────────────────────

function PhaseSubmissionSection({
  phase, teamId, userId, refreshKey,
}: {
  phase: CompetitionPhase
  teamId: string
  userId: string
  refreshKey: number
}) {
  const [current, setCurrent] = useState<Submission | null>(null)
  const [history, setHistory] = useState<SubmissionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const gate = getSubmissionGate(phase)

  const load = useCallback(async () => {
    setLoading(true)
    const [sub, hist] = await Promise.all([
      getCurrentSubmission(teamId, phase.id),
      getSubmissionHistory(teamId, phase.id),
    ])
    setCurrent(sub)
    setHistory(hist)
    setLoading(false)
  }, [teamId, phase.id])

  useEffect(() => { load() }, [load, refreshKey])

  function handleSuccess() {
    setShowForm(false)
    load()
  }

  // Phase header
  const statusConfig: Record<string, { dot: string; cls: string; label: string; cardBorder: string; cardBg: string }> = {
    active: {
      dot: '●', cls: 'text-emerald-400', label: 'ĐANG MỞ',
      cardBorder: 'border-emerald-500/30', cardBg: 'bg-emerald-950/5',
    },
    upcoming: {
      dot: '○', cls: 'text-amber-400', label: 'SẮP TỚI',
      cardBorder: 'border-amber-500/20', cardBg: 'bg-amber-950/5',
    },
    completed: {
      dot: '✓', cls: 'text-slate-500', label: 'ĐÃ ĐÓNG',
      cardBorder: 'border-slate-700/40', cardBg: 'bg-slate-950/20',
    },
  }
  const sc = statusConfig[phase.status] ?? statusConfig.upcoming

  return (
    <div className={`rounded-xl border ${sc.cardBorder} ${sc.cardBg} overflow-hidden`}>
      {/* Phase Header Card */}
      <div className="p-5 border-b border-[#1e2d5a]/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Phase number badge */}
            <div className="w-9 h-9 rounded-full bg-[#0b1124] border border-[#1e2d5a] flex items-center justify-center font-orbitron font-bold text-cyan-500 shrink-0 text-sm">
              {phase.phase_number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-orbitron text-sm font-bold text-white tracking-wider uppercase">{phase.title}</h3>
                <span className={`text-[10px] font-bold font-orbitron uppercase tracking-widest ${sc.cls}`}>
                  {sc.dot} {sc.label}
                </span>
                {gate === 'open' && (
                  <span className="text-[9px] text-slate-600 font-semibold">
                    · {phase.submission_type === 'file' ? 'PDF' : phase.submission_type === 'link' ? 'LINK' : 'PDF / LINK'}
                  </span>
                )}
              </div>
              {phase.description && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{phase.description}</p>
              )}
              {/* Date info */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[10px] text-slate-500 font-semibold">
                {phase.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(phase.start_date).toLocaleDateString('vi-VN')}
                      {phase.end_date ? ` → ${new Date(phase.end_date).toLocaleDateString('vi-VN')}` : ''}
                    </span>
                  </span>
                )}
                {phase.submission_opens_at && (
                  <span className="text-cyan-600/80 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Mở nộp: {new Date(phase.submission_opens_at).toLocaleString('vi-VN')}</span>
                  </span>
                )}
                {phase.submission_closes_at && (
                  <span className="text-red-400/70 flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5 text-red-400" />
                    <span>Hạn chót: {new Date(phase.submission_closes_at).toLocaleString('vi-VN')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Quick submit button if open and no form showing */}
          {gate === 'open' && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs font-orbitron font-bold text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-950/20 uppercase tracking-wider transition shrink-0"
            >
              + Nộp bài
            </button>
          )}
        </div>
      </div>

      {/* Phase Body */}
      <div className="p-5 space-y-4">
        {/* Gate banner (closed / not_yet / expired) */}
        {gate !== 'open' && <GateBanner phase={phase} />}

        {loading ? (
          <div className="h-16 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Submit form inline */}
            {showForm && gate === 'open' && (
              <div className="tech-panel p-5 border-cyan-500/20">
                <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>NỘP BÀI — {phase.title}</span>
                </h4>
                <SubmitForm
                  phase={phase}
                  teamId={teamId}
                  userId={userId}
                  onSuccess={handleSuccess}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}

            {/* Current submission */}
            {current ? (
              <CurrentSubmissionCard
                submission={current}
                phase={phase}
                onResubmit={() => setShowForm(true)}
              />
            ) : gate === 'open' && !showForm ? (
              <div className="p-5 border border-dashed border-[#1e2d5a] rounded-xl text-center">
                <p className="text-slate-600 text-sm font-semibold">Chưa có bài nộp cho vòng này</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 text-xs font-orbitron font-bold text-cyan-500 hover:text-cyan-300 uppercase tracking-wider transition"
                >
                  + Nộp bài ngay
                </button>
              </div>
            ) : gate !== 'open' && !current ? (
              <div className="p-4 border border-dashed border-[#1e2d5a]/40 rounded-xl text-center">
                <p className="text-slate-600 text-xs">
                  {phase.status === 'upcoming' ? 'Vòng thi chưa bắt đầu.' : 'Vòng thi đã kết thúc.'}
                </p>
              </div>
            ) : null}

            {/* History */}
            {history.length > 0 && (
              <div className="mt-2">
                <h4 className="font-orbitron text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-slate-500" />
                  <span>LỊCH SỬ BÀI NỘP CŨ</span>
                </h4>
                <div className="space-y-2">
                  {history.map((item) => <HistoryItem key={item.id} item={item} />)}
                </div>
                <p className="mt-3 text-[10px] text-slate-600 font-semibold italic text-center">
                  File cũ đã được xóa để tiết kiệm dung lượng
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [myTeams, setMyTeams] = useState<TeamRecord[]>([])
  const [phases, setPhases] = useState<CompetitionPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!authUser) { router.push('/login'); return }
      setUser(authUser)

      const [teams, allPhases] = await Promise.all([getMyTeams(authUser.id), getPhases()])
      if (!isMounted) return

      setMyTeams(teams)
      setPhases(allPhases)
      setLoading(false)
    }
    loadData()
    return () => { isMounted = false }
  }, [router, supabase])

  if (loading) return <LoadingScreen text="Đang tải dữ liệu..." />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#112E81]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <Link href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-orbitron font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Dashboard</span>
        </Link>

        <div className="mb-8">
          <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
            <ClipboardPen className="w-6 h-6 text-cyan-400" />
            <span>BÀI NỘP CỦA TÔI</span>
          </h1>
        </div>

        {/* No team state */}
        {myTeams.length === 0 && (
          <div className="tech-panel p-8 text-center relative cyber-corners border-amber-500/20 text-white">
            <div className="inline-block bg-amber-950/20 border border-amber-800/30 p-4 rounded-full text-amber-400 mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="font-orbitron text-lg font-bold mb-2 uppercase tracking-wider text-amber-400">
              CHƯA GIA NHẬP LIÊN MINH
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Bạn cần thành lập hoặc gia nhập một đội thi trước khi có thể nộp bài.
            </p>
            <Link href="/dashboard"
              className="tech-btn-accent font-orbitron inline-block px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase text-black">
              XEM CÁC CUỘC THI
            </Link>
          </div>
        )}

        {/* Per-team view */}
        {myTeams.length > 0 && (
          <div className="space-y-8">
            {myTeams.map((team) => (
              <div key={team.id} className="tech-panel p-6 border-cyan-500/15">
                {/* Team header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1e2d5a]">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-orbitron font-bold text-sm">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-orbitron font-bold text-white tracking-wider uppercase text-sm">{team.name}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">LIÊN MINH</p>
                  </div>
                </div>

                {/* Phases — Journey */}
                {phases.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-4">Chưa có vòng thi nào được cấu hình.</p>
                ) : (
                  <div className="space-y-4">
                    {phases.map((phase) => (
                      <PhaseSubmissionSection
                        key={`${team.id}-${phase.id}`}
                        phase={phase}
                        teamId={team.id}
                        userId={user?.id ?? ''}
                        refreshKey={refreshKey}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}