'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Competition = {
  id: string
  title: string
  description: string
  rules?: string | null
  prizes?: string | null
  status: string
  registration_start?: string | null
  registration_end?: string | null
  submission_start?: string | null
  submission_end?: string | null
}

type User = {
  id: string
}

export default function CompetitionDetailPage() {
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const params = useParams()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', params.id as string)
        .single()
      if (!isMounted) return
      setCompetition(data)
      setLoading(false)
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [params.id, router, supabase])

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setMessage('❌ Người dùng chưa đăng nhập.')
      return
    }

    setSubmitLoading(true)
    setMessage('')

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert([
        {
          name: teamName,
          description: teamDesc,
          competition_id: params.id as string,
          leader_id: user.id,
        },
      ] as never)
      .select()
      .single() as { data: { id: string } | null; error: { message: string } | null }

    if (teamError || !team) { setMessage('❌ Lỗi: ' + teamError?.message); setSubmitLoading(false); return }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert([
        {
          team_id: team.id,
          user_id: user.id,
          role: 'leader',
        },
      ] as never)

    if (memberError) { setMessage('❌ Lỗi: ' + memberError.message); setSubmitLoading(false); return }

    setMessage('✅ Tạo đội thành công! Bạn đã đăng ký tham gia cuộc thi.')
    setShowForm(false)
    setTeamName('')
    setTeamDesc('')
    setSubmitLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  if (!competition) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>Không tìm thấy cuộc thi.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-brand-blue/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Back navigation */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          ← QUAY LẠI PILOT CONSOLE
        </Link>

        {/* Quest Briefing Header */}
        <div className="tech-panel-glow p-8 mb-8 relative cyber-corners border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/30 tracking-widest">
            ARENA QUEST BRIEFING // ID_{competition.id.slice(0, 8).toUpperCase()}
          </div>
          
          <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-bold text-cyan-400 tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {competition.status === 'registration' ? 'ĐANG MỞ ĐĂNG KÝ THI' : competition.status?.toUpperCase()}
          </div>

          <h1 className="font-orbitron text-2xl md:text-3.5xl font-extrabold text-white tracking-wider uppercase mb-3 leading-snug">
            {competition.title}
          </h1>
          <p className="text-slate-350 text-sm leading-relaxed max-w-3xl">
            {competition.description}
          </p>
        </div>

        {/* Details Grid (Rules & Prizes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="tech-panel p-6 border-cyan-500/15 relative">
            <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/20 tracking-widest">SECTION // 01</div>
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
              <span>📜</span> THỂ LỆ THI ĐẤU
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {competition.rules || 'Nội dung thể lệ đang được cập nhật bởi ban tổ chức...'}
            </p>
          </div>

          <div className="tech-panel p-6 border-cyan-500/15 relative">
            <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/20 tracking-widest">SECTION // 02</div>
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
              <span>🏆</span> CƠ CẤU GIẢI THƯỞNG
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {competition.prizes || 'Thông tin giải thưởng chi tiết đang được cập nhật...'}
            </p>
          </div>
        </div>

        {/* Timeline Timeline */}
        <div className="tech-panel p-6 mb-8 border-cyan-500/15 relative">
          <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/20 tracking-widest">SCHEDULER // LOG</div>
          <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-1.5">
            <span>📅</span> LỘ TRÌNH ĐẤU TRƯỜNG
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Mở đăng ký', value: competition.registration_start, bg: 'bg-cyan-950/30 border-cyan-500/30 text-cyan-450' },
              { label: 'Hết đăng ký', value: competition.registration_end, bg: 'bg-cyan-950/30 border-cyan-500/30 text-cyan-450' },
              { label: 'Bắt đầu nộp', value: competition.submission_start, bg: 'bg-amber-950/20 border-amber-500/30 text-amber-450' },
              { label: 'Hạn nộp bài', value: competition.submission_end, bg: 'bg-red-950/20 border-red-500/30 text-red-400' },
            ].map((item) => (
              <div key={item.label} className={`border p-4 rounded-lg flex flex-col justify-between h-20 ${item.bg}`}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-85">{item.label}</span>
                <span className="font-orbitron text-xs font-extrabold tracking-widest">
                  {item.value ? new Date(item.value).toLocaleDateString('vi-VN') : 'CHƯA ĐỊNH NGÀY'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-8 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        {/* Register Alliance Section */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full tech-btn-accent py-4 rounded-lg font-orbitron font-extrabold text-base tracking-widest uppercase cursor-pointer"
          >
            👥 KHỞI TẠO LIÊN MINH CHIẾN ĐẤU (ĐĂNG KÝ ĐỘI THI)
          </button>
        ) : (
          <div className="tech-panel p-6 border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
              <span>👥</span> THÀNH LẬP ĐỘI NGŨ MỚI
            </h2>
            <form onSubmit={handleRegisterTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Tên liên minh / đội *</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="VD: Team Cybernetic Robot"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Mô tả đội hình</label>
                <textarea
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn về các thành viên và mục tiêu đấu trường..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="tech-btn-accent font-orbitron px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer text-black"
                >
                  {submitLoading ? '⏳ ĐANG KHỞI TẠO...' : 'TẠO LIÊN MINH'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-[#1e2d5a] bg-transparent hover:bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer transition"
                >
                  HỦY LỆNH
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}