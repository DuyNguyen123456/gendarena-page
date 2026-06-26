import Link from 'next/link'
import ParticleField from '@/components/particle-field'
import StatsCounter from '@/components/stats-counter'
import Countdown from '@/components/countdown'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import TimelineSection from '@/components/timeline-section'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: phases } = await supabase
    .from('competition_phases')
    .select('*')
    .order('display_order', { ascending: true })

  // Find the registration/application start date dynamically
  const registrationPhase = phases?.find(p => 
    p.title.toLowerCase().includes('mở đơn') ||
    p.title.toLowerCase().includes('đăng ký') ||
    p.title.toLowerCase().includes('sơ loại') ||
    p.title.toLowerCase().includes('dream')
  ) || phases?.[1] || phases?.[0]

  const targetDate = registrationPhase?.start_date 
    ? `${registrationPhase.start_date}T00:00:00+07:00` 
    : '2026-09-01T00:00:00+07:00'
  const phaseTitle = registrationPhase?.title || 'Vòng Sơ Loại'

  return (
    <div className="min-h-screen bg-[#050814] text-white relative overflow-hidden pb-0">
      {/* Hero Section */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 pt-12 pb-20 text-center overflow-hidden scanline-container">

        {/* Particle canvas background */}
        <ParticleField />

        {/* Background Decorative Glows */}
        <div className="absolute top-1/4 left-1/10 w-[500px] h-[500px] bg-[#112E81]/20 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-indigo-900/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col items-center">
          {/* Arena Badge */}
          <div className="inline-flex items-center gap-2 bg-cyan-950/40 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest text-cyan-400 uppercase mb-8 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            SYSTEM OPERATIONAL • SEASON 2026
          </div>

          {/* Title */}
          <h1 className="font-orbitron text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            ĐẤU TRƯỜNG <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 neon-text-cyan drop-shadow-[0_0_30px_rgba(0,240,255,0.3)]">
              GEND ARENA 2026
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Giải đấu khoa học kỹ thuật dành cho những bộ óc sáng tạo. Thiết kế robot, lập trình chiến thuật và chinh phục sàn đấu công nghệ đỉnh cao.
          </p>

          {/* Countdown Component */}
          <div className="w-full max-w-2xl mb-10">
            <Countdown targetDate={targetDate} phaseTitle={phaseTitle} />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            <Link
              href="/register"
              className="tech-btn-accent shimmer-btn font-orbitron inline-block px-10 py-5 rounded-lg text-lg tracking-wider hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(0,240,255,0.2)]"
            >
              🎯 ĐĂNG KÝ BƯỚC VÀO ARENA
            </Link>
            <Link
              href="/login"
              className="tech-btn-primary font-orbitron inline-block px-8 py-5 rounded-lg text-base tracking-wider hover:scale-105 active:scale-95 transition-all duration-200"
            >
              ĐĂNG NHẬP HỆ THỐNG →
            </Link>
          </div>

          {/* Stats Grid — animated counter */}
          <StatsCounter />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-5xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center mb-12">
          <p className="text-xs font-orbitron tracking-[0.3em] text-cyan-500/70 uppercase mb-3">MISSION BRIEFING</p>
          <h2 className="font-orbitron text-3xl font-bold tracking-widest uppercase mb-3">
            VỀ CUỘC THI
          </h2>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '💡',
              num: '01',
              title: 'Ý TƯỞNG ĐỘT PHÁ',
              desc: 'Chia sẻ các đề xuất khoa học, giải pháp robot hoặc phần mềm đột phá giải quyết các bài toán thực tế của xã hội.'
            },
            {
              icon: '👥',
              num: '02',
              title: 'LIÊN MINH CHIẾN ĐẤU',
              desc: 'Xây dựng đội nhóm 2-5 thành viên đa ngành (lập trình viên, kĩ sư cơ khí, thiết kế) để cùng thiết kế và tối ưu hoá sản phẩm.'
            },
            {
              icon: '🏆',
              num: '03',
              title: 'VINH QUANG ĐẤU TRƯỜNG',
              desc: 'Tranh tài trực tiếp trên sàn đấu công nghệ để nhận giải thưởng tiền mặt trị giá 100 triệu VNĐ cùng các tấm vé gọi vốn startup.'
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="tech-panel-glow hover:border-cyan-400/65 relative p-8 group transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between"
            >
              {/* Corner Indicators */}
              <div className="absolute top-2 right-4 font-orbitron text-sm font-bold text-cyan-500/20 group-hover:text-cyan-400/40 transition">
                #{item.num}
              </div>

              <div>
                <div className="text-4xl mb-4 p-3 bg-cyan-950/30 border border-cyan-800/30 rounded-lg inline-block group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition duration-300">
                  {item.icon}
                </div>
                <h3 className="font-orbitron text-lg font-bold mb-3 tracking-wider text-slate-100 group-hover:text-cyan-400 transition">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {item.desc}
                </p>
              </div>

              {/* Glowing bottom line on hover */}
              <div className="h-0.5 w-0 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-500 shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <TimelineSection phases={phases || []} />

      {/* Footer */}
      <footer className="relative border-t border-[#1e2d5a] mt-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050814]/80 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-14 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="font-orbitron text-xl font-extrabold tracking-wider text-white mb-2 flex items-center gap-2">
                🤖 <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-400">GEND ARENA</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mb-4">
                Đấu trường khoa học kỹ thuật dành cho thế hệ sáng tạo Việt Nam 2026.
              </p>
              {/* Social links */}
              <div className="flex gap-3">
                <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all duration-200 hover:shadow-[0_0_10px_rgba(0,240,255,0.1)] text-sm">
                  f
                </a>
                <a href="#" aria-label="YouTube" className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-red-500/40 hover:text-red-400 flex items-center justify-center text-slate-400 transition-all duration-200 text-sm">
                  ▶
                </a>
                <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all duration-200 text-sm">
                  ⌥
                </a>
              </div>
            </div>

            {/* Cuộc thi */}
            <div>
              <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">Cuộc Thi</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><Link href="/register" className="hover:text-cyan-400 transition-colors">Đăng ký tham dự</Link></li>
                <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Bảng điều khiển</Link></li>
                <li><Link href="/submissions" className="hover:text-cyan-400 transition-colors">Nộp bài dự thi</Link></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Thể lệ cuộc thi</a></li>
              </ul>
            </div>

            {/* Tài nguyên */}
            <div>
              <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">Tài Nguyên</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Hướng dẫn đăng ký</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Tiêu chí chấm điểm</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Template báo cáo</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Liên hệ */}
            <div>
              <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">Liên Hệ</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500/60">📧</span>
                  <span>info@gendarena.vn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500/60">📞</span>
                  <span>0123 456 789</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500/60">📍</span>
                  <span>Hà Nội, Việt Nam</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#1e2d5a] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="font-orbitron text-[10px] tracking-widest text-[#112E81] font-semibold uppercase">
              GEND ARENA SECURITY TERMINAL • V2.0
            </div>
            <p className="text-slate-600 text-xs">© 2026 GenD Arena. Bản quyền thuộc về Ban Tổ Chức Cuộc Thi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}