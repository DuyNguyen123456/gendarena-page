import Link from 'next/link'
import ParticleField from '@/components/particle-field'
import StatsCounter from '@/components/stats-counter'

const TIMELINE = [
  {
    phase: '01',
    title: 'ĐĂNG KÝ THAM DỰ',
    date: '01/07 – 31/07/2026',
    desc: 'Nộp hồ sơ đội thi và đăng ký ý tưởng dự án. Mỗi đội từ 2–5 thành viên.',
    status: 'open',
    icon: '📋',
  },
  {
    phase: '02',
    title: 'VÒNG SƠ KHẢO',
    date: '05/08 – 20/08/2026',
    desc: 'Hội đồng chuyên gia đánh giá đề xuất kỹ thuật. Top 30 đội lọt vào vòng trong.',
    status: 'upcoming',
    icon: '🔬',
  },
  {
    phase: '03',
    title: 'VÒNG KHU VỰC',
    date: '01/09 – 15/09/2026',
    desc: 'Trình bày và demo sản phẩm trực tiếp trước ban giám khảo. Top 10 vào chung kết.',
    status: 'upcoming',
    icon: '🏟️',
  },
  {
    phase: '04',
    title: 'CHUNG KẾT ARENA',
    date: '01/10/2026',
    desc: 'Đại sự kiện tranh tài cuối cùng. Giải thưởng 100 triệu VNĐ và cơ hội gọi vốn.',
    status: 'upcoming',
    icon: '🏆',
  },
]

export default function HomePage() {
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
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Giải đấu khoa học kỹ thuật dành cho những bộ óc sáng tạo. Thiết kế robot, lập trình chiến thuật và chinh phục sàn đấu công nghệ đỉnh cao.
          </p>

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
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Section background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070c1e]/80 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[600px] bg-[#112E81]/5 blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col items-center mb-14">
            <p className="text-xs font-orbitron tracking-[0.3em] text-cyan-500/70 uppercase mb-3">MISSION TIMELINE</p>
            <h2 className="font-orbitron text-3xl font-bold tracking-widest uppercase mb-3">
              LỊCH TRÌNH ĐẤU TRƯỜNG
            </h2>
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/60 via-blue-500/30 to-transparent md:-translate-x-1/2 pointer-events-none" />

            <div className="space-y-10">
              {TIMELINE.map((item, idx) => {
                const isLeft = idx % 2 === 0
                return (
                  <div key={idx} className={`relative flex items-start gap-6 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    {/* Content box */}
                    <div className={`flex-1 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-16 md:pl-0`}>
                      <div className={`tech-panel-glow p-5 hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1 ${item.status === 'open' ? 'border-cyan-400/30 shadow-[0_0_20px_rgba(0,240,255,0.08)]' : ''}`}>
                        <div className={`flex items-center gap-2 mb-2 ${isLeft ? 'md:flex-row-reverse md:justify-start' : ''}`}>
                          <span className="font-orbitron text-xs text-cyan-500/60 tracking-widest">PHASE {item.phase}</span>
                          {item.status === 'open' && (
                            <span className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">
                              ● ĐANG MỞ
                            </span>
                          )}
                        </div>
                        <h3 className="font-orbitron text-base font-bold text-white tracking-wide uppercase mb-1">{item.title}</h3>
                        <div className="text-xs font-bold text-cyan-400 font-orbitron mb-2 tracking-wider">{item.date}</div>
                        <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    {/* Center node */}
                    <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 top-5 flex items-center justify-center">
                      <div className={`timeline-node w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${
                        item.status === 'open'
                          ? 'border-cyan-400 bg-cyan-950'
                          : 'border-[#1e2d5a] bg-[#0b1124]'
                      }`}>
                        <span className="text-xs">{item.icon}</span>
                      </div>
                    </div>

                    {/* Empty spacer for alternating layout on md+ */}
                    <div className="hidden md:block flex-1" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

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