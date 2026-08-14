'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { getDownloadUrl, getAllSubmissionsForAdmin } from '@/services/submissions'
import type { AdminSubmissionRow, TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORY_CONFIG } from '@/types/submission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  AlertCircle,
  Link2,
} from 'lucide-react'

type Phase = { id: string; title: string }
type TabKey = 'all' | 'pending' | string

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [userRole, setUserRole] = useState<string>('')
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())

  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async (role: string, uid: string) => {
    let data: AdminSubmissionRow[] = await getAllSubmissionsForAdmin()

    // Judges only see their assigned submissions
    if (role === 'judge') {
      const { data: assignments } = await supabase
        .from('judge_assignments')
        .select('submission_id')
        .eq('judge_id', uid)
      const ids = (assignments ?? []).map((a: { submission_id: string }) => a.submission_id)
      setAssignedIds(new Set(ids))
      data = data.filter(sub => ids.includes(sub.id))
    }

    setSubmissions(data)

    // Load phases for tab filter
    const { data: phaseData } = await supabase
      .from('competition_phases')
      .select('id, title')
      .order('display_order', { ascending: true })
    setPhases((phaseData as Phase[]) || [])
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

      if (profile?.role !== 'admin' && profile?.role !== 'judge') {
        router.push('/dashboard')
        return
      }

      setUserRole(profile.role)
      await loadData(profile.role, user.id)
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
    if (activeTab === 'pending') return sub.status === 'pending' || sub.status === 'submitted'
    return sub.phase_id === activeTab
  })

  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'submitted').length

  if (loading) return <Loading text="Đang tải danh sách bài nộp..." />

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: submissions.length },
    { key: 'pending', label: 'Chờ chấm', count: pendingCount },
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
            href={userRole === 'admin' ? '/admin' : '/judge'}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-[150ms] mb-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại {userRole === 'admin' ? 'Control Center' : 'Judge Panel'}
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                {userRole === 'admin' && <Badge variant="warning" size="sm">BTC</Badge>}
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                {userRole === 'judge' ? 'Bài nộp được phân công' : 'Quản lý bài nộp'}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {userRole === 'judge'
                  ? 'Danh sách bài dự thi được phân công cho bạn để thẩm định và chấm điểm'
                  : `Tổng cộng ${submissions.length} bài nộp trong hệ thống`}
              </p>
            </div>
            {userRole === 'admin' && (
              <Link href="/admin/assign">
                <Button variant="secondary" size="md" leftIcon={<UserCheck className="size-4" />}>
                  Phân công BGK
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
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
              {activeTab === 'pending' ? 'Không có bài nào đang chờ chấm.' : 'Chưa có bài nộp nào phù hợp.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
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
                      {/* Assigned Judge Badge */}
                      {sub.assigned_judge ? (
                        <Badge variant="brand" size="sm">
                          <UserCheck className="size-3 mr-1" />
                          BGK: {sub.assigned_judge.full_name ?? 'Đã gán'}
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          <UserX className="size-3 mr-1" />
                          Chưa phân công
                        </Badge>
                      )}
                      {/* Read-Only Score Badge for Admin */}
                      {sub.scores && sub.scores.length > 0 && (
                        <Badge variant="success" size="sm">
                          <CheckCircle className="size-3 mr-1" />
                          Điểm: {sub.scores[0].total_score.toFixed(1)}
                        </Badge>
                      )}
                      {/* Short ID for admin when no assignments */}
                      {userRole === 'admin' && assignedIds.size === 0 && (
                        <span className="text-[10px] font-mono text-text-disabled border border-surface-border px-2 py-0.5 rounded">
                          ID: {sub.id.slice(0, 8)}…
                        </span>
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
                          {sub.file_name}
                        </>
                      ) : (
                        <>
                          <Link2 className="size-3.5 text-text-tertiary shrink-0" />
                          <span className="truncate max-w-xs">{sub.submission_url}</span>
                        </>
                      )}
                    </p>
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
                    {userRole === 'judge' && (
                      <Link href={`/judge/scoring?submission=${sub.id}`}>
                        <Button variant="primary" size="sm">
                          Chấm điểm
                        </Button>
                      </Link>
                    )}
                    {userRole === 'admin' && (
                      <Link href={`/admin/assign?highlight=${sub.id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<UserCheck className="size-3.5" />}>
                          Phân công
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
