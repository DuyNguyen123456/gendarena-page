'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import { getPostLoginPath } from '@/lib/auth/routing'
import { getScoringRounds, type ScoringRound } from '@/services/scoring'

export default function JudgeHomePage() {
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState('')
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
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'judge') {
        router.push(getPostLoginPath(profile?.role))
        return
      }

      setProfileName(profile.full_name ?? 'Giám khảo')

      const rounds = await getScoringRounds()
      setActiveRound(rounds.find((round) => round.scoring_open) ?? null)

      const { count } = await supabase
        .from('judge_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('judge_id', user.id)

      setAssignmentCount(count ?? 0)
      setLoading(false)
    }
    init()
  }, [router, supabase])

  if (loading) return <Loading text="Đang tải dữ liệu..." />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      <div className="absolute top-10 left-10 w-80 h-80 bg-purple-900/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-8 border-b border-[#1e2d5a] pb-6">
          <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider uppercase">
            ⚖️ BẢNG ĐIỀU KHIỂN GIÁM KHẢO
          </h1>
        </div>

        <div className="grid gap-6 mb-8">
          <div className="tech-panel p-6 border-purple-500/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-orbitron tracking-widest text-slate-500 uppercase mb-1">Trạng thái chấm điểm</p>
                <p className={`font-orbitron text-lg font-bold ${activeRound?.scoring_open ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {activeRound?.scoring_open ? '🟢 ĐANG MỞ' : '🔒 ĐANG ĐÓNG'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-orbitron tracking-widest text-slate-500 uppercase mb-1">Bài được phân công</p>
                <p className="font-orbitron text-2xl font-bold text-cyan-400">{assignmentCount}</p>
              </div>
            </div>
          </div>

          {activeRound?.rubric_url && (
            <a
              href={activeRound.rubric_url}
              target="_blank"
              rel="noopener noreferrer"
              className="tech-panel p-6 border-cyan-500/30 hover:border-cyan-400/50 transition flex items-center gap-4 group"
            >
              <span className="text-3xl">📋</span>
              <div>
                <p className="font-orbitron text-sm font-bold text-cyan-400 group-hover:text-cyan-300 uppercase tracking-wider">
                  Xem barem điểm
                </p>
                <p className="text-xs text-slate-400 mt-1">Tài liệu hướng dẫn chấm do BTC cung cấp</p>
              </div>
            </a>
          )}

          <Link
            href="/judge/scoring"
            className="tech-btn-accent font-orbitron block text-center py-4 rounded-lg text-sm font-bold tracking-widest uppercase text-black"
          >
            ⚖️ CHẤM ĐIỂM BÀI ĐƯỢC PHÂN CÔNG
          </Link>
        </div>

        <p className="text-xs text-slate-500 text-center font-semibold">
          Bạn chỉ thấy các bài BTC đã phân công. Không có quyền xem bảng xếp hạng.
        </p>
      </div>
    </div>
  )
}
