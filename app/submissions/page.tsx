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
import {
  validateDeliverableFile,
  validateTotalFileSize,
  validateUrl,
  getMyTeams,
  getCurrentSubmission,
  getSubmissionHistory,
  getDownloadUrl,
  submitUnifiedSubmission,
  formatBytes,
  MAX_TOTAL_FILE_SIZE,
} from '@/services/submissions'
import type {
  Submission,
  SubmissionHistory,
  TeamRecord,
  TopicCategory,
  SubmissionAttachments,
} from '@/types/submission'
import { TOPIC_CATEGORIES, parseSubmissionAttachments } from '@/types/submission'
import { CompetitionPhase } from '@/types/phase'
import { getSubmissionGate } from '@/types/phase'
import { getPhases } from '@/services/phases'
import { siteConfig } from '@/config/site'
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
  Presentation,
  FileSpreadsheet,
  HardDrive,
  Sparkles,
  Layers,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Total Capacity Meter ─────────────────────────────────────────────────────

function TotalCapacityMeter({ totalBytes }: { totalBytes: number }) {
  const percent = Math.min(100, (totalBytes / MAX_TOTAL_FILE_SIZE) * 100)
  const isOver = totalBytes > MAX_TOTAL_FILE_SIZE
  const isWarning = !isOver && percent > 80
  const remaining = Math.max(0, MAX_TOTAL_FILE_SIZE - totalBytes)

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all duration-300 ${
        isOver
          ? 'bg-semantic-danger/10 border-semantic-danger/40 text-semantic-danger'
          : isWarning
          ? 'bg-semantic-warning/10 border-semantic-warning/30 text-semantic-warning'
          : 'bg-surface-overlay/80 border-surface-border text-text-secondary'
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold mb-2">
        <span className="flex items-center gap-1.5">
          <HardDrive className="size-4 text-brand-cyan" />
          <span>Tổng dung lượng file tải lên:</span>
          <span className="font-mono text-text-primary">
            {formatBytes(totalBytes)} / 10.0 MB
          </span>
        </span>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            isOver
              ? 'bg-semantic-danger/20 text-semantic-danger'
              : isWarning
              ? 'bg-semantic-warning/20 text-semantic-warning'
              : 'bg-brand-cyan/15 text-brand-cyan'
          }`}
        >
          {isOver
            ? 'Vượt quá 10 MB!'
            : totalBytes > 0
            ? `Còn trống ${formatBytes(remaining)}`
            : 'Tối đa 10 MB'}
        </span>
      </div>

      <div className="h-2 w-full bg-surface-base rounded-full overflow-hidden border border-surface-border/60">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isOver
              ? 'bg-semantic-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              : isWarning
              ? 'bg-semantic-warning shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              : 'bg-brand-cyan shadow-[0_0_8px_rgba(0,212,255,0.4)]'
          }`}
          style={{ width: `${Math.max(percent > 0 ? 3 : 0, percent)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-text-tertiary leading-relaxed">
        * Đội thi có thể nộp bằng File, Link hoặc kết hợp cả hai. Dung lượng chỉ tính trên các file tải lên trực tiếp.
      </p>
    </div>
  )
}

// ─── Deliverable Dropzone & Link Input Component ─────────────────────────────

interface DeliverableInputProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  templateUrl?: string
  mode: 'file' | 'link'
  onModeChange: (m: 'file' | 'link') => void
  file: File | null
  onFile: (f: File) => void
  onClearFile: () => void
  fileError: string | null
  acceptedFormats: string
  acceptTypes: string
  linkValue: string
  onLinkChange: (v: string) => void
  linkError: string | null
  linkPlaceholder: string
  linkHelper: string
}

function DeliverableInputBox({
  title,
  subtitle,
  icon,
  templateUrl,
  mode,
  onModeChange,
  file,
  onFile,
  onClearFile,
  fileError,
  acceptedFormats,
  acceptTypes,
  linkValue,
  onLinkChange,
  linkError,
  linkPlaceholder,
  linkHelper,
}: DeliverableInputProps) {
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

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-surface-border bg-surface-overlay/70 space-y-3.5 shadow-sm">
      {/* Header & Mode switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-surface-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-brand-cyan">{icon}</span>
            <h4 className="font-display font-semibold text-text-primary text-sm sm:text-base">
              {title}
            </h4>
            <span className="text-semantic-danger font-bold text-xs">*</span>
          </div>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>

        {/* Template shortcut button if provided */}
        {templateUrl && (
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/35 text-brand-cyan text-xs font-semibold shadow-sm transition shrink-0 self-start sm:self-center group"
          >
            <FileText className="size-3.5" />
            <span>Mẫu đề án chuẩn của BTC</span>
            <ExternalLink className="size-3 opacity-75 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}
      </div>

      {/* Mode Switch Tabs */}
      <div className="flex rounded-lg border border-surface-border bg-surface-base p-1 max-w-xs">
        <button
          type="button"
          onClick={() => onModeChange('file')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
            mode === 'file'
              ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan shadow-sm font-bold'
              : 'text-text-tertiary hover:text-text-primary'
          }`}
        >
          <Upload className="size-3.5" /> Tải lên File
        </button>
        <button
          type="button"
          onClick={() => onModeChange('link')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
            mode === 'link'
              ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan shadow-sm font-bold'
              : 'text-text-tertiary hover:text-text-primary'
          }`}
        >
          <LinkIcon className="size-3.5" /> Dán Link trực tuyến
        </button>
      </div>

      {/* Mode Body: File Dropzone */}
      {mode === 'file' && (
        <div>
          {file && !fileError ? (
            <div className="flex items-center gap-3.5 p-3.5 bg-semantic-success/10 border border-semantic-success/30 rounded-xl">
              <div className="size-9 rounded-lg bg-semantic-success/20 flex items-center justify-center text-semantic-success shrink-0">
                <Check className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-xs sm:text-sm truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                  Dung lượng: {formatBytes(file.size)}
                </p>
              </div>
              <Button
                onClick={onClearFile}
                type="button"
                variant="ghost"
                size="sm"
                className="text-semantic-danger hover:bg-semantic-danger/10 text-xs shrink-0"
              >
                Gỡ file
              </Button>
            </div>
          ) : (
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
                className={`w-full p-6 rounded-xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer ${
                  dragging
                    ? 'border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(0,212,255,0.15)]'
                    : fileError
                    ? 'border-semantic-danger/50 bg-semantic-danger/10'
                    : 'border-surface-border bg-surface-base hover:border-brand-cyan/40 hover:bg-surface-raised/70'
                }`}
              >
                <Upload className="size-7 text-brand-cyan mx-auto mb-2 opacity-80" />
                <p className="text-text-primary font-semibold text-xs sm:text-sm">
                  Kéo thả file vào đây hoặc <span className="text-brand-cyan underline">chọn từ thiết bị</span>
                </p>
                <p className="text-text-tertiary text-[11px] mt-1">
                  Định dạng hỗ trợ: <strong className="text-text-secondary">{acceptedFormats}</strong>
                </p>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={acceptTypes}
                className="hidden"
                onChange={(e) => pick(e.target.files)}
              />
              {fileError && (
                <p className="mt-2 text-xs text-semantic-danger font-medium flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" /> {fileError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode Body: Link Input */}
      {mode === 'link' && (
        <div>
          <div
            className={`border rounded-xl overflow-hidden transition bg-surface-base ${
              linkError ? 'border-semantic-danger/50' : 'border-surface-border focus-within:border-brand-cyan'
            }`}
          >
            <div className="px-3.5 py-3">
              <label className="block text-[11px] font-semibold text-text-tertiary mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="size-3.5 text-brand-cyan" />
                <span>Nhập đường dẫn trực tuyến (Public Link)</span>
              </label>
              <input
                type="url"
                value={linkValue}
                onChange={(e) => onLinkChange(e.target.value)}
                placeholder={linkPlaceholder}
                className="w-full bg-transparent text-text-primary text-xs sm:text-sm placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <div className="px-3.5 py-2 bg-surface-overlay/80 border-t border-surface-border text-[11px] text-text-tertiary flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1">
                <Info className="size-3 text-brand-cyan shrink-0" />
                {linkHelper}
              </span>
              <span className="text-semantic-warning flex items-center gap-1">
                <AlertTriangle className="size-3 text-semantic-warning shrink-0" />
                Vui lòng mở quyền xem công khai
              </span>
            </div>
          </div>
          {linkError && (
            <p className="mt-2 text-xs text-semantic-danger font-medium flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> {linkError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Submit Form (Dual Deliverable + Capacity Check) ─────────────────────────

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
  const [topic, setTopic] = useState<TopicCategory | ''>('')
  const [topicError, setTopicError] = useState<string | null>(null)

  // Pitch Deck state
  const [pitchMode, setPitchMode] = useState<'file' | 'link'>('file')
  const [pitchFile, setPitchFile] = useState<File | null>(null)
  const [pitchFileError, setPitchFileError] = useState<string | null>(null)
  const [pitchLink, setPitchLink] = useState('')
  const [pitchLinkError, setPitchLinkError] = useState<string | null>(null)

  // Report state
  const [reportMode, setReportMode] = useState<'file' | 'link'>('file')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [reportFileError, setReportFileError] = useState<string | null>(null)
  const [reportLink, setReportLink] = useState('')
  const [reportLinkError, setReportLinkError] = useState<string | null>(null)

  // Process & UI state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingExisting, setPendingExisting] = useState<Submission | null>(null)
  const { toasts, add: addToast, dismiss: dismissToast } = useToast()

  // Pitch-deck handlers
  function handlePitchFileSet(f: File) {
    setPitchFile(f)
    setPitchFileError(validateDeliverableFile(f, 'pitch_deck'))
  }
  function handlePitchFileClear() {
    setPitchFile(null)
    setPitchFileError(null)
  }
  function handlePitchLinkChange(v: string) {
    setPitchLink(v)
    setPitchLinkError(v ? validateUrl(v) : null)
  }

  // Report handlers
  function handleReportFileSet(f: File) {
    setReportFile(f)
    setReportFileError(validateDeliverableFile(f, 'report'))
  }
  function handleReportFileClear() {
    setReportFile(null)
    setReportFileError(null)
  }
  function handleReportLinkChange(v: string) {
    setReportLink(v)
    setReportLinkError(v ? validateUrl(v) : null)
  }

  // Total file size calculation
  const totalUploadedBytes = useMemo(() => {
    let sum = 0
    if (pitchMode === 'file' && pitchFile) sum += pitchFile.size
    if (reportMode === 'file' && reportFile) sum += reportFile.size
    return sum
  }, [pitchMode, pitchFile, reportMode, reportFile])

  const isOverCapacity = totalUploadedBytes > MAX_TOTAL_FILE_SIZE

  async function doSubmit(existing: Submission | null) {
    if (!topic) {
      setTopicError('Vui lòng chọn 1 trong 5 nhóm chủ đề bắt buộc.')
      return
    }

    setUploading(true)
    setUploadProgress(15)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      addToast('error', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      setUploading(false)
      return
    }

    setUploadProgress(35)

    const result = await submitUnifiedSubmission(
      {
        userId: user.id,
        teamId,
        phaseId: phase.id,
        topic,
        pitchDeck: {
          kind: pitchMode,
          file: pitchMode === 'file' ? pitchFile : null,
          url: pitchMode === 'link' ? pitchLink : null,
        },
        report: {
          kind: reportMode,
          file: reportMode === 'file' ? reportFile : null,
          url: reportMode === 'link' ? reportLink : null,
        },
      },
      existing,
    )

    setUploadProgress(100)
    setUploading(false)
    setPendingExisting(null)

    if (!result.ok) {
      addToast('error', result.error)
      setUploadProgress(0)
      return
    }

    addToast(
      'success',
      existing
        ? 'Đã thay thế bài nộp thành công! Bài cũ đã được lưu vào lịch sử.'
        : 'Nộp bài thành công! Hệ thống đã ghi nhận đề án dự thi của đội.',
    )
    setTimeout(() => onSuccess(), 800)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!topic) {
      setTopicError('Vui lòng chọn 1 trong 5 nhóm chủ đề bắt buộc.')
      return
    }

    // Validate Pitch Deck
    if (pitchMode === 'file') {
      if (!pitchFile) {
        addToast('error', 'Vui lòng chọn file Slide Pitch-Deck.')
        return
      }
      const err = validateDeliverableFile(pitchFile, 'pitch_deck')
      if (err) {
        setPitchFileError(err)
        return
      }
    } else {
      const err = validateUrl(pitchLink)
      if (err) {
        setPitchLinkError(err)
        return
      }
    }

    // Validate Report
    if (reportMode === 'file') {
      if (!reportFile) {
        addToast('error', 'Vui lòng chọn file Báo cáo đề án bằng chữ.')
        return
      }
      const err = validateDeliverableFile(reportFile, 'report')
      if (err) {
        setReportFileError(err)
        return
      }
    } else {
      const err = validateUrl(reportLink)
      if (err) {
        setReportLinkError(err)
        return
      }
    }

    // Check capacity limit
    if (isOverCapacity) {
      addToast('error', 'Tổng dung lượng các file tải lên vượt quá 10 MB. Vui lòng nén file.')
      return
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
            <DialogDescription className="space-y-2 text-xs sm:text-sm">
              <p>
                Lượt nộp mới sẽ <strong className="text-text-primary">thay thế hoàn toàn bài nộp hiện tại</strong> của đội.
              </p>
              <p className="text-text-tertiary">
                Hệ thống sẽ chuyển phiên bản cũ vào Lịch sử nộp bài và tự động giải phóng các file lưu trữ cũ.
              </p>
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
            className={`w-full bg-surface-overlay border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-cyan transition ${
              topicError ? 'border-semantic-danger/60 bg-semantic-danger/10' : 'border-surface-border'
            }`}
          >
            <option value="" disabled>
              -- Chọn 1 trong 5 nhóm chủ đề bắt buộc --
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

        {/* Deliverable 1: Slide Pitch-Deck */}
        <DeliverableInputBox
          title="1. Slide báo cáo (Pitch-Deck)"
          subtitle="Slide thuyết trình tổng quan đề án khởi nghiệp và mô hình giải pháp"
          icon={<Presentation className="size-4" />}
          mode={pitchMode}
          onModeChange={(m) => {
            setPitchMode(m)
            setPitchFileError(null)
            setPitchLinkError(null)
          }}
          file={pitchFile}
          onFile={handlePitchFileSet}
          onClearFile={handlePitchFileClear}
          fileError={pitchFileError}
          acceptedFormats="PDF (.pdf), PowerPoint (.pptx, .ppt)"
          acceptTypes="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.ms-powerpoint,.ppt"
          linkValue={pitchLink}
          onLinkChange={handlePitchLinkChange}
          linkError={pitchLinkError}
          linkPlaceholder="https://www.canva.com/design/... hoặc Google Slides, Figma"
          linkHelper="Hỗ trợ: Canva, Google Slides, Figma, Pitch.com, Drive, v.v."
        />

        {/* Deliverable 2: Written Report */}
        <DeliverableInputBox
          title="2. Báo cáo đề án bằng chữ"
          subtitle="Thuyết minh đề án chi tiết và phân tích thị trường theo khung mẫu chuẩn của BTC"
          icon={<FileSpreadsheet className="size-4" />}
          templateUrl={siteConfig.resources.reportTemplate}
          mode={reportMode}
          onModeChange={(m) => {
            setReportMode(m)
            setReportFileError(null)
            setReportLinkError(null)
          }}
          file={reportFile}
          onFile={handleReportFileSet}
          onClearFile={handleReportFileClear}
          fileError={reportFileError}
          acceptedFormats="PDF (.pdf), Word (.docx, .doc)"
          acceptTypes="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
          linkValue={reportLink}
          onLinkChange={handleReportLinkChange}
          linkError={reportLinkError}
          linkPlaceholder="https://docs.google.com/document/d/... hoặc Notion"
          linkHelper="Hỗ trợ: Google Docs, Notion, Coda, Google Drive, v.v."
        />

        {/* Total File Capacity Meter */}
        <TotalCapacityMeter totalBytes={totalUploadedBytes} />

        {/* Progress Bar while uploading */}
        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-text-secondary">
              <span>Đang tải lên hệ thống và xử lý dữ liệu...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-cyan rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,212,255,0.5)]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
          <Button
            id={`submit-btn-${phase.id}`}
            type="submit"
            variant="primary"
            size="md"
            isLoading={uploading}
            leftIcon={<Upload className="size-4" />}
            disabled={uploading || isOverCapacity}
            className="w-full sm:w-auto justify-center"
          >
            Xác nhận nộp bài
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={uploading}
            className="w-full sm:w-auto justify-center"
          >
            Hủy bỏ
          </Button>
        </div>
      </form>
    </>
  )
}

// ─── Current Submission Card (Dual Document Display) ──────────────────────────

function CurrentSubmissionCard({
  submission,
  phase,
  onResubmit,
}: {
  submission: Submission
  phase: CompetitionPhase
  onResubmit: () => void
}) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const status = STATUS_BADGES[submission.status] ?? STATUS_BADGES['submitted']
  const gate = getSubmissionGate(phase)

  const attachments = submission.attachments || parseSubmissionAttachments(submission)

  async function handleDownload(filePath: string, key: string) {
    if (!filePath) return
    setDownloadingKey(key)
    const url = await getDownloadUrl(filePath)
    setDownloadingKey(null)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      alert('Không thể tạo link tải. Vui lòng thử lại.')
    }
  }

  return (
    <Card className="p-5 sm:p-6 border-brand-cyan/35 bg-surface-overlay/70 space-y-4 shadow-elevation-1">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              <Tag className="size-3 mr-1" />
              {submission.topic || 'Chưa chọn chủ đề'}
            </Badge>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>
          <p className="text-xs text-text-tertiary flex items-center gap-1.5 pt-0.5">
            <Clock className="size-3.5 text-brand-cyan" />
            <span>Nộp lúc: <strong className="text-text-secondary">{formatDate(submission.uploaded_at)}</strong></span>
            {submission.file_size && (
              <span className="font-mono text-text-tertiary">
                · Tổng file: {formatBytes(submission.file_size)}
              </span>
            )}
          </p>
        </div>

        {gate === 'open' && (
          <Button
            id={`resubmit-btn-${submission.id}`}
            onClick={onResubmit}
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="size-3.5" />}
            className="text-xs w-full sm:w-auto shrink-0 justify-center"
          >
            Nộp lại đề án
          </Button>
        )}
      </div>

      {/* 2 Deliverable Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Pitch Deck Preview */}
        {attachments?.pitch_deck && (
          <div className="p-3.5 rounded-xl border border-surface-border bg-surface-base flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center shrink-0">
                <Presentation className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary text-xs truncate">
                    1. Slide Pitch-Deck
                  </span>
                  <Badge variant={attachments.pitch_deck.kind === 'file' ? 'brand' : 'default'} size="sm" className="text-[10px] py-0 px-1.5">
                    {attachments.pitch_deck.kind === 'file' ? 'File Slide' : 'Link trực tuyến'}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary truncate font-medium">
                  {attachments.pitch_deck.kind === 'file'
                    ? attachments.pitch_deck.file_name || 'Slide báo cáo'
                    : attachments.pitch_deck.url || 'Đường dẫn liên kết'}
                </p>
                {attachments.pitch_deck.kind === 'file' && attachments.pitch_deck.file_size && (
                  <p className="text-[11px] text-text-tertiary font-mono">
                    {formatBytes(attachments.pitch_deck.file_size)}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-border/60">
              {attachments.pitch_deck.kind === 'file' && attachments.pitch_deck.file_path ? (
                <Button
                  onClick={() => handleDownload(attachments.pitch_deck.file_path!, 'pitch')}
                  variant="ghost"
                  size="sm"
                  isLoading={downloadingKey === 'pitch'}
                  leftIcon={<Download className="size-3.5" />}
                  className="w-full text-brand-cyan hover:bg-brand-cyan/10 text-xs justify-center h-8"
                >
                  Tải Slide về máy
                </Button>
              ) : attachments.pitch_deck.url ? (
                <a
                  href={attachments.pitch_deck.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ExternalLink className="size-3.5" />}
                    className="w-full text-brand-cyan hover:bg-brand-cyan/10 text-xs justify-center h-8"
                  >
                    Mở Slide trực tuyến
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        )}

        {/* Written Report Preview */}
        {attachments?.report && (
          <div className="p-3.5 rounded-xl border border-surface-border bg-surface-base flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary text-xs truncate">
                    2. Báo cáo đề án
                  </span>
                  <Badge variant={attachments.report.kind === 'file' ? 'brand' : 'default'} size="sm" className="text-[10px] py-0 px-1.5">
                    {attachments.report.kind === 'file' ? 'File Đề án' : 'Link trực tuyến'}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary truncate font-medium">
                  {attachments.report.kind === 'file'
                    ? attachments.report.file_name || 'Báo cáo đề án'
                    : attachments.report.url || 'Đường dẫn liên kết'}
                </p>
                {attachments.report.kind === 'file' && attachments.report.file_size && (
                  <p className="text-[11px] text-text-tertiary font-mono">
                    {formatBytes(attachments.report.file_size)}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-border/60">
              {attachments.report.kind === 'file' && attachments.report.file_path ? (
                <Button
                  onClick={() => handleDownload(attachments.report.file_path!, 'report')}
                  variant="ghost"
                  size="sm"
                  isLoading={downloadingKey === 'report'}
                  leftIcon={<Download className="size-3.5" />}
                  className="w-full text-brand-cyan hover:bg-brand-cyan/10 text-xs justify-center h-8"
                >
                  Tải Báo cáo về máy
                </Button>
              ) : attachments.report.url ? (
                <a
                  href={attachments.report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ExternalLink className="size-3.5" />}
                    className="w-full text-brand-cyan hover:bg-brand-cyan/10 text-xs justify-center h-8"
                  >
                    Mở Báo cáo trực tuyến
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ item }: { item: SubmissionHistory }) {
  const attachments = item.attachments || parseSubmissionAttachments(item)

  return (
    <div className="p-3.5 bg-surface-overlay/80 border border-surface-border rounded-xl text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="default" size="sm" className="bg-surface-raised border-surface-border text-text-tertiary">
            Lượt nộp cũ
          </Badge>
          {item.topic && (
            <Badge variant="brand" size="sm">
              {item.topic}
            </Badge>
          )}
        </div>
        <span className="text-text-tertiary text-[11px]">
          Thay thế: {formatDate(item.deleted_at)}
        </span>
      </div>

      {/* Deliverables summary in history */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
        <div className="p-2 rounded-lg bg-surface-base border border-surface-border/60 flex items-center gap-2">
          <Presentation className="size-3.5 text-brand-cyan shrink-0" />
          <div className="min-w-0 flex-1 truncate">
            <span className="text-text-tertiary">Pitch-Deck: </span>
            <span className="text-text-secondary font-medium truncate">
              {attachments?.pitch_deck?.file_name || attachments?.pitch_deck?.url || item.file_name || 'Nộp bằng link'}
            </span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-surface-base border border-surface-border/60 flex items-center gap-2">
          <FileSpreadsheet className="size-3.5 text-emerald-400 shrink-0" />
          <div className="min-w-0 flex-1 truncate">
            <span className="text-text-tertiary">Báo cáo chữ: </span>
            <span className="text-text-secondary font-medium truncate">
              {attachments?.report?.file_name || attachments?.report?.url || item.submission_url || 'Nộp bằng link'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-tertiary pt-1 border-t border-surface-border/40">
        <span>Nộp lúc: {formatDate(item.uploaded_at)}</span>
        {item.file_size && <span>Tổng file: {formatBytes(item.file_size)}</span>}
        {item.profiles?.email && (
          <span className="flex items-center gap-1">
            <UserIcon className="size-3 text-text-tertiary" /> {item.profiles.email}
          </span>
        )}
      </div>
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
        teams.map(async (t: TeamRecord) => {
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            <a
              href={siteConfig.resources.reportTemplate}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-overlay hover:bg-surface-raised border border-brand-cyan/35 hover:border-brand-cyan text-brand-cyan text-xs font-semibold shadow-sm transition-all shrink-0 self-start sm:self-center group"
            >
              <FileText className="size-4" />
              <span>Template Báo Cáo Đề Án</span>
              <ExternalLink className="size-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </a>
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