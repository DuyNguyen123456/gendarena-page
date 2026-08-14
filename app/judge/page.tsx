'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Scale, FileText, Pencil, BookOpen, ChevronRight } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getPostLoginPath } from '@/lib/auth/routing'
import { getScoringRounds, type ScoringRound } from '@/services/scoring'
import { getPhases } from '@/services/phases'
import { updateProfileExpertise } from '@/services/profile'
import type { TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORIES, TOPIC_CATEGORY_CONFIG } from '@/types/submission'
import type { CompetitionPhase } from '@/types/phase'
import { getScoringGate } from '@/types/phase'

export default function JudgeHomePage() {
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [expertise, setExpertise] = useState<TopicCategory[]>([])
  const [editingExpertise, setEditingExpertise] = useState(false)
  const [expertiseDraft, setExpertiseDraft] = useState<TopicCategory[]>([])
  const [savingExpertise, setSavingExpertise] = useState(false)
  const [openPhase, setOpenPhase] = useState<CompetitionPhase | null>(null)
  const [activeRound, setActiveRound] = useState<ScoringRound | null>(null)
  const [assignmentCount, setAssignmentCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, expertise')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'judge') {
        router.push(getPostLoginPath(profile?.role))
        return
      }

      setProfileName(profile.full_name ?? 'Giám khảo')
      setJudgeId(user.id)
      const savedExpertise: TopicCategory[] = ((profile.expertise ?? []) as string[]).filter(
        (e): e is TopicCategory => TOPIC_CATEGORIES.includes(e as TopicCategory)
      )
      setExpertise(savedExpertise)

      const [phases, rounds] = await Promise.all([getPhases(), getScoringRounds()])
      const currentOpen = phases.find((p) => getScoringGate(p) === 'open') ?? null
      setOpenPhase(currentOpen)
      setActiveRound(rounds.find((r) => r.rubric_url) ?? rounds[0] ?? null)

      const { count } = await supabase
        .from('judge_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('judge_id', user.id)

      setAssignmentCount(count ?? 0)
      setLoading(false)
    }
    init()
  }, [router, supabase])

  const handleOpenExpertiseEdit = () => {
    setExpertiseDraft([...expertise])
    setEditingExpertise(true)
  }

  const toggleDraft = (cat: TopicCategory) => {
    setExpertiseDraft((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleSaveExpertise = async () => {
    setSavingExpertise(true)
    const result = await updateProfileExpertise(judgeId, expertiseDraft)
    setSavingExpertise(false)
    if (result.ok) {
      setExpertise(expertiseDraft)
      setEditingExpertise(false)
    }
  }

  if (loading) return <Loading text="Đang tải dữ liệu..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent-violet/8 blur-[120px]" />
      </div>

      {/* Page header — internal style */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="brand" size="sm">BGK</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Bảng điều khiển giám khảo
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Xin chào, <span className="text-brand-cyan font-medium">{profileName}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 space-y-6">

        {/* Status + assignment summary */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-6 pt-0">
            <div>
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Trạng thái chấm điểm
              </p>
              {openPhase ? (
                <Badge variant="success" size="md">{openPhase.title} — Đang mở</Badge>
              ) : (
                <Badge variant="warning" size="md">Đang đóng</Badge>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                Bài được phân công
              </p>
              <p className="font-mono text-3xl font-bold text-brand-cyan leading-none">
                {assignmentCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expertise section */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle>Lĩnh vực chuyên môn</CardTitle>
              <CardDescription>
                Giúp BTC phân công bài phù hợp với chuyên môn của bạn
              </CardDescription>
            </div>
            {!editingExpertise && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Pencil />}
                onClick={handleOpenExpertiseEdit}
                className="shrink-0"
              >
                Cập nhật
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingExpertise ? (
              <div className="space-y-2">
                {TOPIC_CATEGORIES.map((cat) => {
                  const cfg = TOPIC_CATEGORY_CONFIG[cat]
                  const isSelected = expertiseDraft.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleDraft(cat)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors duration-[150ms]',
                        isSelected
                          ? cfg.cls
                          : 'border-surface-border bg-surface-base text-text-secondary hover:border-surface-border-strong',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected ? 'bg-current border-current' : 'border-text-tertiary',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {isSelected && <span className="text-[8px] text-surface-base font-bold">✓</span>}
                      </span>
                      {cfg.label}
                    </button>
                  )
                })}
                <div className="flex gap-3 pt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={savingExpertise}
                    onClick={handleSaveExpertise}
                    className="flex-1"
                  >
                    {savingExpertise ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingExpertise(false)}
                  >
                    Huỷ
                  </Button>
                </div>
              </div>
            ) : expertise.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {expertise.map((e) => {
                  const cfg = TOPIC_CATEGORY_CONFIG[e]
                  return (
                    <span
                      key={e}
                      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${cfg.cls}`}
                    >
                      {cfg.label}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary italic">
                Bạn chưa khai báo lĩnh vực chuyên môn. Nhấn &quot;Cập nhật&quot; để chọn.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rubric link */}
        {activeRound?.rubric_url && (
          <a
            href={activeRound.rubric_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-lg border border-surface-border bg-surface-raised p-5 transition-all duration-[250ms] hover:border-surface-border-strong hover:shadow-elevation-2"
          >
            <BookOpen className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold text-brand-cyan group-hover:text-brand-cyan-bright transition-colors">
                Xem barem điểm
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Tài liệu hướng dẫn chấm do BTC cung cấp
              </p>
            </div>
            <ChevronRight className="size-4 text-text-tertiary group-hover:text-brand-cyan shrink-0 transition-colors" aria-hidden="true" />
          </a>
        )}

        {/* Go to scoring */}
        <Button
          variant="primary"
          size="lg"
          asChild
          className="w-full"
        >
          <Link href="/judge/scoring" className="inline-flex items-center justify-center gap-2">
            <span>Chấm điểm bài được phân công</span>
            <FileText className="size-5 shrink-0" aria-hidden="true" />
          </Link>
        </Button>

        <p className="text-xs text-text-tertiary text-center">
          Bạn chỉ thấy các bài BTC đã phân công. Không có quyền xem bảng xếp hạng.
        </p>
      </main>
    </div>
  )
}
