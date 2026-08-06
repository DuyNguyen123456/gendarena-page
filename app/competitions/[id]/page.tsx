'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import {
  AlertTriangle,
  ArrowLeft,
  ScrollText,
  Trophy,
  Calendar,
  Radio,
  Users,
} from 'lucide-react'

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

  if (loading) return <Loading text="Đang tải dữ liệu..." />

  if (!competition) return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col items-center justify-center gap-4">
      <p className="font-orbitron text-base text-red-400 tracking-wider uppercase flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <span>Không tìm thấy cuộc thi</span>
      </p>
      <Link href="/dashboard" className="tech-btn-primary px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider font-orbitron flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Dashboard</span>
      </Link>
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
          className="inline-flex items-center gap-1.5 text-xs font-orbitron font-bold tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Dashboard</span>
        </Link>

        {/* Quest Briefing Header */}
        <div className="tech-panel-glow p-8 mb-8 relative cyber-corners border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          
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
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Thể lệ thi đấu</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {competition.rules || 'Nội dung thể lệ đang được cập nhật bởi ban tổ chức...'}
            </p>
          </div>

          <div className="tech-panel p-6 border-cyan-500/15 relative">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Cơ cấu giải thưởng</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {competition.prizes || 'Thông tin giải thưởng chi tiết đang được cập nhật...'}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="tech-panel p-6 mb-8 border-cyan-500/15 relative">
          <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Lộ trình cuộc thi</span>
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
                <span className="font-orbitron text-xs font-semibold tracking-wider">
                  {item.value ? new Date(item.value).toLocaleDateString('vi-VN') : 'Chưa công bố'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-8 text-sm font-semibold tracking-wide flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Register Alliance Section */}
        <Link
          href={`/team/create?competitionId=${competition.id}`}
          className="w-full tech-btn-accent py-4 rounded-lg font-orbitron font-extrabold text-sm md:text-base tracking-wider uppercase cursor-pointer text-center flex items-center justify-center gap-2 text-black hover:scale-[1.01] transition-transform duration-200"
        >
          <Users className="w-5 h-5 shrink-0" />
          <span>Tạo đội thi mới & Đăng ký</span>
        </Link>

      </div>
    </div>
  )
}