'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { getDownloadUrl, getAllSubmissionsForAdmin } from '@/services/submissions'
import {
  getScoringRounds,
  saveAdminScore,
  type ScoringRound,
} from '@/services/scoring'
import type { AdminSubmissionRow, TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORY_CONFIG } from '@/types/submission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link2,
  Scale,
  Pencil,
  BookOpen,
  User,
  MessageSquare,
} from 'lucide-react'

type Phase = { id: string; title: string }
type TabKey = 'all' | 'pending' | 'scored' | string

// ─── Topic Badge ──────────────────────────────────────────────────────────────

function TopicBadge({ topic }: { topic: TopicCategory | string | null | undefined }) {
  if (!topic) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium bg-surface-overlay border-surface-border text-text-tertiary">
        Chưa chọn chủ đề
      </span>
    )
  }
  const cfg = TOPIC_CATEGORY_CONFIG[topic as TopicCategory]
  if (!cfg) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium bg-surface-overlay border-surface-border text-text-tertiary">
        {topic}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'; icon: React.ReactNode }> = {
    pending:   { label: 'Chờ chấm', variant: 'default',  icon: <Clock className="size-3" /> },
    submitted: { label: 'Đã nộp',   variant: 'default',  icon: <Clock className="size-3" /> },
    scored:    { label: 'Đã chấm',  variant: 'success',  icon: <CheckCircle className="size-3" /> },
    reviewing: { label: 'Đang xem', variant: 'info',     icon: <AlertCircle className="size-3" /> },
    rejected:  { label: 'Từ chối',  variant: 'danger',   icon: <XCircle className="size-3" /> },
  }
  const badge = map[status] ?? { label: status, variant: 'default' as const, icon: null }
  return (
    <Badge variant={badge.variant} size="sm">
      <span className="flex items-center gap-1">
        {badge.icon}
        {badge.label}
      </span>
    </Badge>
  )
}

function parseCommentAndJudge(rawComment?: string | null): { judgeName: string; comment: string } {
  if (!rawComment) return { judgeName: '', comment: '' }
  const match = rawComment.match(/^\[BGK:\s*([^\]]+)\]\s*([\s\S]*)$/)
  if (match) {
    return {
      judgeName: match[1].trim(),
      comment: match[2].trim(),
    }
  }
  return { judgeName: '', comment: rawComment }
}

// ─── Admin Scoring Dialog ─────────────────────────────────────────────────────

interface ScoringModalProps {
  submission: AdminSubmissionRow
  rounds: ScoringRound[]
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function AdminScoringModal({ submission, rounds, adminId, onClose, onSaved }: ScoringModalProps) {
  // Find default round matching submission phase, or active/first round
  const defaultRound = useMemo(() => {
    if (submission.phase_id) {
      const match = rounds.find(r => r.phase_id === submission.phase_id)
      if (match) return match
    }
    return rounds.find(r => r.scoring_open) ?? rounds[0] ?? null
  }, [rounds, submission.phase_id])

  const existingScore = submission.scores?.[0]
  const parsed = useMemo(() => parseCommentAndJudge(existingScore?.comment), [existingScore?.comment])

  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    existingScore?.round_id || defaultRound?.id || ''
  )
  const [offlineJudgeName, setOfflineJudgeName] = useState(parsed.judgeName)
  const [comment, setComment] = useState(parsed.comment)
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(() => {
    if (existingScore?.criteria_scores && Object.keys(existingScore.criteria_scores).length > 0) {
      return { ...existingScore.criteria_scores }
    }
    return {}
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const activeRound = useMemo(() => {
    return rounds.find(r => r.id === selectedRoundId) ?? defaultRound
  }, [rounds, selectedRoundId, defaultRound])

  // Real-time calculated total score based on weights
  const computedTotalScore = useMemo(() => {
    if (!activeRound?.criteria || activeRound.criteria.length === 0) {
      const vals = Object.values(criteriaScores)
      if (vals.length === 0) return 0
      return vals.reduce((a, b) => a + b, 0) / vals.length
    }

    let weightedSum = 0
    let totalWeight = 0

    for (const crit of activeRound.criteria) {
      const val = criteriaScores[crit.id] ?? 0
      const max = crit.max_score > 0 ? crit.max_score : 10
      const weight = crit.weight > 0 ? crit.weight : 1
      weightedSum += (val / max) * weight
      totalWeight += weight
    }

    if (totalWeight <= 0) return 0
    const finalScore = (weightedSum / totalWeight) * 10
    return Math.round(finalScore * 100) / 100
  }, [activeRound, criteriaScores])

  const handleScoreChange = (criterionId: string, valStr: string, maxScore: number) => {
    const val = parseFloat(valStr)
    const num = isNaN(val) ? 0 : Math.max(0, Math.min(maxScore, val))
    setCriteriaScores(prev => ({
      ...prev,
      [criterionId]: num,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')

    const result = await saveAdminScore({
      submission_id: submission.id,
      admin_id: adminId,
      round_id: activeRound?.id || null,
      criteria_scores: criteriaScores,
      offline_judge_name: offlineJudgeName.trim() || null,
      comment: comment.trim() || null,
      total_score: computedTotalScore,
    })

    setSaving(false)

    if (!result.ok) {
      setErrorMsg(result.error || 'Lưu điểm thất bại.')
    } else {
      onSaved()
      onClose()
    }
  }

  const openAttachment = async () => {
    if (submission.submission_kind === 'link' && submission.submission_url) {
      window.open(submission.submission_url, '_blank')
      return
    }
    if (submission.file_path) {
      const url = await getDownloadUrl(submission.file_path)
      if (url) window.open(url, '_blank')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="size-5 text-brand-cyan" />
            <DialogTitle className="text-lg font-bold text-text-primary">
              Chấm điểm bài dự thi (Admin Entry)
            </DialogTitle>
          </div>
          <DialogDescription>
            Nhập kết quả đánh giá theo barem tiêu chí thay cho Ban Giám Khảo ngoại tuyến.
          </DialogDescription>
        </DialogHeader>

        {/* Submission Context Info Box */}
        <div className="mt-3 p-4 rounded-xl border border-surface-border bg-surface-overlay space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-text-primary">
              {submission.teams?.name ?? 'Đội thi'}
            </h3>
            <div className="flex items-center gap-2">
              <TopicBadge topic={submission.topic} />
              <StatusBadge status={submission.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary pt-1 border-t border-surface-border">
            <span>
              Vòng thi: <strong className="text-text-primary">{submission.competition_phases?.title ?? '—'}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<ExternalLink className="size-3.5" />}
              onClick={openAttachment}
              className="text-brand-cyan hover:text-brand-cyan-bright h-7 px-2"
            >
              {submission.submission_kind === 'file' ? (
                <>Xem file: <span className="underline ml-1 truncate max-w-[160px]">{submission.file_name}</span></>
              ) : (
                <>Mở liên kết bài nộp</>
              )}
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-xs text-semantic-danger flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 text-semantic-danger mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Round Selector & Rubric link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="scoring-round-select" className="block text-xs font-semibold text-text-secondary">
                Vòng chấm &amp; Barem áp dụng <span className="text-semantic-danger">*</span>
              </label>
              {activeRound?.rubric_url && (
                <a
                  href={activeRound.rubric_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline"
                >
                  <BookOpen className="size-3.5" />
                  <span>Xem tài liệu barem</span>
                </a>
              )}
            </div>
            {rounds.length > 0 ? (
              <select
                id="scoring-round-select"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors cursor-pointer"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.scoring_open ? '(Đang mở)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-lg border border-surface-border bg-surface-overlay text-xs text-text-tertiary">
                Chưa có vòng chấm nào. Điểm sẽ được ghi nhận trực tiếp.
              </div>
            )}
          </div>

          {/* Criteria scoring inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Tiêu chí chấm điểm
              </span>
              <span className="text-xs text-text-secondary font-mono">
                Thang điểm: 0 - 10
              </span>
            </div>

            {activeRound?.criteria && activeRound.criteria.length > 0 ? (
              <div className="space-y-3">
                {activeRound.criteria.map((crit) => {
                  const currentScore = criteriaScores[crit.id] ?? ''
                  return (
                    <div
                      key={crit.id}
                      className="p-3.5 rounded-lg border border-surface-border bg-surface-overlay/80 hover:border-surface-border-strong transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-sm text-text-primary">{crit.name}</p>
                          <p className="text-xs text-text-tertiary">
                            Trọng số: <span className="text-brand-cyan font-mono font-semibold">{crit.weight}%</span> · Tối đa: <span className="text-text-secondary font-mono">{crit.max_score}đ</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Input
                            type="number"
                            min={0}
                            max={crit.max_score}
                            step={0.1}
                            required
                            value={currentScore}
                            onChange={(e) => handleScoreChange(crit.id, e.target.value, crit.max_score)}
                            placeholder="0.0"
                            className="w-24 text-center font-mono font-bold text-sm bg-surface-raised"
                          />
                          <span className="text-xs text-text-tertiary font-mono">/ {crit.max_score}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback 4 standard criteria if no custom criteria exist in DB */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'innovation', label: 'Tính sáng tạo & Đổi mới', weight: '25%' },
                  { key: 'feasibility', label: 'Tính khả thi & Kỹ thuật', weight: '25%' },
                  { key: 'practicality', label: 'Tính thực tiễn & Tác động', weight: '25%' },
                  { key: 'presentation', label: 'Trình bày & Hoàn thiện', weight: '25%' },
                ].map((crit) => (
                  <div key={crit.key} className="p-3 rounded-lg border border-surface-border bg-surface-overlay space-y-1.5">
                    <label className="block text-xs font-medium text-text-primary">
                      {crit.label} <span className="text-brand-cyan font-mono text-[11px]">({crit.weight})</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={criteriaScores[crit.key] ?? ''}
                      onChange={(e) => handleScoreChange(crit.key, e.target.value, 10)}
                      placeholder="Điểm 0 - 10"
                      className="font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Total Score Preview */}
          <div className="p-4 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                Tổng điểm quy đổi (Hệ 10)
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Tự động tính theo trọng số của các tiêu chí
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-extrabold text-brand-cyan">
                {computedTotalScore.toFixed(2)}
              </span>
              <span className="text-xs text-text-tertiary ml-1 font-mono">/ 10</span>
            </div>
          </div>

          {/* Offline Judge Name (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="offline-judge-name" className="block text-xs font-semibold text-text-secondary">
              Tên Giám khảo chấm thi (Ngoại tuyến)
            </label>
            <Input
              id="offline-judge-name"
              type="text"
              value={offlineJudgeName}
              onChange={(e) => setOfflineJudgeName(e.target.value)}
              placeholder="VD: TS. Nguyễn Văn A, Giám khảo 1..."
              leftIcon={<User className="size-4" />}
            />
            <p className="text-[11px] text-text-tertiary">
              Ghi chú tên chuyên gia/giám khảo đã trực tiếp chấm bài nộp này
            </p>
          </div>

          {/* Feedback & Comments */}
          <div className="space-y-1.5">
            <label htmlFor="score-comment" className="block text-xs font-semibold text-text-secondary">
              Nhận xét &amp; Đánh giá chi tiết
            </label>
            <textarea
              id="score-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập nhận xét, ưu điểm, nhược điểm và đóng góp cho đề án của đội thi..."
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors resize-none"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={saving}
              leftIcon={<CheckCircle className="size-4" />}
            >
              {existingScore ? 'Cập nhật điểm' : 'Lưu điểm bài thi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Submissions Page ────────────────────────────────────────────────────

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [rounds, setRounds] = useState<ScoringRound[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [currentUid, setCurrentUid] = useState<string>('')
  const [scoringSubmission, setScoringSubmission] = useState<AdminSubmissionRow | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [subs, roundsData, { data: phaseData }] = await Promise.all([
        getAllSubmissionsForAdmin(),
        getScoringRounds(),
        supabase.from('competition_phases').select('id, title').order('display_order', { ascending: true }),
      ])

      setSubmissions(subs)
      setRounds(roundsData)
      setPhases((phaseData as Phase[]) || [])
    } catch (err) {
      console.error('Failed to load submissions:', err)
      setError('Không thể tải dữ liệu bài nộp. Vui lòng thử lại.')
    }
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setCurrentUid(user.id)
      await loadData()
      setLoading(false)
    }
    init()
  }, [supabase, router, loadData])

  const openAttachment = async (sub: AdminSubmissionRow) => {
    if (sub.submission_kind === 'link' && sub.submission_url) {
      window.open(sub.submission_url, '_blank')
      return
    }
    if (sub.file_path) {
      const url = await getDownloadUrl(sub.file_path)
      if (url) window.open(url, '_blank')
    }
  }

  // Tab filtering
  const filtered = submissions.filter((sub) => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return sub.status === 'pending' || sub.status === 'submitted' || sub.status === 'reviewing'
    if (activeTab === 'scored') return sub.status === 'scored' || (sub.scores && sub.scores.length > 0)
    return sub.phase_id === activeTab
  })

  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'submitted' || s.status === 'reviewing').length
  const scoredCount = submissions.filter(s => s.status === 'scored' || (s.scores && s.scores.length > 0)).length

  if (loading) return <Loading text="Đang tải danh sách bài nộp & barem..." />

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: submissions.length },
    { key: 'pending', label: 'Chờ chấm', count: pendingCount },
    { key: 'scored', label: 'Đã chấm', count: scoredCount },
    ...phases.map(p => ({ key: p.id, label: p.title })),
  ]

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
                <FileText className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý &amp; Chấm điểm bài dự thi
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Xem chi tiết bài thi, nhập điểm barem thay cho Ban Giám Khảo và quản lý tiến độ chấm thi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/scoring">
                <Button variant="secondary" size="md" leftIcon={<Scale className="size-4" />}>
                  Cấu hình tiêu chí
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Success Toast / Alert */}
        {successToast && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-lg border border-semantic-success/30 bg-semantic-success/10 px-4 py-3 text-sm text-semantic-success animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="size-4 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-xs text-semantic-success hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Error State Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 px-4 py-3 text-sm text-semantic-danger"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData()}
              className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger shrink-0"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc bài nộp">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-semibold'
                  : 'bg-surface-overlay border-surface-border text-text-secondary hover:border-surface-border-strong hover:text-text-primary'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-px rounded text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-surface-raised text-text-tertiary'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-text-tertiary">
            <FileText className="size-10 text-text-disabled mx-auto mb-2" />
            <p className="text-sm">
              {activeTab === 'pending'
                ? 'Tất cả các bài nộp đã được chấm điểm hoàn tất.'
                : activeTab === 'scored'
                ? 'Chưa có bài nộp nào được nhập điểm.'
                : 'Chưa có bài nộp nào phù hợp với bộ lọc.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const scoreRecord = sub.scores?.[0]
              const hasScore = typeof scoreRecord?.total_score === 'number'
              const parsedJudge = parseCommentAndJudge(scoreRecord?.comment)

              return (
                <Card key={sub.id} className="p-5 hover:border-surface-border-strong transition-colors duration-150">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Team name + badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-text-primary">
                          {sub.teams?.name ?? 'Đội thi'}
                        </h3>
                        <StatusBadge status={sub.status} />
                        <TopicBadge topic={sub.topic} />

                        {/* Score Badge */}
                        {hasScore ? (
                          <Badge variant="success" size="sm" className="font-mono font-bold">
                            <CheckCircle className="size-3 mr-1" />
                            Điểm: {scoreRecord?.total_score.toFixed(1)} / 10
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            <Clock className="size-3 mr-1" />
                            Chưa chấm
                          </Badge>
                        )}
                      </div>

                      {/* Phase + Timestamp */}
                      <p className="text-xs text-text-tertiary">
                        {sub.competition_phases?.title ?? phases.find(p => p.id === sub.phase_id)?.title ?? '—'}
                        {' · '}
                        {new Date(sub.uploaded_at).toLocaleString('vi-VN')}
                      </p>

                      {/* File / Link info */}
                      <p className="text-sm text-text-secondary flex items-center gap-1.5">
                        {sub.submission_kind === 'file' ? (
                          <>
                            <FileText className="size-3.5 text-text-tertiary shrink-0" />
                            <span className="truncate max-w-sm">{sub.file_name}</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="size-3.5 text-text-tertiary shrink-0" />
                            <span className="truncate max-w-sm">{sub.submission_url}</span>
                          </>
                        )}
                      </p>

                      {/* Offline Judge & Comment Note if present */}
                      {(parsedJudge.judgeName || parsedJudge.comment) && (
                        <div className="mt-2 p-2.5 rounded-lg bg-surface-overlay border border-surface-border text-xs space-y-1">
                          {parsedJudge.judgeName && (
                            <p className="text-brand-cyan font-medium flex items-center gap-1.5">
                              <User className="size-3" />
                              <span>BGK chấm: {parsedJudge.judgeName}</span>
                            </p>
                          )}
                          {parsedJudge.comment && (
                            <p className="text-text-secondary italic flex items-start gap-1.5">
                              <MessageSquare className="size-3 shrink-0 mt-0.5 text-text-tertiary" />
                              <span>{parsedJudge.comment}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<ExternalLink className="size-3.5" />}
                        onClick={() => openAttachment(sub)}
                      >
                        Xem bài
                      </Button>
                      <Button
                        variant={hasScore ? 'secondary' : 'primary'}
                        size="sm"
                        leftIcon={hasScore ? <Pencil className="size-3.5" /> : <Scale className="size-3.5" />}
                        onClick={() => setScoringSubmission(sub)}
                      >
                        {hasScore ? 'Sửa điểm' : 'Nhập điểm (Chấm thi)'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Admin Scoring Modal */}
      {scoringSubmission && (
        <AdminScoringModal
          submission={scoringSubmission}
          rounds={rounds}
          adminId={currentUid}
          onClose={() => setScoringSubmission(null)}
          onSaved={async () => {
            await loadData()
            setSuccessToast('Đã lưu điểm bài thi thành công!')
            setTimeout(() => setSuccessToast(null), 4000)
          }}
        />
      )}
    </div>
  )
}
