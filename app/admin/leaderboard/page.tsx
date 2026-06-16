'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Submission {
  id: string
  title: string
  avg_score: number | null
  judge_count: number
  teams?: { name: string }
  competitions?: { title: string }
}

interface Score {
  submission_id: string
  total_score: number
}

export default function Leaderboard() {
  const [rankings, setRankings] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!['admin', 'judge'].includes(profile?.role)) { router.push('/dashboard'); return }

      const { data: subs } = await supabase
        .from('submissions')
        .select('*, teams(name), competitions(title)')

      const { data: scoresData } = await supabase.from('scores').select('*')

      const ranked = (subs || []).map((sub: Submission) => {
        const subScores = (scoresData as Score[] || []).filter((s: Score) => s.submission_id === sub.id)
        const avgScore = subScores.length > 0
          ? subScores.reduce((sum: number, s: Score) => sum + (s.total_score || 0), 0) / subScores.length
          : null
        return { ...sub, avg_score: avgScore, judge_count: subScores.length }
      })
      .filter((s: Submission) => s.avg_score !== null)
      .sort((a: Submission, b: Submission) => (b.avg_score || 0) - (a.avg_score || 0))

      setRankings(ranked)
      setLoading(false)
    }
    init()
  }, [router])

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `#${idx + 1}`
  }

  if (loading) return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center font-orbitron tracking-widest">
      <p className="animate-pulse">⏳ LOADING LEADERBOARD DATABASES...</p>
    </div>
  )

  const getRowClass = (idx: number) => {
    let base = "flex items-center px-6 py-5 border-b border-[#1e2d5a]/45 relative transition "
    if (idx === 0) return base + "bg-amber-950/20 border-l-4 border-l-yellow-500 shadow-[inset_4px_0_0_#eab308]"
    if (idx === 1) return base + "bg-slate-800/20 border-l-4 border-l-slate-400 shadow-[inset_4px_0_0_#94a3b8]"
    if (idx === 2) return base + "bg-amber-950/10 border-l-4 border-l-amber-600 shadow-[inset_4px_0_0_#d97706]"
    return base + "hover:bg-cyan-950/5"
  }

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
              🏅 BẢNG VINH DANH ĐẤU TRƯỜNG
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              ARENA LEADERBOARD // HONOR ROLL
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
            ĐÃ XẾP HẠNG: {rankings.length} LIÊN MINH
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="tech-panel p-8 text-center relative border-cyan-500/20 text-slate-400 text-sm font-semibold">
            Chưa ghi nhận điểm số đánh giá dự án nào để xếp hạng.
          </div>
        ) : (
          <div className="tech-panel border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden divide-y divide-[#1e2d5a]/45">
            {rankings.map((item, idx) => (
              <div key={item.id} className={getRowClass(idx)}>
                <div className="w-16 font-orbitron text-2xl font-extrabold text-center text-slate-400 mr-4">
                  {getMedal(idx)}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-orbitron text-base font-bold text-white tracking-wide uppercase truncate mb-1">{item.title}</h3>
                  <div className="text-xs text-slate-400 font-semibold truncate">
                    Đội: <strong className="text-slate-350">{item.teams?.name}</strong> · Đấu trường: {item.competitions?.title} · {item.judge_count} Giám khảo chấm
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-[9px] font-extrabold tracking-widest font-orbitron text-slate-450 uppercase mb-0.5">ĐIỂM TB</div>
                  <div className="text-2.5xl font-extrabold font-orbitron tracking-widest text-emerald-450">{item.avg_score?.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}