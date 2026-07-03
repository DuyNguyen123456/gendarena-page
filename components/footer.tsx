import Link from 'next/link'
import { siteConfig } from '@/config/site'

/**
 * Site-wide cyberpunk footer.
 * All content is sourced from siteConfig — no hardcoded strings.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-[#1e2d5a] mt-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050814]/80 pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 py-14 relative z-10">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="font-orbitron text-xl font-extrabold tracking-wider text-white mb-2 flex items-center gap-2">
              🤖{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-400">
                {siteConfig.name.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-4">
              {siteConfig.description.slice(0, 100)}…
            </p>
            <p className="text-slate-600 text-[10px] tracking-widest uppercase font-orbitron mb-4">
              {siteConfig.tagline}
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              <a
                href={siteConfig.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-all duration-200 hover:shadow-[0_0_10px_rgba(0,240,255,0.1)] text-sm"
              >
                f
              </a>
              <a
                href={siteConfig.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-pink-500/40 hover:text-pink-400 flex items-center justify-center text-slate-400 transition-all duration-200 text-sm"
              >
                IG
              </a>
              <a
                href={siteConfig.socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-red-500/40 hover:text-red-400 flex items-center justify-center text-slate-400 transition-all duration-200 text-sm"
              >
                ▶
              </a>
              <a
                href={siteConfig.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-8 h-8 rounded-lg bg-[#131e3d] border border-[#1e2d5a] hover:border-slate-400/40 hover:text-white flex items-center justify-center text-slate-400 transition-all duration-200 text-sm"
              >
                ♪
              </a>
            </div>
          </div>

          {/* Cuộc thi */}
          <div>
            <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">
              Cuộc Thi
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link href="/register" className="hover:text-cyan-400 transition-colors">Đăng ký tham dự</Link></li>
              <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Bảng điều khiển</Link></li>
              <li><Link href="/submissions" className="hover:text-cyan-400 transition-colors">Nộp bài dự thi</Link></li>
              <li><Link href="/organizers" className="hover:text-cyan-400 transition-colors">Ban tổ chức</Link></li>
            </ul>
          </div>

          {/* Tài nguyên */}
          <div>
            <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">
              Tài Nguyên
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Hướng dẫn đăng ký</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Tiêu chí chấm điểm</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Template báo cáo</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h4 className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">
              Liên Hệ
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500/60">📧</span>
                <span>{siteConfig.contact.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500/60">📞</span>
                <span>{siteConfig.contact.phone}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500/60">📍</span>
                <span>{siteConfig.contact.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#1e2d5a] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="font-orbitron text-[10px] tracking-widest text-[#112E81] font-semibold uppercase">
            GEND ARENA SECURITY TERMINAL • V2.0
          </div>
          <p className="text-slate-600 text-xs">
            © {year} {siteConfig.name}. Bản quyền thuộc về Ban Tổ Chức Cuộc Thi.
          </p>
        </div>
      </div>
    </footer>
  )
}
