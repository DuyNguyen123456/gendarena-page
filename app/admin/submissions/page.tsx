'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

interface Submission {
  id: string
  title: string
  description: string
  pitch_deck_url?: string
  video_url?: string
  prototype_url?: string
  created_at: string
  teams?: { name: string }
  competitions?: { title: string }
}

interface Score {
  id: string
  submission_id: string
  judge_id: string
  innovation_score: number
  feasibility_score: number
  presentation_score: number
  impact_score: number
  total_score: number
  comment: string
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [message, setMessage] = useState('')
  const [scores, setScores] = useState<Record<string, Score>>({})
  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, teams(name), competitions(title)')
      .order('created_at', { ascending: false })

    const { data: scoresData } = await supabase.from('scores').select('*') as { data: Score[] | null }
    const scoresMap: Record<string, Score> = {}
    scoresData?.forEach((s) => { scoresMap[s.submission_id] = s })

    setSubmissions((subs as unknown as Submission[]) || [])
    setScores(scoresMap)
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null, error: unknown }
      if (!isMounted) return
      if (!['admin', 'judge'].includes(profile?.role ?? '')) { router.push('/dashboard'); return }

      await loadData()
      if (!isMounted) return
      setLoading(false)
    }
    init()
    return () => {
      isMounted = false
    }
  }, [supabase, router, loadData])

  const handleScore = async (e: React.FormEvent<HTMLFormElement>, submissionId: string) => {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)

    const innovation = parseInt(formData.get('innovation') as string)
    const feasibility = parseInt(formData.get('feasibility') as string)
    const presentation = parseInt(formData.get('presentation') as string)
    const impact = parseInt(formData.get('impact') as string)
    const total = (innovation + feasibility + presentation + impact) / 4

    const payload = {
      submission_id: submissionId,
      judge_id: user.id,
      innovation_score: innovation,
      feasibility_score: feasibility,
      presentation_score: presentation,
      impact_score: impact,
      total_score: total,
      comment: formData.get('comment') as string,
    }

    const existing = scores[submissionId]
    const { error } = existing
      ? await supabase.from('scores').update(payload as never).eq('id', existing.id)
      : await supabase.from('scores').insert(payload as never)

    if (error) {
      setMessage('❌ Lỗi: ' + error.message)
    } else {
      setMessage('✅ Đã lưu điểm!')
      setScoringId(null)
      await loadData()
    }
  }

  if (loading) return <Loading text="LOADING SUBMISSIONS RECORD" />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        <Link 
          href="/admin" 
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors uppercase mb-8"
        >
          ← QUAY LẠI PANEL ADMIN
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              📝 BẢNG ĐÁNH GIÁ DỰ ÁN
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              PROJECT EVALUATION TERMINAL // SECURE GRADING
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
            TỔNG SỐ: {submissions.length} BÀI NỘP
          </div>
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="tech-panel p-8 text-center relative border-cyan-500/20 text-slate-400 text-sm font-semibold">
            Chưa nhận được bài nộp dự án nào trên hệ thống.
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((sub) => {
              const score = scores[sub.id]
              return (
                <div key={sub.id} className="tech-panel-glow border-cyan-500/15 p-6 rounded-xl relative hover:border-cyan-400/30 transition duration-200">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-orbitron text-lg font-bold text-white tracking-wide uppercase">{sub.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs font-bold tracking-wider uppercase text-slate-400">
                        <span className="bg-[#131e3d]/60 border border-[#1e2d5a]/60 px-2.5 py-1 rounded">
                          ĐỘI: {sub.teams?.name}
                        </span>
                        <span className="bg-[#131e3d]/60 border border-[#1e2d5a]/60 px-2.5 py-1 rounded">
                          ĐẤU TRƯỜNG: {sub.competitions?.title}
                        </span>
                      </div>
                      <p className="text-slate-350 text-sm leading-relaxed pt-1.5">{sub.description}</p>
                    </div>
                    {score && (
                      <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-center self-start whitespace-nowrap shadow-[0_0_15px_rgba(16,163,74,0.1)]">
                        <div className="text-[9px] font-extrabold tracking-widest font-orbitron uppercase opacity-75 mb-0.5">ĐÃ CHẤM</div>
                        <div className="text-2xl font-extrabold font-orbitron tracking-wider">{score.total_score?.toFixed(1)}</div>
                      </div>
                    )}
                  </div>

                  {/* Attachment links */}
                  <div className="flex flex-wrap gap-3 mb-5 text-xs font-bold tracking-wider font-orbitron uppercase">
                    {sub.pitch_deck_url && (
                      <a 
                        href={sub.pitch_deck_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                      >
                        📄 PITCH DECK
                      </a>
                    )}
                    {sub.video_url && (
                      <a 
                        href={sub.video_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                      >
                        🎥 VIDEO DEMO
                      </a>
                    )}
                    {sub.prototype_url && (
                      <a 
                        href={sub.prototype_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                      >
                        🔗 PROTOTYPE
                      </a>
                    )}
                  </div>

                  {scoringId !== sub.id && (
                    <button
                      onClick={() => setScoringId(sub.id)}
                      className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg cursor-pointer transition ${
                        score 
                          ? 'border border-[#1e2d5a] hover:border-cyan-500 hover:text-cyan-400 bg-transparent text-slate-300' 
                          : 'tech-btn-accent text-black'
                      }`}
                    >
                      {score ? '✏️ CHỈNH SỬA ĐIỂM' : '⚖️ CHẤM ĐIỂM DỰ ÁN'}
                    </button>
                  )}

                  {scoringId === sub.id && (
                    <form onSubmit={(e) => handleScore(e, sub.id)} className="border border-[#1e2d5a] bg-[#070c1e]/70 rounded-xl p-5 mt-4 space-y-4">
                      <h4 className="font-orbitron text-xs font-bold tracking-wider text-cyan-400 uppercase">
                        BẢNG ĐÁNH GIÁ CHI TIẾT (0-10 Điểm mỗi tiêu chí)
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { name: 'innovation', label: '💡 Sáng tạo', default: score?.innovation_score },
                          { name: 'feasibility', label: '🛠️ Khả thi', default: score?.feasibility_score },
                          { name: 'presentation', label: '🎤 Trình bày', default: score?.presentation_score },
                          { name: 'impact', label: '🌍 Tác động', default: score?.impact_score },
                        ].map((field) => (
                          <div key={field.name}>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">{field.label}</label>
                            <input 
                              name={field.name} 
                              type="number" 
                              min="0" 
                              max="10" 
                              required 
                              defaultValue={field.default ?? ''}
                              className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white focus:outline-none focus:border-cyan-400 transition" 
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">Nhận xét chi tiết của giám khảo</label>
                        <textarea 
                          name="comment" 
                          rows={2} 
                          defaultValue={score?.comment || ''}
                          placeholder="Nêu rõ ưu nhược điểm kỹ thuật..."
                          className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition resize-none text-sm" 
                        />
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button 
                          type="submit"
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-wider uppercase rounded-lg cursor-pointer transition shadow-[0_0_10px_rgba(16,163,74,0.2)]"
                        >
                          💾 LƯU ĐIỂM HỆ THỐNG
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setScoringId(null)}
                          className="px-5 py-2 border border-[#1e2d5a] hover:bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer transition"
                        >
                          HUỶ
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