

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

type Profile = {
  id: string
  full_name?: string
  email?: string
  phone?: string
  organization?: string
}

type Competition = {
  id: string
  title: string
  description?: string
  status?: string
}

export default async function DashboardPage() {
  // Server‑side data fetching
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: comps } = await supabase
    .from('competitions')
    .select('*')
    .order('created_at', { ascending: false })
  const competitions = (comps ?? []) as Competition[]

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Console Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#1e2d5a] pb-6 gap-4">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              <span className="text-cyan-400 animate-pulse">⚙️</span> BẢNG ĐIỀU KHIỂN ĐẤU THỦ
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              PILOT CONSOLE // SECURE ACCESS GRANTED
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            HỆ THỐNG HOẠT ĐỘNG
          </div>
        </div>

        {/* Profile Card */}
        <div className="tech-panel p-6 mb-8 relative cyber-corners border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/30 tracking-widest">
            CONTESTANT PROFILE // IDENT_08
          </div>
          <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
            <span>📋</span> THÔNG TIN HỒ SƠ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold">
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Họ và tên:</span>
              <span className="text-white">{profile?.full_name}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Địa chỉ Email:</span>
              <span className="text-white">{profile?.email}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Số điện thoại:</span>
              <span className="text-white">{profile?.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Đơn vị công tác:</span>
              <span className="text-white">{profile?.organization || 'Chưa cập nhật'}</span>
            </div>
          </div>
        </div>

        {/* Active Arenas */}
        <div className="tech-panel p-6 mb-8 border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
            <span>🏆</span> CÁC PHÂN KHU ĐẤU TRƯỜNG
          </h2>
          {competitions.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm font-semibold">Hiện chưa có cuộc thi nào được kích hoạt trên hệ thống.</p>
          ) : (
            <div className="space-y-4">
              {competitions.map((comp) => (
                <div key={comp.id} className="tech-panel-glow border-cyan-500/15 hover:border-cyan-400/40 p-5 rounded-xl transition duration-200">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                      <h3 className="font-orbitron text-lg font-bold text-white tracking-wider uppercase">{comp.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{comp.description}</p>
                      <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-bold text-cyan-400 tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        {comp.status === 'registration' ? 'ĐANG MỞ ĐĂNG KÝ THI' : comp.status?.toUpperCase()}
                      </div>
                    </div>
                    <Link
                      href={`/competitions/${comp.id}`}
                      className="tech-btn-primary px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest font-orbitron uppercase transition whitespace-nowrap self-end md:self-center"
                    >
                      XEM CHI TIẾT →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Console Shortcuts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { href: '/submissions', icon: '📝', title: 'NỘP BÀI DỰ THI', desc: 'Xem và quản lý bài nộp' },
            { href: '/dashboard', icon: '👥', title: 'ĐỘI CỦA TÔI', desc: 'Đăng ký tại chi tiết cuộc thi' },
            { href: '/dashboard', icon: '👤', title: 'HỒ SƠ CÁ NHÂN', desc: 'Xem thông tin tài khoản' },
          ].map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="tech-panel p-6 text-center hover:border-cyan-400/40 hover:bg-cyan-950/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.08)] transition-all duration-200 block group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition duration-300">{item.icon}</div>
              <div className="font-orbitron text-sm font-bold tracking-wider text-slate-100 group-hover:text-cyan-400 mb-1 transition">{item.title}</div>
              <div className="text-slate-400 text-xs">{item.desc}</div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}