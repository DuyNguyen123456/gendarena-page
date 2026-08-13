import Link from 'next/link'
import { Compass, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center p-6 relative overflow-hidden scanline-container">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-[#112E81]/25 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="tech-panel-glow p-8 md:p-10 rounded-2xl cyber-corners border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.1)] flex flex-col items-center">
          
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 shadow-[0_0_20px_rgba(0,240,255,0.2)] animate-pulse">
            <Compass className="w-8 h-8 text-cyan-400" />
          </div>

          {/* 404 Code */}
          <span className="font-orbitron text-xs font-bold tracking-[0.3em] text-cyan-400 uppercase mb-2">
            MÃ LỖI: 404 NOT FOUND
          </span>

          {/* Main Title */}
          <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold uppercase tracking-wider text-white mb-3">
            TRANG KHÔNG TỒN TẠI
          </h1>

          {/* Friendly Description */}
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Địa chỉ bạn đang tìm kiếm có thể đã bị di chuyển, xóa bỏ hoặc không tồn tại trên hệ thống GenD Arena.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Link
              href="/"
              className="tech-btn-accent font-orbitron font-bold inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-xs tracking-wider text-black hover:scale-105 active:scale-95 transition duration-200 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              <Home className="w-4 h-4 text-black shrink-0" />
              <span>Về Trang Chủ</span>
            </Link>

            <Link
              href="/dashboard"
              className="tech-btn-primary font-orbitron font-bold inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-xs tracking-wider text-white hover:scale-105 active:scale-95 transition duration-200"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Bảng Điều Khiển</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
