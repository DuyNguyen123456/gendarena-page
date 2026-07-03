'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, competitions: 0, teams: 0, submissions: 0, pendingSubmissions: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const [users, comps, teams, subs, pendingSubs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('competitions').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'submitted']),
      ])

      setStats({
        users: users.count || 0,
        competitions: comps.count || 0,
        teams: teams.count || 0,
        submissions: subs.count || 0,
        pendingSubmissions: pendingSubs.count || 0,
      })
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  if (loading) return <Loading text="LOADING SECURE DATABASE" />

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-brand-blue/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              ⚙️ TRUNG TÂM KIỂM SOÁT HỆ THỐNG
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              SYSTEM CONTROL CENTER // OVERLORD TERMINAL
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-red-950/30 border border-red-500/30 px-4 py-2 rounded-lg text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            BẢO MẬT: CẤP CAO (ADMIN)
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: '👥', label: 'THÍ SINH ĐĂNG KÝ', value: stats.users, color: 'text-cyan-400', border: 'border-cyan-500/20', href: '/admin/users' },
            { icon: '🏆', label: 'CUỘC THI THIẾT LẬP', value: stats.competitions, color: 'text-yellow-500', border: 'border-yellow-500/20', href: '/admin/competitions' },
            { icon: '🧩', label: 'LIÊN MINH KHỞI TẠO', value: stats.teams, color: 'text-purple-400', border: 'border-purple-500/20', href: null },
            { icon: '📝', label: 'BÀI NỘP TỔNG', value: stats.submissions, color: 'text-emerald-400', border: 'border-emerald-500/20', href: '/admin/submissions' },
            { icon: '⏳', label: 'BÀI CHỜ CHẤM', value: stats.pendingSubmissions, color: 'text-amber-400', border: 'border-amber-500/20', href: '/admin/submissions' },
          ].map((stat) => (
            stat.href ? (
              <Link key={stat.label} href={stat.href} className={`tech-panel-glow p-6 relative flex flex-col justify-between h-32 cyber-corners ${stat.border} hover:brightness-110 transition`}>
                <div className="text-2xl">{stat.icon}</div>
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-400 mb-1">{stat.label}</div>
                  <div className={`font-orbitron text-3xl font-extrabold tracking-widest leading-none ${stat.color}`}>{stat.value}</div>
                </div>
              </Link>
            ) : (
              <div key={stat.label} className={`tech-panel-glow p-6 relative flex flex-col justify-between h-32 cyber-corners ${stat.border}`}>
                <div className="text-2xl">{stat.icon}</div>
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-400 mb-1">{stat.label}</div>
                  <div className={`font-orbitron text-3xl font-extrabold tracking-widest leading-none ${stat.color}`}>{stat.value}</div>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { href: '/admin/competitions', icon: '🏆', title: 'QUẢN LÝ CUỘC THI', desc: 'Thiết lập, hiệu chỉnh thông số các Arena' },
            { href: '/admin/users', icon: '👥', title: 'QUẢN LÝ NGƯỜI DÙNG', desc: 'Giám sát đấu thủ và phân quyền truy cập' },
            { href: '/admin/submissions', icon: '📝', title: 'QUẢN LÝ BÀI NỘP', desc: 'Xem danh sách bài nộp theo giai đoạn, lọc chờ chấm' },
            { href: '/admin/assign', icon: '👥', title: 'PHÂN CÔNG GIÁM KHẢO', desc: 'Gán giám khảo chấm điểm cho từng bài nộp' },
            { href: '/admin/scoring', icon: '⚖️', title: 'CẤU HÌNH CHẤM ĐIỂM', desc: 'Trọng số, mở/đóng chấm, quản lý vòng chấm' },
            { href: '/admin/leaderboard', icon: '🏅', title: 'BẢNG XẾP HẠNG CHUNG', desc: 'Xếp hạng hiệu năng của các liên minh' },
            { href: '/admin/phases', icon: '🗓️', title: 'QUẢN LÝ LỊCH TRÌNH', desc: 'Sắp xếp, thay đổi thông tin các giai đoạn thi đấu' },
            { href: '/admin/speakers', icon: '🎤', title: 'QUẢN LÝ DIỄN GIẢ', desc: 'Thêm, chỉnh sửa diễn giả, giám khảo và cố vấn' },
            { href: '/admin/sponsors', icon: '🤝', title: 'QUẢN LÝ NHÀ TÀI TRỢ', desc: 'Quản lý logo và thông tin các đối tác tài trợ' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tech-panel p-6 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.08)] transition duration-200 flex items-center gap-6 group relative"
            >
              {/* Corner tech line decoration */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/30 group-hover:border-cyan-400 transition" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/30 group-hover:border-cyan-400 transition" />

              <div className="text-4.5xl group-hover:scale-110 transition duration-300">{item.icon}</div>
              <div>
                <div className="font-orbitron text-sm font-bold tracking-wider text-slate-100 group-hover:text-cyan-400 mb-1 transition">{item.title}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
