'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ExternalLink, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getDownloadUrl } from '@/services/submissions'
import { getPostLoginPath } from '@/lib/auth/routing'
import {
  getScoringRounds,
  getAssignedSubmissions,
  getMyScores,
  upsertScore,
  type AssignedSubmission,
  type Score,
  type ScoringRound,
} from '@/services/scoring'

import { getScoringGate } from '@/types/phase'

// ── Reusable within this page (used 2+) ────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
      {children}
    </p>
  )
}

function AlertMessage({
  type,
  children,
}: {
  type: 'success' | 'error' | 'info'
  children: React.ReactNode
}) {
  const variants = {
    success: {
      cls: 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success',
      Icon: CheckCircle,
    },
    error: {
      cls: 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger',
      Icon: AlertCircle,
    },
    info: {
      cls: 'bg-semantic-info/10 border-semantic-info/30 text-semantic-info',
      Icon: Clock,
    },
  }
  const { cls, Icon } = variants[type]
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${cls}`}
    >
      <Icon className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export default function JudgeScoringPage() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<AssignedSubmission[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [rounds, setRounds] = useState<ScoringRound[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [savingSubId, setSavingSubId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async (uid: string) => {
    const roundsData = await getScoringRounds()
    const subs = await getAssignedSubmissions(uid)
    setRounds(roundsData)
    setSubmissions(subs)

    if (!selectedRoundId && roundsData.length > 0) {
      setSelectedRoundId(roundsData.find((round) => round.scoring_open)?.id ?? roundsData[0].id)
    }
  }, [selectedRoundId])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'judge') {
        router.push(getPostLoginPath(profile?.role))
        return
      }

      setUserId(user.id)
      await loadData(user.id)
      setLoading(false)
    }
    init()
  }, [router, supabase, loadData])

  useEffect(() => {
    if (!userId || !selectedRoundId) return

    const uid = userId
    const roundId = selectedRoundId

    async function refreshScores() {
      const scoreMap = await getMyScores(uid, roundId)
      setScores(scoreMap)
    }

    refreshScores()
  }, [userId, selectedRoundId])

  const currentRound = rounds.find((round) => round.id === selectedRoundId)

  const handleScore = async (e: React.FormEvent<HTMLFormElement>, submissionId: string) => {
    e.preventDefault()
    const sub = submissions.find((s) => s.id === submissionId)
    const phaseGate = sub?.competition_phases
      ? getScoringGate(sub.competition_phases)
      : currentRound ? getScoringGate(currentRound) : 'closed'

    if (!userId || !currentRound || phaseGate !== 'open') {
      setMessage({ type: 'error', text: 'Vòng chấm cho bài nộp này hiện không mở do Ban tổ chức cấu hình.' })
      return
    }

    setSavingSubId(submissionId)

    const formData = new FormData(e.currentTarget)
    const criteriaScores: Record<string, number> = {}

    currentRound.criteria.forEach((criterion) => {
      const value = parseFloat(formData.get(`criterion_${criterion.id}`) as string)
      criteriaScores[criterion.id] = Number.isNaN(value) ? 0 : value
    })

    const payload = {
      submission_id: submissionId,
      judge_id: userId,
      round_id: currentRound.id,
      criteria_scores: criteriaScores,
      comment: (formData.get('comment') as string) || '',
    }

    const existing = scores[submissionId]
    const result = await upsertScore(payload, existing?.id)

    setSavingSubId(null)

    if (!result.ok) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Điểm đã được lưu thành công.' })
      setScoringId(null)

      if (result.score) {
        setScores((prev) => ({
          ...prev,
          [submissionId]: result.score!,
        }))
      }
      if (selectedRoundId) {
        const refreshedScores = await getMyScores(userId, selectedRoundId)
        setScores(refreshedScores)
      }
      await loadData(userId)
    }
  }

  const openAttachment = async (sub: AssignedSubmission) => {
    if (sub.submission_kind === 'link' && sub.submission_url) {
      window.open(sub.submission_url, '_blank')
      return
    }
    if (sub.file_path) {
      const url = await getDownloadUrl(sub.file_path)
      if (url) window.open(url, '_blank')
    }
  }

  if (loading) return <Loading text="Đang tải dữ liệu..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent-violet/8 blur-[120px]" />
      </div>

      {/* Page header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/judge"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-[150ms] mb-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại bảng điều khiển
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="brand" size="sm">BGK</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Chấm điểm bài nộp
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Thời gian chấm điểm do BTC quản lý theo từng vòng thi
              </p>
            </div>
            {currentRound?.rubric_url && (
              <a
                href={currentRound.rubric_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-brand-cyan hover:border-surface-border-strong hover:bg-surface-raised transition-all duration-[150ms]"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                Barem điểm
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 space-y-6">

        {/* Alert message */}
        {message && (
          <AlertMessage type={message.type}>
            {message.text}
          </AlertMessage>
        )}

        {/* Round selector */}
        {rounds.length > 0 && (
          <Card>
            <CardContent className="pt-0">
              <label
                htmlFor="round-select"
                className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2"
              >
                Vòng chấm hiện tại
              </label>
              <select
                id="round-select"
                value={selectedRoundId ?? ''}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full h-10 rounded-md border border-surface-border bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors duration-[150ms]"
              >
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>{round.title}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* No round warning */}
        {!currentRound && (
          <AlertMessage type="info">
            Hiện không có vòng chấm nào. Vui lòng chờ BTC cập nhật.
          </AlertMessage>
        )}

        {/* Empty state */}
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="size-10 text-text-disabled" aria-hidden="true" />
              <p className="text-sm text-text-secondary text-center">
                Chưa có bài nào được BTC phân công cho bạn.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const score = scores[sub.id]
              const phaseGate = sub.competition_phases
                ? getScoringGate(sub.competition_phases)
                : currentRound ? getScoringGate(currentRound) : 'closed'
              const isPhaseScoringOpen = phaseGate === 'open'

              return (
                <Card key={sub.id}>
                  {/* Submission header */}
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">
                          {sub.teams?.name ?? 'Đội không xác định'}
                        </CardTitle>
                        <CardDescription>
                          {sub.competition_phases?.title ?? '—'} &middot;{' '}
                          {sub.submission_kind === 'file' ? sub.file_name : 'Nộp qua link'}
                        </CardDescription>
                        {sub.topic && (
                          <div className="mt-2">
                            <Badge variant="info" size="sm">
                              {sub.topic}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Scoring gate status */}
                        {isPhaseScoringOpen ? (
                          <Badge variant="success" size="sm">Đang mở</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Đã đóng</Badge>
                        )}
                        {/* Existing score */}
                        {score && (
                          <span className="font-mono text-2xl font-bold text-semantic-success leading-none">
                            {score.total_score?.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Action buttons row */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={sub.submission_kind === 'file' ? <FileText /> : <ExternalLink />}
                        onClick={() => openAttachment(sub)}
                      >
                        {sub.submission_kind === 'file' ? 'Xem file' : 'Mở link bài nộp'}
                      </Button>

                      {isPhaseScoringOpen && scoringId !== sub.id && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setScoringId(sub.id)}
                        >
                          {score ? 'Sửa điểm' : 'Chấm điểm'}
                        </Button>
                      )}
                    </div>

                    {/* Scoring form */}
                    {scoringId === sub.id && isPhaseScoringOpen && (
                      <form
                        onSubmit={(e) => handleScore(e, sub.id)}
                        className="rounded-lg border border-surface-border bg-surface-overlay p-5 space-y-5"
                      >
                        {/* Round context */}
                        <div>
                          <SectionLabel>Vòng chấm</SectionLabel>
                          <p className="text-sm font-medium text-text-primary">
                            {currentRound?.title ?? 'Không có vòng chấm được chọn'}
                          </p>
                          {currentRound?.description && (
                            <p className="text-xs text-text-secondary mt-0.5">{currentRound.description}</p>
                          )}
                        </div>

                        {/* Criteria inputs */}
                        {currentRound?.criteria.length ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentRound.criteria.map((criterion) => (
                              <div key={criterion.id} className="space-y-1.5">
                                <label
                                  htmlFor={`criterion_${criterion.id}_${sub.id}`}
                                  className="block text-xs font-medium text-text-secondary"
                                >
                                  {criterion.name}
                                  <span className="ml-1 text-text-tertiary font-normal">
                                    · Trọng số {criterion.weight}% · Tối đa {criterion.max_score}
                                  </span>
                                </label>
                                <input
                                  id={`criterion_${criterion.id}_${sub.id}`}
                                  name={`criterion_${criterion.id}`}
                                  type="number"
                                  min="0"
                                  max={criterion.max_score}
                                  step="0.5"
                                  required
                                  defaultValue={score?.criteria_scores?.[criterion.id] ?? ''}
                                  className="h-10 w-full rounded-md border border-surface-border bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors duration-[150ms]"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border border-surface-border bg-surface-base px-4 py-3 text-sm text-text-secondary">
                            Vòng chấm này chưa có tiêu chí. Vui lòng liên hệ BTC.
                          </div>
                        )}

                        {/* Comment */}
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`comment_${sub.id}`}
                            className="block text-xs font-medium text-text-secondary"
                          >
                            Nhận xét
                          </label>
                          <textarea
                            id={`comment_${sub.id}`}
                            name="comment"
                            rows={3}
                            defaultValue={score?.comment ?? ''}
                            placeholder="Nhận xét về bài nộp (tuỳ chọn)..."
                            className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors duration-[150ms] resize-none"
                          />
                        </div>

                        {/* Form actions */}
                        <div className="flex gap-3">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            isLoading={savingSubId === sub.id}
                          >
                            {savingSubId === sub.id ? 'Đang lưu...' : 'Lưu điểm'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setScoringId(null)}
                          >
                            Huỷ
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
