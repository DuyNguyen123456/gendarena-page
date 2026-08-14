'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import {
  getJudges,
  getAssignments,
  assignJudgeToSubmission,
  removeAssignment,
} from '@/services/scoring'
import { getAllSubmissionsForAdmin } from '@/services/submissions'
import type { AdminSubmissionRow, TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORY_CONFIG, TOPIC_CATEGORIES } from '@/types/submission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Star,
  RefreshCw,
  Zap,
  X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type JudgeRow = {
  id: string
  full_name: string
  email: string
  expertise?: string[] | null
}

type AssignmentRow = {
  id: string
  judge_id: string
  submission_id: string
  judge?: { full_name: string }
}

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
        Chưa chọn chủ đề
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Expertise Badges ─────────────────────────────────────────────────────────

function ExpertiseBadges({ expertise }: { expertise?: string[] | null }) {
  if (!expertise?.length) {
    return <span className="text-[10px] text-text-disabled italic">Chưa khai báo lĩnh vực</span>
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {expertise.map((e) => {
        const cfg = TOPIC_CATEGORY_CONFIG[e as TopicCategory]
        if (!cfg) return null
        return (
          <span key={e} className={`inline-flex items-center px-1.5 py-px rounded border text-[9px] font-bold ${cfg.cls}`}>
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAssignPage() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([])
  const [judges, setJudges] = useState<JudgeRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [assigningMap, setAssigningMap] = useState<Record<string, string>>({})
  const [filterTopic, setFilterTopic] = useState<TopicCategory | ''>('')
  const router = useRouter()
  const supabase = createClient()

  const loadAll = useCallback(async () => {
    const [judgeList, assignList, subs] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, expertise')
        .eq('role', 'judge')
        .order('full_name')
        .then(({ data }) => (data ?? []) as JudgeRow[]),
      getAssignments() as Promise<AssignmentRow[]>,
      getAllSubmissionsForAdmin(),
    ])
    setJudges(judgeList)
    setAssignments(assignList)
    setSubmissions(subs)
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

      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      setUserId(user.id)
      await loadAll()
      setLoading(false)
    }
    init()
  }, [router, supabase, loadAll])

  const handleAssign = async (submissionId: string) => {
    const judgeId = assigningMap[submissionId]
    if (!userId || !judgeId) return

    const result = await assignJudgeToSubmission(judgeId, submissionId, userId)
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error ?? 'Phân công thất bại' })
    } else {
      setMessage({ type: 'success', text: 'Phân công giám khảo thành công!' })
      setAssigningMap((prev) => ({ ...prev, [submissionId]: '' }))
      await loadAll()
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const handleRemove = async (assignmentId: string, submissionId?: string) => {
    const result = await removeAssignment(assignmentId, submissionId)
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error ?? 'Xóa phân công thất bại' })
      return
    }
    setMessage({ type: 'success', text: 'Đã xóa phân công giám khảo' })
    setTimeout(() => setMessage(null), 4000)
    await loadAll()
  }

  // Map 1 assignment per submission ID — preserve business logic
  const assignmentBySub = assignments.reduce<Record<string, AssignmentRow>>((acc, row) => {
    acc[row.submission_id] = row
    return acc
  }, {})

  if (loading) return <Loading text="Đang tải hệ thống phân công..." />

  const filteredSubs = filterTopic
    ? submissions.filter(s => s.topic === filterTopic)
    : submissions

  const unassignedCount = filteredSubs.filter((s) => !assignmentBySub[s.id] && !s.assigned_judge).length
  const assignedCount = filteredSubs.length - unassignedCount

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-brand-purple/5 blur-[120px]" />
      </div>

      {/* Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 mb-4"
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
                Phân công Giám khảo
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Mỗi bài dự thi được phân công duy nhất 1 giám khảo chấm điểm
              </p>
            </div>
            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border bg-surface-overlay text-xs font-medium text-text-secondary">
                <UserX className="size-3.5 text-brand-amber" />
                Chờ phân công: <strong className="text-brand-amber">{unassignedCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border bg-surface-overlay text-xs font-medium text-text-secondary">
                <UserCheck className="size-3.5 text-brand-green" />
                Đã phân công: <strong className="text-brand-green">{assignedCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Feedback message */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 p-4 rounded-lg border text-sm ${
              message.type === 'success'
                ? 'bg-brand-green/10 border-brand-green/40 text-brand-green'
                : 'bg-brand-red/10 border-brand-red/40 text-brand-red'
            }`}
          >
            {message.type === 'success' ? <UserCheck className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Topic Filter */}
        <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Lọc theo chủ đề">
          <span className="text-xs text-text-tertiary font-medium">Lọc theo chủ đề:</span>
          <button
            type="button"
            onClick={() => setFilterTopic('')}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors duration-150 ${
              !filterTopic
                ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-semibold'
                : 'bg-surface-overlay border-surface-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Tất cả ({submissions.length})
          </button>
          {TOPIC_CATEGORIES.map((cat) => {
            const cfg = TOPIC_CATEGORY_CONFIG[cat]
            const count = submissions.filter(s => s.topic === cat).length
            if (count === 0) return null
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterTopic(cat)}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-opacity duration-150 ${cfg.cls} ${
                  filterTopic === cat ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                }`}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Submission list */}
        {filteredSubs.length === 0 ? (
          <Card className="p-12 text-center text-text-tertiary">
            <Users className="size-10 text-text-disabled mx-auto mb-2" />
            <p className="text-sm">
              {submissions.length === 0
                ? 'Chưa có bài nộp nào trong hệ thống.'
                : 'Không có bài nộp nào với chủ đề đã chọn.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSubs.map((sub) => {
              const currentAssign = assignmentBySub[sub.id]
              const assignedJudgeName = currentAssign?.judge?.full_name || sub.assigned_judge?.full_name
              const assignedJudgeId = currentAssign?.judge_id || sub.assigned_judge?.judge_id
              const assignmentId = currentAssign?.id || sub.assigned_judge?.id
              const isAssigned = !!assignedJudgeId

              return (
                <Card
                  key={sub.id}
                  className={`p-5 border transition-colors duration-150 ${
                    isAssigned ? 'border-brand-green/30' : 'border-brand-amber/30'
                  }`}
                >
                  {/* Submission header */}
                  <div className="flex flex-wrap items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-display text-base font-semibold text-text-primary">
                          {sub.teams?.name ?? 'Đội thi'}
                        </h3>
                        <Badge variant={isAssigned ? 'success' : 'warning'} size="sm">
                          {isAssigned ? (
                            <><UserCheck className="size-3 mr-1" />Đã phân công</>
                          ) : (
                            <><UserX className="size-3 mr-1" />Chờ phân công</>
                          )}
                        </Badge>
                        <TopicBadge topic={sub.topic} />
                      </div>
                      <p className="text-xs text-text-tertiary">
                        {sub.competition_phases?.title ?? '—'} · {new Date(sub.uploaded_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {/* Assigned judge status */}
                  <div className="mb-4 p-3.5 rounded-lg border bg-surface-overlay border-surface-border">
                    <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest mb-2">
                      Giám khảo đảm nhận (Tối đa 1)
                    </p>
                    {isAssigned ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-green">
                          <UserCheck className="size-4 shrink-0" />
                          {assignedJudgeName ?? 'Giám khảo'}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<X className="size-3.5" />}
                          onClick={() => assignmentId && handleRemove(assignmentId, sub.id)}
                          className="text-brand-red border-brand-red/40 hover:bg-brand-red/10"
                        >
                          Hủy phân công
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-brand-amber/90 italic">
                        Bài dự thi này chưa được phân công giám khảo.
                      </p>
                    )}
                  </div>

                  {/* Assign / Reassign form */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 pt-3 border-t border-surface-border">
                    <div className="flex-1 space-y-2">
                      <select
                        id={`judge-select-${sub.id}`}
                        aria-label={`Chọn giám khảo cho ${sub.teams?.name ?? 'đội thi'}`}
                        value={assigningMap[sub.id] || (currentAssign?.judge_id ?? '')}
                        onChange={(e) =>
                          setAssigningMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        className="w-full bg-surface-overlay border border-surface-border focus:border-brand-cyan rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none transition-colors duration-150"
                      >
                        <option value="" disabled>-- Chọn giám khảo --</option>
                        {judges.map((j) => {
                          const isMatch = sub.topic && j.expertise?.includes(sub.topic)
                          return (
                            <option key={j.id} value={j.id}>
                              {isMatch ? '⭐ ' : ''}{j.full_name} ({j.email}){j.expertise?.length ? ` — ${j.expertise.join(', ')}` : ''}
                            </option>
                          )
                        })}
                      </select>
                      {/* Expertise display for selected judge */}
                      {(assigningMap[sub.id] || currentAssign?.judge_id) && (() => {
                        const selId = assigningMap[sub.id] || currentAssign?.judge_id
                        const selJudge = judges.find(j => j.id === selId)
                        if (!selJudge) return null
                        return (
                          <div>
                            <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-widest mb-1">
                              Lĩnh vực chuyên môn:
                            </p>
                            <ExpertiseBadges expertise={selJudge.expertise} />
                          </div>
                        )
                      })()}
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={isAssigned ? <RefreshCw className="size-3.5" /> : <Zap className="size-3.5" />}
                      disabled={!assigningMap[sub.id] || assigningMap[sub.id] === currentAssign?.judge_id}
                      onClick={() => handleAssign(sub.id)}
                      className="self-start sm:mt-0"
                    >
                      {isAssigned ? 'Đổi giám khảo' : 'Phân công'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
