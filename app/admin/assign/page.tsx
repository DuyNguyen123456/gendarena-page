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

type SubmissionRow = {
  id: string
  uploaded_at: string
  teams?: { name: string } | null
  competition_phases?: { title: string } | null
}

type JudgeRow = {
  id: string
  full_name: string
  email: string
}

type AssignmentRow = {
  id: string
  judge_id: string
  submission_id: string
  judge?: { full_name: string }
}

export default function AdminAssignPage() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [judges, setJudges] = useState<JudgeRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [assigningMap, setAssigningMap] = useState<Record<string, string>>({})
  const router = useRouter()
  const supabase = createClient()

  const loadAll = useCallback(async () => {
    const [judgeList, assignList, { data: subData }] = await Promise.all([
      getJudges(),
      getAssignments() as Promise<AssignmentRow[]>,
      supabase
        .from('submissions')
        .select('id, uploaded_at, teams(name), competition_phases(title)')
        .order('uploaded_at', { ascending: false }),
    ])
    setJudges(judgeList)
    setAssignments(assignList)
    setSubmissions((subData as unknown as SubmissionRow[]) || [])
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
      setMessage('✅ Phân công thành công')
      setAssigningMap((prev) => ({ ...prev, [submissionId]: '' }))
      await loadAll()
    }
  }

  const handleRemove = async (assignmentId: string) => {
    const result = await removeAssignment(assignmentId)
    if (!result.ok) {
      setMessage('❌ ' + result.error)
      return
    }
    setMessage('✅ Đã xoá phân công')
    await loadAll()
  }

  // Group assignments by submission ID
  const assignmentsBySub = assignments.reduce<Record<string, AssignmentRow[]>>((acc, row) => {
    acc[row.submission_id] = acc[row.submission_id] || []
    acc[row.submission_id].push(row)
    return acc
  }, {})

  if (loading) return <Loading text="LOADING ASSIGNMENT SYSTEM" />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-xs font-orbitron text-red-400 uppercase mb-8 inline-block">
          ← QUAY LẠI PANEL ADMIN
        </Link>

        <div className="flex justify-between items-center mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl font-extrabold uppercase">👥 PHÂN CÔNG GIÁM KHẢO</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase">Gán giám khảo chấm điểm cho từng bài nộp</p>
          </div>
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm">
            {message}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="tech-panel p-8 text-center text-slate-400 text-sm">
            Chưa có bài nộp nào trong hệ thống.
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub) => {
              const currentAssigns = assignmentsBySub[sub.id] || []
              const assignedJudgeIds = new Set(currentAssigns.map((a) => a.judge_id))
              // Judges that are not yet assigned to this submission
              const availableJudges = judges.filter((j) => !assignedJudgeIds.has(j.id))

              return (
                <div key={sub.id} className="tech-panel p-6 rounded-xl border border-[#1e2d5a]/60 bg-slate-950/20">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="font-orbitron text-lg font-bold uppercase text-white">
                        {sub.teams?.name ?? 'Đội thi'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Giai đoạn: {sub.competition_phases?.title ?? '—'} • Nộp lúc: {new Date(sub.uploaded_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Judges List */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Giám khảo đã phân công ({currentAssigns.length})
                    </p>
                    {currentAssigns.length === 0 ? (
                      <p className="text-xs text-amber-400/80 italic">Chưa phân công giám khảo nào cho bài này.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {currentAssigns.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#131e3d] border border-[#1e2d5a] rounded-lg text-xs"
                          >
                            <span>👤 {a.judge?.full_name ?? 'Giám khảo'}</span>
                            <button
                              type="button"
                              onClick={() => handleRemove(a.id)}
                              className="text-red-400 hover:text-red-300 font-bold ml-1"
                              title="Xoá phân công"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assign new Judge Form */}
                  {availableJudges.length > 0 ? (
                    <div className="flex items-center gap-3 max-w-md pt-2 border-t border-[#1e2d5a]/40">
                      <select
                        value={assigningMap[sub.id] || ''}
                        onChange={(e) =>
                          setAssigningMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        className="bg-slate-950/80 border border-[#1e2d5a] rounded px-3 py-2 text-xs text-white flex-1"
                      >
                        <option value="">Chọn giám khảo để thêm...</option>
                        {availableJudges.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.full_name} ({j.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssign(sub.id)}
                        disabled={!assigningMap[sub.id]}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase transition"
                      >
                        Phân công
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-2 border-t border-[#1e2d5a]/40">
                      Tất cả giám khảo đều đã được phân công cho bài này.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
