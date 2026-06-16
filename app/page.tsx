import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050814] text-white relative scanline-container overflow-hidden pb-16">
      
      {/* Background Decorative Tech Lines/Glows */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-[#112E81]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        
        {/* Arena Badge */}
        <div className="inline-flex items-center gap-2 bg-cyan-950/40 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest text-cyan-400 uppercase mb-8 animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.1)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          SYSTEM OPERATIONAL • SEASON 2026
        </div>

        {/* Title */}
        <h1 className="font-orbitron text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
          ĐẤU TRƯỜNG <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 neon-text-cyan">
            GEND ARENA 2026
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Giải đấu khoa học kỹ thuật dành cho những bộ óc sáng tạo. Thiết kế robot, lập trình chiến thuật và chinh phục sàn đấu công nghệ đỉnh cao.
        </p>

        {/* CTA Button */}
        <div className="mb-16">
          <Link 
            href="/register" 
            className="tech-btn-accent font-orbitron inline-block px-10 py-5 rounded-lg text-lg tracking-wider hover:scale-105 active:scale-95 transition-all duration-200"
          >
            🎯 ĐĂNG KÝ BƯỚC VÀO ARENA
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { value: '500+', label: 'ĐẤU THỦ THAM GIA', desc: 'Các thí sinh trên toàn quốc', border: 'border-cyan-500/20' },
            { value: '100 TR', label: 'TỔNG GIẢI THƯỞNG', desc: 'Hỗ trợ vốn & cơ hội đầu tư', border: 'border-yellow-500/20', textGlow: 'neon-text-yellow' },
            { value: '50+', label: 'HỘI ĐỒNG CHUYÊN GIA', desc: 'Mentors và ban giám khảo công nghệ', border: 'border-cyan-500/20' },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className={`tech-panel cyber-corners p-6 flex flex-col items-center justify-center transition hover:border-cyan-400/40 hover:bg-cyan-950/10 group ${stat.border}`}
            >
              <div className={`font-orbitron text-4xl font-extrabold mb-1 tracking-tight text-white ${stat.textGlow || 'text-cyan-400'}`}>
                {stat.value}
              </div>
              <div className="text-xs font-bold tracking-widest text-slate-300 mb-2">{stat.label}</div>
              <div className="text-slate-500 text-xs text-center">{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-5xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center mb-12">
          <h2 className="font-orbitron text-3xl font-bold tracking-widest uppercase mb-2">
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
              className="tech-panel-glow hover:border-cyan-400/65 relative p-8 group transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Corner Indicators */}
              <div className="absolute top-2 right-4 font-orbitron text-sm font-bold text-cyan-500/20 group-hover:text-cyan-400/40 transition">
                #{item.num}
              </div>
              
              <div>
                <div className="text-4xl mb-4 p-3 bg-cyan-950/30 border border-cyan-800/30 rounded-lg inline-block group-hover:scale-110 transition duration-300">
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
              <div className="h-0.5 w-0 bg-cyan-400 group-hover:w-full transition-all duration-500" />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pt-16 text-center border-t border-[#1e2d5a] text-slate-500 text-xs">
        <div className="font-orbitron tracking-widest text-[#112E81] mb-2 font-semibold">
          GEND ARENA SECURITY TERMINAL • V2.0
        </div>
        <p className="mb-2">© 2026 GenD Arena. Bản quyền thuộc về Ban Tổ Chức Cuộc Thi.</p>
        <p>Hệ thống giám sát robot và phân tích thuật toán tự động.</p>
      </footer>

    </div>
  )
}