'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import {
  getScoringRounds,
  createOrUpdateScoringRound,
  saveScoringCriterion,
  deleteScoringCriterion,
  getJudges,
  getAllSubmissionsForAssign,
  assignJudgeToSubmission,
  getAssignments,
  removeAssignment,
  type ScoringRound,
} from '@/services/scoring'

export default function AdminScoringPage() {
  const [loading, setLoading] = useState(true)
  const [rounds, setRounds] = useState<ScoringRound[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [newRoundTitle, setNewRoundTitle] = useState('')
  const [newRoundDescription, setNewRoundDescription] = useState('')
  const [newCriterionName, setNewCriterionName] = useState('')
  const [newCriterionWeight, setNewCriterionWeight] = useState(0)
  const [newCriterionMaxScore, setNewCriterionMaxScore] = useState(10)
  const [judges, setJudges] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [submissions, setSubmissions] = useState<{ id: string; label: string }[]>([])
  const [assignments, setAssignments] = useState<
    { id: string; judge_id: string; submission_id: string; judge?: { full_name: string }; submission_label?: string }[]
  >([])
  const [selectedJudge, setSelectedJudge] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState('')
  const [roundOpen, setRoundOpen] = useState(false)
  const [roundRubricUrl, setRoundRubricUrl] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadAll = useCallback(async () => {
    const [roundsData, judgeList, subList, assignList] = await Promise.all([
      getScoringRounds(),
      getJudges(),
      getAllSubmissionsForAssign(),
      getAssignments(),
    ])
    setRounds(roundsData)
    setJudges(judgeList)
    setSubmissions(subList)
    setAssignments(assignList)
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

  const handleAssign = async () => {
    if (!userId || !selectedJudge || !selectedSubmission) return
    const result = await assignJudgeToSubmission(selectedJudge, selectedSubmission, userId)
    if (!result.ok) setMessage('❌ ' + result.error)
    else {
      setMessage('✅ Đã phân công bài chấm')
      setSelectedJudge('')
      setSelectedSubmission('')
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

  const selectedRound = rounds.find((round) => round.id === selectedRoundId)
  const totalRoundWeight = selectedRound?.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) ?? 0

  const handleCreateRound = async () => {
    if (!userId) return
    if (!newRoundTitle.trim()) {
      setMessage('❌ Vui lòng nhập tên vòng.')
      return
    }

    const result = await createOrUpdateScoringRound({
      title: newRoundTitle.trim(),
      description: newRoundDescription.trim() || null,
      sort_order: rounds.length,
      is_active: true,
    })

    if (!result.ok) {
      setMessage('❌ ' + result.error)
      return
    }

    setMessage('✅ Đã tạo vòng chấm mới')
    setNewRoundTitle('')
    setNewRoundDescription('')
    await loadAll()
    setSelectedRoundId(result.id)
  }

  const handleAddCriterion = async () => {
    if (!userId || !selectedRoundId) return
    if (!newCriterionName.trim()) {
      setMessage('❌ Vui lòng nhập tên tiêu chí.')
      return
    }
    if (newCriterionWeight <= 0 || newCriterionWeight > 100) {
      setMessage('❌ Trọng số phải lớn hơn 0 và không quá 100.')
      return
    }

    const result = await saveScoringCriterion({
      round_id: selectedRoundId,
      name: newCriterionName.trim(),
      weight: newCriterionWeight,
      max_score: newCriterionMaxScore,
      sort_order: selectedRound?.criteria.length ?? 0,
    })

    if (!result.ok) {
      setMessage('❌ ' + result.error)
      return
    }

    setMessage('✅ Đã thêm tiêu chí')
    setNewCriterionName('')
    setNewCriterionWeight(0)
    setNewCriterionMaxScore(10)
    await loadAll()
  }

  const handleDeleteCriterion = async (criterionId: string) => {
    const result = await deleteScoringCriterion(criterionId)
    if (!result.ok) {
      setMessage('❌ ' + result.error)
      return
    }
    setMessage('✅ Đã xoá tiêu chí')
    await loadAll()
  }

  const handleSaveRoundSettings = async () => {
    if (!userId || !selectedRound) return

    const result = await createOrUpdateScoringRound({
      id: selectedRound.id,
      phase_id: selectedRound.phase_id,
      title: selectedRound.title,
      description: selectedRound.description,
      rubric_url: roundRubricUrl.trim() || null,
      scoring_open: roundOpen,
      sort_order: selectedRound.sort_order,
      is_active: selectedRound.is_active,
    })

    if (!result.ok) {
      setMessage('❌ ' + result.error)
      return
    }
    setMessage('✅ Đã cập nhật vòng chấm')
    await loadAll()
  }

  if (loading) return <Loading text="LOADING SCORING CONFIG" />

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-xs font-orbitron text-red-400 uppercase mb-8 inline-block">
          ← QUAY LẠI PANEL ADMIN
        </Link>

        <h1 className="font-orbitron text-2xl font-extrabold uppercase mb-8">⚙️ CẤU HÌNH CHẤM ĐIỂM</h1>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm">{message}</div>
        )}

        <div className="tech-panel p-6 mb-8 space-y-4">
          <h2 className="font-orbitron text-sm font-bold text-cyan-400 uppercase">Quản lý vòng chấm</h2>
          <p className="text-sm text-slate-400">Mỗi vòng có URL barem và trạng thái mở/chưa mở độc lập. Chọn vòng để chỉnh sửa.</p>
        </div>

        {selectedRound && (
          <div className="tech-panel p-6 mb-8 space-y-4">
            <h2 className="font-orbitron text-sm font-bold text-cyan-400 uppercase">Cài đặt vòng được chọn</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundOpen}
                  onChange={(e) => setRoundOpen(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold">Mở vòng chấm</span>
              </label>
              <div />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">URL barem điểm (PDF/link)</label>
              <input
                type="url"
                value={roundRubricUrl}
                onChange={(e) => setRoundRubricUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveRoundSettings}
              className="tech-btn-accent px-6 py-2 rounded-lg text-xs font-bold uppercase text-black"
            >
              💾 Lưu cài đặt vòng
            </button>
          </div>
        )}

        <div className="tech-panel p-6 mb-8 space-y-4">
          <h2 className="font-orbitron text-sm font-bold text-cyan-400 uppercase">Cấu hình vòng và tiêu chí chấm</h2>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={newRoundTitle}
                  onChange={(e) => setNewRoundTitle(e.target.value)}
                  placeholder="Tên vòng"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
                />
                <input
                  value={newRoundDescription}
                  onChange={(e) => setNewRoundDescription(e.target.value)}
                  placeholder="Mô tả vòng"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateRound}
                className="px-5 py-2 bg-cyan-600 rounded-lg text-xs font-bold uppercase"
              >
                ➕ Tạo vòng mới
              </button>

              {rounds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs uppercase tracking-widest text-slate-400">Chọn vòng hiện tại</label>
                    <span className="text-[10px] uppercase text-slate-500">Tổng trọng số: {totalRoundWeight}%</span>
                  </div>
                  <select
                    value={selectedRoundId ?? ''}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
                  >
                    {rounds.map((round) => (
                      <option key={round.id} value={round.id}>{round.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={newCriterionName}
                  onChange={(e) => setNewCriterionName(e.target.value)}
                  placeholder="Tên tiêu chí"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
                />
                <input
                  value={newCriterionWeight}
                  onChange={(e) => setNewCriterionWeight(Number(e.target.value))}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="Trọng số"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
                />
              </div>
              <input
                value={newCriterionMaxScore}
                onChange={(e) => setNewCriterionMaxScore(Number(e.target.value))}
                type="number"
                min={1}
                step={1}
                placeholder="Điểm tối đa"
                className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
              />
              <button
                type="button"
                onClick={handleAddCriterion}
                disabled={!selectedRoundId}
                className="w-full px-5 py-2 bg-emerald-600 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
              >
                ➕ Thêm tiêu chí
              </button>
            </div>
          </div>

          {selectedRound && (
            <div className="mt-4 rounded-xl border border-[#1e2d5a] bg-slate-950/40 p-4">
              <h3 className="text-sm font-bold uppercase text-cyan-300 mb-3">Tiêu chí của vòng: {selectedRound.title}</h3>
              {selectedRound.criteria.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có tiêu chí nào cho vòng này.</p>
              ) : (
                <div className="space-y-3">
                  {selectedRound.criteria.map((criterion) => (
                    <div key={criterion.id} className="flex flex-col gap-2 rounded-lg border border-[#1e2d5a] p-3 bg-[#0e1428]/70">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{criterion.name}</p>
                          <p className="text-xs text-slate-400">Trọng số: {criterion.weight}% • Điểm tối đa: {criterion.max_score}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCriterion(criterion.id)}
                          className="text-red-400 text-xs uppercase font-bold hover:text-red-300"
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tech-panel p-6 mb-8 space-y-4">
          <h2 className="font-orbitron text-sm font-bold text-cyan-400 uppercase">Phân công BGK ↔ Bài nộp</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <select
              value={selectedJudge}
              onChange={(e) => setSelectedJudge(e.target.value)}
              className="bg-slate-950/60 border border-[#1e2d5a] rounded px-3 py-2 text-sm"
            >
              <option value="">Chọn giám khảo</option>
              {judges.map((j) => (
                <option key={j.id} value={j.id}>{j.full_name} ({j.email})</option>
              ))}
            </select>
            <select
              value={selectedSubmission}
              onChange={(e) => setSelectedSubmission(e.target.value)}
              className="bg-slate-950/60 border border-[#1e2d5a] rounded px-3 py-2 text-sm"
            >
              <option value="">Chọn bài nộp</option>
              {submissions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedJudge || !selectedSubmission}
            className="px-5 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
          >
            ➕ Phân công
          </button>

          {assignments.length > 0 && (
            <div className="mt-4 space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex justify-between items-center bg-[#131e3d]/40 border border-[#1e2d5a] rounded px-4 py-3 text-sm">
                  <span>
                    <strong className="text-white">{a.judge?.full_name}</strong>
                    <span className="text-slate-500 mx-2">→</span>
                    {a.submission_label ?? a.submission_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(a.id)}
                    className="text-red-400 text-xs font-bold uppercase hover:text-red-300"
                  >
                    Xoá
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
