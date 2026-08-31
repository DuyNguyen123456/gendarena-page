'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import PaymentModal from '@/components/team/PaymentModal'
import {
  CheckCircle2,
  XCircle,
  Radio,
  AlertTriangle,
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
  Check,
  ShieldAlert,
  BadgeCheck,
  CreditCard,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_BADGES: Record<
  string,
  { label: string; variant: 'brand' | 'warning' | 'success' }
> = {
  submitted: { label: 'Đã nộp', variant: 'brand' },
  reviewing: { label: 'Đang chấm', variant: 'warning' },
  scored: { label: 'Đã chấm', variant: 'success' },
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'
interface ToastMsg {
  id: number
  type: ToastType
  text: string
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMsg[]
  onDismiss: (id: number) => void
}) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-xl text-sm font-medium shadow-elevation-3 cursor-pointer max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            t.type === 'success'
              ? 'bg-surface-raised/95 border-semantic-success/40 text-semantic-success'
              : t.type === 'error'
              ? 'bg-surface-raised/95 border-semantic-danger/40 text-semantic-danger'
              : 'bg-surface-raised/95 border-brand-cyan/40 text-brand-cyan'
          }`}
        >
          <span className="shrink-0">
            {t.type === 'success' ? (
              <CheckCircle2 className="size-5 text-semantic-success" />
            ) : t.type === 'error' ? (
              <XCircle className="size-5 text-semantic-danger" />
            ) : (
              <Radio className="size-5 text-brand-cyan" />
            )}
          </span>
          <span className="leading-snug">{t.text}</span>
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

// ─── Gate Banner ──────────────────────────────────────────────────────────────

function GateBanner({ phase }: { phase: CompetitionPhase }) {
  const gate = getSubmissionGate(phase)

  if (gate === 'open') return null

  const configs = {
    closed: {
      icon: <Lock className="size-5 shrink-0" />,
      title: 'Chưa mở nộp bài',
      sub: 'Ban tổ chức chưa mở cổng nộp bài cho vòng thi này.',
      cls: 'border-surface-border bg-surface-overlay text-text-tertiary',
    },
    not_yet: {
      icon: <Clock className="size-5 shrink-0" />,
      title: 'Chưa đến thời gian mở',
      sub: `Cổng nộp bài sẽ mở vào lúc: ${formatDate(phase.submission_opens_at!)}`,
      cls: 'border-semantic-warning/30 bg-semantic-warning/10 text-semantic-warning',
    },
    expired: {
      icon: <Ban className="size-5 shrink-0" />,
      title: 'Đã đóng nộp bài',
      sub: `Hạn nộp đã kết thúc vào lúc: ${formatDate(phase.submission_closes_at!)}`,
      cls: 'border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger',
    },
  }

  const c = configs[gate]
  return (
    <div className={`flex items-center gap-3.5 p-4 border rounded-xl ${c.cls}`}>
      {c.icon}
      <div>
        <p className="font-display font-semibold text-sm">{c.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{c.sub}</p>
      </div>
    </div>
  )
}

// ─── Dropzone (file upload) ───────────────────────────────────────────────────

function FileDropzone({
  file,
  error,
  onFile,
  onClear,
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
      <div className="flex items-center gap-4 p-4 bg-semantic-success/10 border border-semantic-success/30 rounded-xl">
        <FileText className="size-8 text-semantic-success shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-sm break-all">{file.name}</p>
          <p className="text-xs text-text-secondary mt-0.5 font-mono">{formatBytes(file.size)}</p>
        </div>
        <Button
          onClick={onClear}
          type="button"
          variant="ghost"
          size="sm"
          className="text-semantic-danger hover:bg-semantic-danger/10"
        >
          Gỡ file
        </Button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`w-full p-8 rounded-xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer ${
          dragging
            ? 'border-brand-cyan bg-brand-cyan/10 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
            : error
            ? 'border-semantic-danger/50 bg-semantic-danger/10'
            : 'border-surface-border bg-surface-overlay hover:border-brand-cyan/40 hover:bg-surface-raised'
        }`}
      >
        <FileText className="size-10 text-brand-cyan mx-auto mb-3" />
        <p className="text-text-primary font-semibold text-sm">Kéo thả file PDF đề án vào đây</p>
        <p className="text-text-tertiary text-xs mt-1">hoặc click để chọn từ thiết bị</p>
        <div className="mt-4 space-y-1 text-xs text-text-secondary">
          <p className="flex items-center justify-center gap-1.5">
            <Check className="size-3.5 text-brand-cyan" /> Định dạng chấp nhận: PDF (.pdf)
          </p>
          <p className="flex items-center justify-center gap-1.5">
            <Check className="size-3.5 text-brand-cyan" /> Dung lượng tối đa: 10 MB
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      {error && (
        <p className="mt-2 text-xs text-semantic-danger font-medium flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Link Input ───────────────────────────────────────────────────────────────

function LinkInput({
  value,
  error,
  onChange,
}: {
  value: string
  error: string | null
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div
        className={`border rounded-xl overflow-hidden transition ${
          error ? 'border-semantic-danger/50' : 'border-surface-border focus-within:border-brand-cyan'
        }`}
      >
        <div className="px-4 py-3 bg-surface-overlay">
          <label className="block text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
            <LinkIcon className="size-4 text-brand-cyan" />
            <span>Đường dẫn tài liệu / đề án trực tuyến</span>
          </label>
          <input
            id="link-submission-input"
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full bg-transparent text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
        <div className="px-4 py-2.5 bg-surface-base border-t border-surface-border text-xs text-text-tertiary space-y-1">
          <p className="flex items-center gap-1.5">
            <Info className="size-3.5 text-brand-cyan shrink-0" /> Hỗ trợ: Google Drive, GitHub, Figma, Notion, v.v.
          </p>
          <p className="text-semantic-warning flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-semantic-warning shrink-0" /> Vui lòng mở quyền truy cập CÔNG KHAI để Ban giám khảo có thể xem
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-semantic-danger font-medium flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-text-secondary">
        <span>Đang nộp bài...</span>
        <span className="font-mono">{progress}%</span>
      </div>
      <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-cyan rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,212,255,0.5)]"
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
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

    addToast('success', 'Nộp bài thành công! Hệ thống đã ghi nhận đề án.')
    setTimeout(() => onSuccess(), 800)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!topic) {
      setTopicError('Vui lòng chọn 1 trong 5 nhóm chủ đề bắt buộc.')
      return
    }

    if (activeTab === 'file') {
      if (!file) {
        addToast('error', 'Vui lòng chọn file PDF.')
        return
      }
      const err = validateFile(file)
      if (err) {
        setFileError(err)
        return
      }
    } else {
      const err = validateUrl(linkValue)
      if (err) {
        setLinkError(err)
        return
      }
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
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="size-12 rounded-full bg-semantic-warning/10 border border-semantic-warning/30 flex items-center justify-center text-semantic-warning mb-3">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle>Xác nhận nộp lại đề án</DialogTitle>
            <DialogDescription>
              Nộp bài mới sẽ <span className="font-semibold text-text-primary">thay thế bài cũ</span>. Bài cũ sẽ được chuyển vào lịch sử lưu trữ của đội.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4 border-t border-surface-border">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setShowConfirm(false)
                setPendingExisting(null)
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setShowConfirm(false)
                doSubmit(pendingExisting)
              }}
            >
              Xác nhận thay thế
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Topic Category Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <Tag className="size-4 text-brand-cyan" />
            <span>Nhóm chủ đề bài thi</span> <span className="text-semantic-danger">*</span>
          </label>
          <select
            id={`topic-select-${phase.id}`}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value as TopicCategory)
              setTopicError(null)
            }}
            className={`w-full bg-surface-overlay border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-cyan transition ${
              topicError ? 'border-semantic-danger/60 bg-semantic-danger/10' : 'border-surface-border'
            }`}
          >
            <option value="" disabled>
              -- Chọn 1 trong 5 nhóm chủ đề --
            </option>
            {TOPIC_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-surface-raised text-text-primary">
                {cat}
              </option>
            ))}
          </select>
          {topicError && (
            <p className="text-xs text-semantic-danger font-medium flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> {topicError}
            </p>
          )}
        </div>

        {/* Tab selector for 'both' */}
        {type === 'both' && (
          <div className="flex rounded-lg border border-surface-border overflow-hidden bg-surface-overlay p-1">
            {(['file', 'link'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition flex items-center justify-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-surface-raised text-brand-cyan shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                {tab === 'file' ? (
                  <>
                    <FileText className="size-3.5" /> Nộp File PDF
                  </>
                ) : (
                  <>
                    <LinkIcon className="size-3.5" /> Nộp Link trực tuyến
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {/* File input */}
        {(type === 'file' || (type === 'both' && activeTab === 'file')) && (
          <FileDropzone
            file={file}
            error={fileError}
            onFile={handleFileSet}
            onClear={handleFileClear}
          />
        )}

        {/* Link input */}
        {(type === 'link' || (type === 'both' && activeTab === 'link')) && (
          <LinkInput value={linkValue} error={linkError} onChange={handleLinkChange} />
        )}

        {/* Progress */}
        {uploading && <UploadProgress progress={uploadProgress} />}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
          <Button
            id={`submit-btn-${phase.id}`}
            type="submit"
            variant="primary"
            size="md"
            isLoading={uploading}
            leftIcon={<Upload className="size-4" />}
            disabled={uploading || (activeTab === 'file' ? !!fileError : !!linkError)}
            className="w-full sm:w-auto justify-center"
          >
            Nộp bài
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            className="w-full sm:w-auto justify-center"
          >
            Hủy bỏ
          </Button>
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
  const status = STATUS_BADGES[submission.status] ?? STATUS_BADGES['submitted']
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
    <Card className="p-5 sm:p-6 border-brand-cyan/30 bg-surface-overlay/60 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 text-brand-cyan">
              {isFile ? <FileText className="size-5" /> : <LinkIcon className="size-5" />}
            </span>
            <span className="font-display font-semibold text-text-primary text-base break-all">
              {isFile ? submission.file_name : 'Bài nộp bằng link trực tuyến'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" size="sm">
              <Tag className="size-3 mr-1" />
              {submission.topic || 'Chưa chọn chủ đề'}
            </Badge>
            {isFile && submission.file_size && (
              <span className="text-xs text-text-tertiary font-mono flex items-center gap-1">
                <Package className="size-3.5" /> {formatBytes(submission.file_size)}
              </span>
            )}
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Clock className="size-3.5" /> Nộp lúc: {formatDate(submission.uploaded_at)}
            </span>
          </div>
        </div>

        <Badge variant={status.variant} size="md">
          {status.label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 border-t border-surface-border">
        {isFile && submission.file_path && (
          <Button
            id={`download-btn-${submission.id}`}
            onClick={handleDownload}
            variant="secondary"
            size="sm"
            isLoading={loadingUrl}
            leftIcon={<Download className="size-4" />}
            className="w-full sm:w-auto justify-center text-xs"
          >
            Tải xuống bài thi
          </Button>
        )}
        {!isFile && submission.submission_url && (
          <a href={submission.submission_url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="size-4" />} className="w-full justify-center text-xs">
              Mở link bài nộp
            </Button>
          </a>
        )}
        {gate === 'open' && (
          <Button
            id={`resubmit-btn-${submission.id}`}
            onClick={onResubmit}
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="size-4" />}
            className="w-full sm:w-auto justify-center text-xs"
          >
            Nộp lại đề án
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ item }: { item: SubmissionHistory }) {
  const isFile = item.submission_kind === 'file'
  return (
    <div className="flex items-start gap-3.5 p-3.5 bg-surface-overlay border border-surface-border rounded-xl text-xs">
      <span className="shrink-0 mt-0.5 text-text-tertiary">
        {isFile ? <FileText className="size-4" /> : <LinkIcon className="size-4" />}
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-text-secondary break-all">
          {isFile && item.file_name ? item.file_name : 'Nộp bằng link'}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-text-tertiary">
          {isFile && item.file_size && <span>Dung lượng: {formatBytes(item.file_size)}</span>}
          <span>Nộp: {formatDate(item.uploaded_at)}</span>
          <span>Thay thế: {formatDate(item.deleted_at)}</span>
          {item.profiles?.email && (
            <span className="flex items-center gap-1">
              <UserIcon className="size-3 text-text-tertiary" /> {item.profiles.email}
            </span>
          )}
        </div>
      </div>
      <Badge variant="default" size="sm">
        Bản cũ
      </Badge>
    </div>
  )
}

// ─── Expired Unsubmitted Phase Card ───────────────────────────────────────────

function ExpiredPhaseCard({ phase }: { phase: CompetitionPhase }) {
  return (
    <Card className="overflow-hidden border-surface-border bg-surface-overlay/40 opacity-90">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="size-9 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-center font-display font-semibold text-text-tertiary shrink-0 text-sm">
            {phase.phase_number}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-semibold text-text-secondary tracking-tight">
                {phase.title}
              </h3>
              <Badge variant="default" size="sm" className="text-text-tertiary bg-surface-raised border border-surface-border">
                Đã hết hạn
              </Badge>
            </div>
            {phase.description && (
              <p className="text-xs text-text-tertiary leading-relaxed line-clamp-2">
                {phase.description}
              </p>
            )}
            {phase.submission_closes_at && (
              <p className="text-xs text-semantic-danger flex items-center gap-1 pt-1">
                <Ban className="size-3.5" />
                <span>Hạn nộp đã kết thúc vào lúc: {formatDate(phase.submission_closes_at)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <span className="text-xs font-medium text-text-disabled bg-surface-raised px-3 py-1.5 rounded-lg border border-surface-border">
            Chưa nộp bài
          </span>
        </div>
      </div>
    </Card>
  )
}

// ─── Phase Submission Section ─────────────────────────────────────────────────

function PhaseSubmissionSection({
  phase,
  teamId,
  userId,
  refreshKey,
  initialSubmission,
  onSubmissionChange,
}: {
  phase: CompetitionPhase
  teamId: string
  userId: string
  refreshKey: number
  initialSubmission?: Submission | null
  onSubmissionChange?: () => void
}) {
  const [current, setCurrent] = useState<Submission | null>(initialSubmission ?? null)
  const [history, setHistory] = useState<SubmissionHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const gate = getSubmissionGate(phase)
  const isOpen = gate === 'open'

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

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function handleSuccess() {
    setShowForm(false)
    load()
    onSubmissionChange?.()
  }

  const statusConfig: Record<
    string,
    { label: string; variant: 'success' | 'warning' | 'default' }
  > = {
    active: { label: 'Đang mở', variant: 'success' },
    upcoming: { label: 'Sắp tới', variant: 'warning' },
    completed: { label: 'Đã đóng', variant: 'default' },
  }
  const sc = statusConfig[phase.status] ?? statusConfig.upcoming

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${
        isOpen
          ? 'border-brand-cyan/40 bg-surface-overlay/80 shadow-elevation-1'
          : 'border-surface-border bg-surface-overlay/30'
      }`}
    >
      {/* Phase Header Card */}
      <div
        className={`p-5 sm:p-6 border-b border-surface-border ${
          isOpen ? 'bg-brand-cyan/5' : 'bg-surface-overlay/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            {/* Phase number badge */}
            <div
              className={`size-9 rounded-lg border flex items-center justify-center font-display font-semibold shrink-0 text-sm ${
                isOpen
                  ? 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan shadow-sm'
                  : 'bg-surface-overlay border-surface-border text-text-secondary'
              }`}
            >
              {phase.phase_number}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold text-text-primary tracking-tight">
                  {phase.title}
                </h3>
                <Badge variant={isOpen ? 'brand' : sc.variant} size="sm">
                  {isOpen ? 'Đang mở nộp bài' : sc.label}
                </Badge>
                {isOpen && (
                  <span className="text-xs text-text-tertiary">
                    · {phase.submission_type === 'file' ? 'PDF' : phase.submission_type === 'link' ? 'LINK' : 'PDF / LINK'}
                  </span>
                )}
              </div>
              {phase.description && (
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  {phase.description}
                </p>
              )}
              {/* Date info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-text-tertiary">
                {phase.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    <span>
                      {new Date(phase.start_date).toLocaleDateString('vi-VN')}
                      {phase.end_date ? ` → ${new Date(phase.end_date).toLocaleDateString('vi-VN')}` : ''}
                    </span>
                  </span>
                )}
                {phase.submission_opens_at && (
                  <span className="text-brand-cyan flex items-center gap-1">
                    <Upload className="size-3.5" />
                    <span>Mở: {new Date(phase.submission_opens_at).toLocaleString('vi-VN')}</span>
                  </span>
                )}
                {phase.submission_closes_at && (
                  <span className="text-semantic-danger flex items-center gap-1">
                    <Ban className="size-3.5" />
                    <span>Hạn: {new Date(phase.submission_closes_at).toLocaleString('vi-VN')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick submit button if open and no form showing */}
          {isOpen && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              variant="primary"
              size="sm"
              leftIcon={<Upload className="size-3.5" />}
              className="w-full sm:w-auto shrink-0 self-start sm:self-center justify-center text-xs"
            >
              Nộp bài
            </Button>
          )}
        </div>
      </div>

      {/* Phase Body */}
      <div className="p-5 sm:p-6 space-y-4">
        {!isOpen && <GateBanner phase={phase} />}

        {loading ? (
          <div className="h-16 flex items-center justify-center">
            <span className="size-5 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Submit form inline */}
            {showForm && isOpen && (
              <div className="p-5 rounded-xl border border-brand-cyan/30 bg-surface-overlay space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
                  <Upload className="size-4 text-brand-cyan" />
                  <h4 className="font-display text-sm font-semibold text-text-primary">
                    Biểu mẫu nộp bài — {phase.title}
                  </h4>
                </div>
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
            ) : isOpen && !showForm ? (
              <div className="p-8 border border-dashed border-surface-border rounded-xl text-center">
                <p className="text-text-tertiary text-sm font-medium">Chưa có bài nộp cho vòng thi này</p>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="ghost"
                  size="sm"
                  leftIcon={<Upload className="size-3.5" />}
                  className="mt-2 text-brand-cyan hover:text-brand-cyan-bright"
                >
                  Nộp bài ngay
                </Button>
              </div>
            ) : !isOpen && !current ? (
              <div className="p-4 border border-dashed border-surface-border/60 rounded-xl text-center">
                <p className="text-text-tertiary text-xs">
                  Vòng thi đã kết thúc thời gian nộp bài.
                </p>
              </div>
            ) : null}

            {/* History */}
            {history.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-1.5">
                  <Archive className="size-4 text-text-tertiary" />
                  <span>Lịch sử bài nộp cũ ({history.length})</span>
                </h4>
                <div className="space-y-2">
                  {history.map((item) => (
                    <HistoryItem key={item.id} item={item} />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-text-tertiary italic text-center">
                  File cũ đã được giải phóng dung lượng theo quy định của hệ thống
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

// ─── Team Phases Section (R3 Filter Enforced) ──────────────────────────────────

function TeamPhasesSection({
  team,
  phases,
  userId,
  refreshKey,
}: {
  team: TeamRecord
  phases: CompetitionPhase[]
  userId: string
  refreshKey: number
}) {
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission | null>>({})
  const [loading, setLoading] = useState(true)

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    const results = await Promise.all(
      phases.map(async (p) => {
        const sub = await getCurrentSubmission(team.id, p.id)
        return { phaseId: p.id, sub }
      })
    )
    const map: Record<string, Submission | null> = {}
    results.forEach(({ phaseId, sub }) => {
      map[phaseId] = sub
    })
    setSubmissionsMap(map)
    setLoading(false)
  }, [team.id, phases])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions, refreshKey])

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <span className="size-6 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
      </div>
    )
  }

  const visiblePhases = phases.filter((phase) => {
    const sub = submissionsMap[phase.id]
    const hasSubmitted = !!sub
    const gate = getSubmissionGate(phase)

    if (gate === 'open') return true
    if (hasSubmitted) return true
    const isClosedOrExpired = gate === 'expired' || (gate === 'closed' && phase.status === 'completed')
    if (isClosedOrExpired && !hasSubmitted) return true
    return false
  })

  if (visiblePhases.length === 0) {
    return (
      <Card className="text-center py-10">
        <ClipboardPen className="size-10 text-text-tertiary mx-auto mb-2 opacity-60" />
        <p className="text-text-secondary text-sm">
          Hiện tại chưa có vòng thi nào đang mở nộp bài hoặc đã diễn ra.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {visiblePhases.map((phase) => {
        const sub = submissionsMap[phase.id]
        const hasSubmitted = !!sub
        const gate = getSubmissionGate(phase)
        const isClosedOrExpired = gate === 'expired' || (gate === 'closed' && phase.status === 'completed')

        if (!hasSubmitted && isClosedOrExpired) {
          return <ExpiredPhaseCard key={`${team.id}-${phase.id}`} phase={phase} />
        }

        return (
          <PhaseSubmissionSection
            key={`${team.id}-${phase.id}`}
            phase={phase}
            teamId={team.id}
            userId={userId}
            refreshKey={refreshKey}
            initialSubmission={sub}
            onSubmissionChange={loadSubmissions}
          />
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [myTeams, setMyTeams] = useState<TeamRecord[]>([])
  const [phases, setPhases] = useState<CompetitionPhase[]>([])
  const [teamMemberCounts, setTeamMemberCounts] = useState<Record<string, number>>({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentTeam, setPaymentTeam] = useState<TeamRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const [teams, allPhases] = await Promise.all([getMyTeams(authUser.id), getPhases()])

      const counts: Record<string, number> = {}
      await Promise.all(
        teams.map(async (t) => {
          const { count } = await supabase
            .from('team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', t.id)
          counts[t.id] = Math.max(count ?? 1, 1)
        })
      )

      setTeamMemberCounts(counts)
      setMyTeams(teams)
      setPhases(allPhases)
      setLoading(false)
    } catch (err) {
      console.error('Error loading submissions data:', err)
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  if (loading) return <Loading variant="submissions" text="Đang tải danh sách bài nộp..." />

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
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan-bright font-medium transition mb-4 group"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            <span>Quay lại Bảng điều khiển</span>
          </Link>

          <div>
            <Badge variant="brand" size="sm" className="mb-2">
              GenD Arena 2026
            </Badge>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
              Bài nộp đề án dự thi
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Quản lý và theo dõi tiến độ nộp đề án qua từng vòng thi đấu
            </p>
          </div>
        </div>
      </div>

      <motion.main
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8"
      >
        {myTeams.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="size-12 text-text-tertiary mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Chưa tham gia đội thi nào
            </h3>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto leading-relaxed">
              Bạn cần thành lập hoặc gia nhập một đội thi trước khi có thể nộp đề án dự thi.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/team/browse">
                <Button variant="secondary" size="md">
                  Tìm đội có sẵn
                </Button>
              </Link>
              <Link href="/team/create">
                <Button variant="primary" size="md">
                  Thành lập đội mới
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {myTeams.length > 0 && (
          <div className="space-y-8">
            {myTeams.map((team) => {
              const isVerified = team.status === 'verified'
              return (
                <div key={team.id} className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-border gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center text-brand-cyan font-display font-semibold text-sm">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display font-semibold text-text-primary text-lg">
                            Đội: {team.name}
                          </h2>
                          {isVerified ? (
                            <Badge variant="brand" size="sm">
                              <BadgeCheck className="size-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              Chưa xác thực
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-text-tertiary">Đội thi</span>
                      </div>
                    </div>
                  </div>

                  {!isVerified ? (
                    <Card className="p-8 sm:p-10 border-slate-800 bg-slate-900/70 text-center max-w-xl mx-auto space-y-5">
                      <div className="size-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg">
                        <ShieldAlert className="size-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-display text-xl font-bold text-text-primary">
                          Đội thi của bạn chưa hoàn tất lệ phí dự thi để nộp bài
                        </h3>
                        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
                          Vui lòng hoàn tất nộp lệ phí dự thi và nhận xác thực từ Ban tổ chức để mở khóa cổng nộp bài đề án.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-text-tertiary">Đội thi:</span>
                          <span className="font-semibold text-text-primary">{team.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-tertiary">Trạng thái lệ phí:</span>
                          {team.status === 'locked_pending_payment' ? (
                            <Badge variant="warning" size="sm">Đang chờ BTC đối soát</Badge>
                          ) : team.status === 'payment_rejected' ? (
                            <Badge variant="danger" size="sm">Lệ phí bị từ chối</Badge>
                          ) : (
                            <Badge variant="default" size="sm">Chưa đóng lệ phí</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-text-secondary pt-1 border-t border-slate-800/80 leading-relaxed">
                          {team.status === 'locked_pending_payment'
                            ? 'Biên lai chuyển khoản đã được gửi và đang chờ BTC phê duyệt trong 24h.'
                            : team.status === 'payment_rejected'
                            ? 'Biên lai chuyển khoản bị từ chối. Vui lòng nộp lại biên lai mới.'
                            : 'Trưởng đội có thể nộp lệ phí trực tiếp ngay tại đây để nhận Huy hiệu Verified và mở cổng nộp bài.'}
                        </p>
                      </div>
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button
                          variant="primary"
                          size="md"
                          leftIcon={<CreditCard className="size-4" />}
                          onClick={() => {
                            setPaymentTeam(team)
                            setShowPaymentModal(true)
                          }}
                          className="w-full sm:w-auto justify-center"
                        >
                          {team.status === 'payment_rejected' ? 'Nộp lại biên lai mới' : 'Thanh toán lệ phí ngay'}
                        </Button>
                        <Link href="/dashboard" className="w-full sm:w-auto">
                          <Button variant="secondary" size="md" leftIcon={<ArrowLeft className="size-4" />} className="w-full justify-center">
                            Về Bảng điều khiển
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ) : phases.length === 0 ? (
                    <Card className="text-center py-10">
                      <ClipboardPen className="size-10 text-text-tertiary mx-auto mb-2 opacity-60" />
                      <p className="text-text-secondary text-sm">
                        Chưa có vòng thi nào được cấu hình trên hệ thống.
                      </p>
                    </Card>
                  ) : (
                    <TeamPhasesSection
                      team={team}
                      phases={phases}
                      userId={user?.id ?? ''}
                      refreshKey={refreshKey}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </motion.main>

      {/* Direct Payment Modal on Submissions Page */}
      {paymentTeam && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          team={paymentTeam as any}
          membersCount={teamMemberCounts[paymentTeam.id] || 1}
          onSuccess={() => {
            loadData()
          }}
        />
      )}
    </div>
  )
}