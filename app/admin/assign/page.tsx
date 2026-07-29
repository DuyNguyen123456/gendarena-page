'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import {
  getJudges,
  getAssignments,
  assignJudgeToSubmission,
  removeAssignment,
} from '@/services/scoring'
import { getAllSubmissionsForAdmin } from '@/services/submissions'
import type { AdminSubmissionRow, TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORY_CONFIG, TOPIC_CATEGORIES } from '@/types/submission'

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
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-bold tracking-wide bg-slate-900 border-slate-600/40 text-slate-500">
        Chưa chọn chủ đề
      </span>
    )
  }
  const cfg = TOPIC_CATEGORY_CONFIG[topic as TopicCategory]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-bold tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Expertise Badges (for a judge) ──────────────────────────────────────────

function ExpertiseBadges({ expertise }: { expertise?: string[] | null }) {
  if (!expertise?.length) {
    return <span className="text-[9px] text-slate-600 italic">Chưa khai báo lĩnh vực</span>
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {expertise.map((e) => {
        const cfg = TOPIC_CATEGORY_CONFIG[e as TopicCategory]
        if (!cfg) return null
        return (
          <span key={e} className={`inline-flex items-center px-1.5 py-px rounded border text-[8px] font-bold ${cfg.cls}`}>
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
  const [message, setMessage] = useState('')
  const [assigningMap, setAssigningMap] = useState<Record<string, string>>({})
  // Filter state
  const [filterTopic, setFilterTopic] = useState<TopicCategory | ''>('')
  const router = useRouter()
  const supabase = createClient()

  const loadAll = useCallback(async () => {
    const [judgeList, assignList, subs] = await Promise.all([
      // Fetch judges with their expertise field
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
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

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
      setMessage('❌ ' + result.error)
    } else {
      setMessage('✅ Phân công giám khảo thành công!')
      setAssigningMap((prev) => ({ ...prev, [submissionId]: '' }))
      await loadAll()
    }
  }

  const handleRemove = async (assignmentId: string, submissionId?: string) => {
    const result = await removeAssignment(assignmentId, submissionId)
    if (!result.ok) {
      setMessage('❌ ' + result.error)
      return
    }
    setMessage('✅ Đã xoá phân công giám khảo')
    await loadAll()
  }

  // Map 1 assignment per submission ID
  const assignmentBySub = assignments.reduce<Record<string, AssignmentRow>>((acc, row) => {
    acc[row.submission_id] = row
    return acc
  }, {})

  if (loading) return <Loading text="LOADING ASSIGNMENT SYSTEM" />

  // Filter by topic if set
  const filteredSubs = filterTopic
    ? submissions.filter(s => s.topic === filterTopic)
    : submissions

  const unassignedCount = filteredSubs.filter((s) => !assignmentBySub[s.id] && !s.assigned_judge).length
  const assignedCount = filteredSubs.length - unassignedCount

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-xs font-orbitron text-red-400 uppercase mb-8 inline-block hover:text-red-300 transition">
          ← QUAY LẠI PANEL ADMIN
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl font-extrabold uppercase">👥 PHÂN CÔNG GIÁM KHẢO</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
              Mỗi bài dự thi được phân công duy nhất 1 giám khảo chấm điểm
            </p>
          </div>
          <div className="flex gap-2 text-xs font-orbitron">
            <span className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-400">
              CHỜ PHÂN CÔNG: {unassignedCount}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">
              ĐÃ PHÂN CÔNG: {assignedCount}
            </span>
          </div>
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm">
            {message}
          </div>
        )}

        {/* Topic Filter */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-orbitron text-slate-500 uppercase tracking-widest">Lọc theo chủ đề:</span>
          <button
            type="button"
            onClick={() => setFilterTopic('')}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold font-orbitron uppercase transition ${
              !filterTopic ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400' : 'bg-transparent border-[#1e2d5a] text-slate-500 hover:border-cyan-500/30'
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
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition ${
                  filterTopic === cat ? `${cfg.cls} opacity-100` : `${cfg.cls} opacity-40 hover:opacity-70`
                }`}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>

        {filteredSubs.length === 0 ? (
          <div className="tech-panel p-8 text-center text-slate-400 text-sm">
            {submissions.length === 0
              ? 'Chưa có bài nộp nào trong hệ thống.'
              : 'Không có bài nộp nào với chủ đề đã chọn.'}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSubs.map((sub) => {
              const currentAssign = assignmentBySub[sub.id]
              const assignedJudgeName = currentAssign?.judge?.full_name || sub.assigned_judge?.full_name
              const assignedJudgeId = currentAssign?.judge_id || sub.assigned_judge?.judge_id
              const assignmentId = currentAssign?.id || sub.assigned_judge?.id
              const isAssigned = !!assignedJudgeId

              return (
                <div
                  key={sub.id}
                  className={`tech-panel p-6 rounded-xl border transition ${
                    isAssigned ? 'border-emerald-500/30 bg-slate-950/30' : 'border-amber-500/30 bg-amber-950/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-orbitron text-lg font-bold uppercase text-white">
                          {sub.teams?.name ?? 'Đội thi'}
                        </h3>
                        <span
                          className={`text-[10px] font-bold font-orbitron px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                            isAssigned
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                              : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                          }`}
                        >
                          {isAssigned ? '🟢 ĐÃ PHÂN CÔNG' : '🔴 CHỜ PHÂN CÔNG'}
                        </span>
                        <TopicBadge topic={sub.topic} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Vòng: <span className="text-white font-semibold">{sub.competition_phases?.title ?? '—'}</span> • Nộp lúc: {new Date(sub.uploaded_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {/* Current Assigned Judge Status */}
                  <div className="mb-4 p-4 bg-slate-950/60 border border-[#1e2d5a] rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Giám khảo đảm nhận (Tối đa 1)
                    </p>
                    {isAssigned ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                          <span>👤</span> {assignedJudgeName ?? 'Giám khảo'}
                        </span>
                        <button
                          type="button"
                          onClick={() => assignmentId && handleRemove(assignmentId, sub.id)}
                          className="px-3 py-1 bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900/60 rounded text-xs font-bold uppercase transition cursor-pointer"
                        >
                          ✕ Hủy phân công
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400/90 italic">
                        Bài dự thi này chưa được phân công giám khảo.
                      </p>
                    )}
                  </div>

                  {/* Assign/Reassign Select Form */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 pt-2 border-t border-[#1e2d5a]/40">
                    <div className="flex-1">
                      <select
                        value={assigningMap[sub.id] || (currentAssign?.judge_id ?? '')}
                        onChange={(e) =>
                          setAssigningMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        className="w-full bg-slate-950/90 border border-[#1e2d5a] focus:border-cyan-400 rounded px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="" disabled>-- Chọn giám khảo --</option>
                        {judges.map((j) => {
                          // Check if judge's expertise matches submission topic
                          const isMatch = sub.topic && j.expertise?.includes(sub.topic)
                          return (
                            <option key={j.id} value={j.id}>
                              {isMatch ? '⭐ ' : ''}{j.full_name} ({j.email}){j.expertise?.length ? ` — ${j.expertise.join(', ')}` : ''}
                            </option>
                          )
                        })}
                      </select>
                      {/* Show expertise badges for selected judge */}
                      {(assigningMap[sub.id] || currentAssign?.judge_id) && (() => {
                        const selId = assigningMap[sub.id] || currentAssign?.judge_id
                        const selJudge = judges.find(j => j.id === selId)
                        if (!selJudge) return null
                        return (
                          <div className="mt-2">
                            <p className="text-[9px] text-slate-500 font-orbitron uppercase tracking-widest mb-1">Lĩnh vực chuyên môn:</p>
                            <ExpertiseBadges expertise={selJudge.expertise} />
                          </div>
                        )
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssign(sub.id)}
                      disabled={!assigningMap[sub.id] || assigningMap[sub.id] === currentAssign?.judge_id}
                      className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold font-orbitron uppercase tracking-wider transition cursor-pointer self-start"
                    >
                      {isAssigned ? '🔄 ĐỔI GIÁM KHẢO' : '⚡ PHÂN CÔNG'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
