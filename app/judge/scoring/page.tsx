'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
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

export default function JudgeScoringPage() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<AssignedSubmission[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [rounds, setRounds] = useState<ScoringRound[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [savingSubId, setSavingSubId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
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
    const phaseGate = sub?.competition_phases ? getScoringGate(sub.competition_phases) : (currentRound ? getScoringGate(currentRound) : 'closed')

    if (!userId || !currentRound || phaseGate !== 'open') {
      setMessage('❌ Vòng chấm cho bài nộp này hiện không mở do Ban tổ chức cấu hình.')
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
      setMessage('❌ ' + result.error)
    } else {
      setMessage('✅ Đã lưu điểm!')
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
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      <div className="max-w-4xl mx-auto relative z-10">
        <Link
          href="/judge"
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-purple-400 hover:text-purple-300 uppercase mb-8"
        >
          ← QUAY LẠI PANEL GIÁM KHẢO
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl font-extrabold tracking-wider uppercase">📝 CHẤM ĐIỂM</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              Thời gian chấm điểm do BTC quản lý theo từng vòng thi
            </p>
          </div>
          {currentRound?.rubric_url && (
            <a
              href={currentRound.rubric_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-orbitron border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-950/30"
            >
              📋 BAREM ĐIỂM
            </a>
          )}
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm">{message}</div>
        )}

        {rounds.length > 0 && (
          <div className="tech-panel p-4 mb-6 border-cyan-500/30 text-white">
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Vòng chấm hiện tại</label>
            <select
              value={selectedRoundId ?? ''}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="w-full bg-slate-950/80 border border-[#1e2d5a] rounded px-3 py-2 text-sm text-white"
            >
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>{round.title}</option>
              ))}
            </select>
          </div>
        )}

        {!currentRound && (
          <div className="tech-panel p-6 mb-6 border-amber-500/30 text-amber-400 text-sm">
            Hiện không có vòng chấm nào để chấm. Vui lòng chờ BTC cập nhật vòng.
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="tech-panel p-8 text-center text-slate-400 text-sm">
            Chưa có bài nào được BTC phân công cho bạn.
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub) => {
              const score = scores[sub.id]
              const phaseGate = sub.competition_phases ? getScoringGate(sub.competition_phases) : (currentRound ? getScoringGate(currentRound) : 'closed')
              const isPhaseScoringOpen = phaseGate === 'open'

              return (
                <div key={sub.id} className="tech-panel-glow p-6 rounded-xl border-cyan-500/15">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-orbitron text-lg font-bold uppercase">
                        {sub.teams?.name ?? 'Đội'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Giai đoạn: {sub.competition_phases?.title ?? '—'} •{' '}
                        {sub.submission_kind === 'file' ? `📄 ${sub.file_name}` : '🔗 Link nộp'}
                      </p>
                      <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-xs font-semibold text-cyan-300">
                        <span>🏷️ Chủ đề:</span>
                        <span>{sub.topic ?? 'Chưa chọn chủ đề'}</span>
                      </div>
                    </div>
                    {score && (
                      <div className="text-emerald-400 font-orbitron text-2xl font-bold">
                        {score.total_score?.toFixed(1)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openAttachment(sub)}
                    className="text-xs font-orbitron border border-[#1e2d5a] text-cyan-400 px-3 py-2 rounded-lg mb-4 hover:border-cyan-400 mr-3"
                  >
                    {sub.submission_kind === 'file' ? '📄 XEM FILE' : '🔗 MỞ LINK BÀI NỘP'}
                  </button>

                  {isPhaseScoringOpen && scoringId !== sub.id && (
                    <button
                      onClick={() => setScoringId(sub.id)}
                      className="tech-btn-accent px-4 py-2 text-xs font-bold uppercase rounded-lg text-black"
                    >
                      {score ? '✏️ SỬA ĐIỂM' : '⚖️ CHẤM ĐIỂM'}
                    </button>
                  )}

                  {!isPhaseScoringOpen && (
                    <span className="inline-block px-3 py-1 bg-amber-950/20 border border-amber-500/30 text-amber-400 text-xs rounded-lg font-orbitron">
                      🔒 CHẤM ĐIỂM ĐÃ ĐÓNG
                    </span>
                  )}

                  {scoringId === sub.id && isPhaseScoringOpen && (
                    <form onSubmit={(e) => handleScore(e, sub.id)} className="border border-[#1e2d5a] rounded-xl p-5 mt-4 space-y-4">
                      <div className="space-y-4">
                        <div className="text-sm text-slate-300">
                          <div className="font-bold uppercase tracking-wider text-slate-100">Vòng chấm:</div>
                          <div>{currentRound?.title ?? 'Không có vòng chấm được chọn'}</div>
                          {currentRound?.description && <div className="text-xs text-slate-500">{currentRound.description}</div>}
                        </div>

                        {currentRound?.criteria.length ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentRound.criteria.map((criterion) => (
                              <div key={criterion.id} className="space-y-2">
                                <label className="block text-[10px] uppercase text-slate-400 tracking-widest">
                                  {criterion.name} • Weight: {criterion.weight}% • Max: {criterion.max_score}
                                </label>
                                <input
                                  name={`criterion_${criterion.id}`}
                                  type="number"
                                  min="0"
                                  max={criterion.max_score}
                                  step="0.5"
                                  required
                                  defaultValue={score?.criteria_scores?.[criterion.id] ?? ''}
                                  className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg bg-slate-950/70 border border-[#1e2d5a] text-slate-300 text-sm">
                            Hiện tại vòng chấm không có tiêu chí nào. Vui lòng liên hệ BTC.
                          </div>
                        )}
                      </div>

                      <textarea
                        name="comment"
                        rows={2}
                        defaultValue={score?.comment ?? ''}
                        placeholder="Nhận xét..."
                        className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white text-sm"
                      />
                      <div className="flex gap-3 flex-wrap">
                        <button
                          type="submit"
                          disabled={savingSubId === sub.id}
                          className="px-5 py-2 bg-emerald-600 rounded-lg text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50"
                        >
                          {savingSubId === sub.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                              Đang lưu...
                            </>
                          ) : (
                            '💾 Lưu điểm'
                          )}
                        </button>
                        <button type="button" onClick={() => setScoringId(null)} className="px-5 py-2 border border-[#1e2d5a] text-xs uppercase">
                          Huỷ
                        </button>
                      </div>
                    </form>
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
