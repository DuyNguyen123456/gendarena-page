'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LoadingScreen from '@/components/loading-screen'
import DotGridBackground from '@/components/dot-grid-background'
import { getLeaderboard, type LeaderboardRow } from '@/services/scoring'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Trophy,
  Medal,
  Star,
  Users,
} from 'lucide-react'

// ─── Rank Visual ──────────────────────────────────────────────────────────────

function RankIcon({ idx }: { idx: number }) {
  if (idx === 0)
    return <Trophy className="size-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" aria-label="Hạng 1" />
  if (idx === 1)
    return <Medal className="size-6 text-slate-300 drop-shadow-[0_0_6px_rgba(148,163,184,0.5)]" aria-label="Hạng 2" />
  if (idx === 2)
    return <Medal className="size-6 text-amber-500 drop-shadow-[0_0_6px_rgba(217,119,6,0.5)]" aria-label="Hạng 3" />
  return <span className="font-display text-sm font-bold text-text-tertiary w-6 text-center">#{idx + 1}</span>
}

function scoreColor(idx: number) {
  if (idx === 0) return '#eab308'
  if (idx === 1) return '#94a3b8'
  if (idx === 2) return '#d97706'
  return 'var(--brand-cyan, #00f0ff)'
}

function barGradient(idx: number) {
  if (idx === 0) return 'linear-gradient(90deg, #eab308, #fde68a)'
  if (idx === 1) return 'linear-gradient(90deg, #94a3b8, #e2e8f0)'
  if (idx === 2) return 'linear-gradient(90deg, #d97706, #fcd34d)'
  return 'linear-gradient(90deg, #00F0FF, #112E81)'
}

function barGlow(idx: number) {
  if (idx === 0) return '0 0 8px rgba(234,179,8,0.5)'
  if (idx === 1) return '0 0 8px rgba(148,163,184,0.4)'
  if (idx === 2) return '0 0 8px rgba(217,119,6,0.5)'
  return '0 0 8px rgba(0,240,255,0.3)'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const [rankings, setRankings] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [barsVisible, setBarsVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!isMounted) return
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      const ranked = await getLeaderboard()
      if (!isMounted) return

      const sorted = [...ranked].sort((a, b) => Number(b.avg_score || 0) - Number(a.avg_score || 0))
      setRankings(sorted)
      setLoading(false)
      timeoutId = setTimeout(() => {
        if (isMounted) setBarsVisible(true)
      }, 200)
    }
    init()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [router])

  if (loading) return <LoadingScreen text="Đang tải bảng xếp hạng..." />

  const maxScore = rankings[0]?.avg_score || 100

  const medalRowBg = (idx: number) => {
    if (idx === 0) return 'bg-yellow-950/20 border-l-2 border-l-yellow-500/70'
    if (idx === 1) return 'bg-slate-800/15 border-l-2 border-l-slate-400/60'
    if (idx === 2) return 'bg-amber-950/15 border-l-2 border-l-amber-600/60'
    return ''
  }

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-96 rounded-full bg-brand-cyan/5 blur-[150px]" />
      </div>

      {/* Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-8">
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
                <Trophy className="size-5 text-yellow-400 shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC • Chỉ đọc</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Bảng Vinh Danh
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Xếp hạng tổng hợp điểm trung bình từ ban giám khảo
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-cyan/30 bg-brand-cyan/8 text-xs font-medium text-brand-cyan">
              <Star className="size-3.5" />
              {rankings.length} bài đã xếp hạng
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        {rankings.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-overlay p-12 text-center">
            <Trophy className="size-12 text-text-disabled mx-auto mb-3" />
            <p className="text-sm text-text-tertiary font-medium">
              Chưa ghi nhận điểm số đánh giá dự án nào để xếp hạng.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-surface-border bg-surface-overlay overflow-hidden"
            role="list"
            aria-label="Bảng xếp hạng"
          >
            {rankings.map((item, idx) => (
              <div
                key={item.submission_id}
                role="listitem"
                className={`px-6 py-5 border-b border-surface-border last:border-b-0 transition-colors duration-150 hover:bg-surface-raised/30 ${medalRowBg(idx)}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-10 shrink-0 flex justify-center items-center">
                    <RankIcon idx={idx} />
                  </div>

                  {/* Team info + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold text-text-primary truncate">
                          {item.team_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
                          <span className="truncate">{item.phase_title}</span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Users className="size-3" />
                            {item.judge_count} giám khảo
                          </span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0" aria-label={`Điểm trung bình: ${Number(item.avg_score).toFixed(2)}`}>
                        <p className="text-[9px] font-semibold tracking-widest text-text-tertiary uppercase mb-0.5">
                          Điểm TB
                        </p>
                        <p
                          className="text-2xl font-bold font-display tabular-nums leading-none"
                          style={{
                            color: scoreColor(idx),
                            textShadow: barGlow(idx),
                          }}
                        >
                          {Number(item.avg_score).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar — animated */}
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                      role="progressbar"
                      aria-valuenow={Number(item.avg_score)}
                      aria-valuemax={Number(maxScore)}
                      aria-label={`Điểm: ${item.avg_score}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: barsVisible ? `${(Number(item.avg_score) / Number(maxScore)) * 100}%` : '0%',
                          background: barGradient(idx),
                          boxShadow: barGlow(idx),
                          transitionDelay: `${idx * 100}ms`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
