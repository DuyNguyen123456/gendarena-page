'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Globe, ArrowUpRight, Award, ShieldCheck, Users } from 'lucide-react'
import { siteConfig } from '@/config/site'
import Footer from '@/components/footer'

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

// Define the type for organizer data
interface Organizer {
  id: string
  name: string
  role: string
  description: string
  logoPath: string
  initials: string
  facebook: string
  website?: string
  email?: string
  colorTheme: {
    from: string
    to: string
    accent: string
    glow: string
  }
  stats: { label: string; value: string }[]
}

const ORGANIZERS: Organizer[] = [
  {
    id: 'sse-uth',
    name: siteConfig.organizers.sse.name,
    role: 'Đơn vị đồng tổ chức',
    description: 'Đơn vị đi đầu trong việc truyền cảm hứng, bồi dưỡng tư duy khởi nghiệp sáng tạo và nâng cao năng lực thực chiến cho sinh viên. SSE-UTH tự hào là cầu nối tin cậy giữa nhà trường, doanh nghiệp và các dự án sinh viên triển vọng, chắp cánh cho những ý tưởng công nghệ và dịch vụ mang tính ứng dụng cao.',
    logoPath: '/organizers/logo-clb.png',
    initials: 'SSE',
    facebook: siteConfig.organizers.sse.facebook,
    email: siteConfig.organizers.sse.email,
    colorTheme: {
      from: 'from-cyan-500/20',
      to: 'to-blue-600/10',
      accent: 'text-cyan-400',
      glow: 'shadow-[0_0_25px_rgba(6,182,212,0.15)]',
    },
    stats: [
      { label: 'Thành viên active', value: '50+' },
      { label: 'Sự kiện đã tổ chức', value: '20+' },
    ],
  },
  {
    id: 'fic',
    name: siteConfig.organizers.fic.name,
    role: 'Đơn vị đồng tổ chức',
    description: 'Nơi hội tụ những tâm hồn đam mê kinh doanh, sáng tạo và sẵn sàng đương đầu với thử thách. FIC mang sứ mệnh lan tỏa tinh thần khởi nghiệp, hỗ trợ các ý tưởng kinh doanh từ giai đoạn sơ khởi cho đến khi định hình, thông qua các buổi hội thảo chuyên sâu, workshop kỹ năng và kết nối mạng lưới cố vấn chất lượng.',
    logoPath: '/organizers/logo-doitac.png',
    initials: 'FIC',
    facebook: siteConfig.organizers.fic.facebook,
    email: siteConfig.organizers.fic.email,
    colorTheme: {
      from: 'from-indigo-500/20',
      to: 'to-purple-600/10',
      accent: 'text-indigo-400',
      glow: 'shadow-[0_0_25px_rgba(99,102,241,0.15)]',
    },
    stats: [
      { label: 'Cố vấn chuyên môn', value: '10+' },
      { label: 'Năm hoạt động', value: '4+' },
    ],
  },
]

export default function OrganizersPage() {
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({})

  const handleImageError = (id: string) => {
    setLogoErrors((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#112E81]/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-cyan-950/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header section with high-tech details and elegant fonts */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131e3d] border border-[#1e2d5a] text-xs font-semibold text-cyan-400 uppercase tracking-widest animate-pulse">
            <Users className="w-3.5 h-3.5" />
            Ban tổ chức
          </div>
          
          <h1 className="font-orbitron text-3xl sm:text-5xl font-black tracking-tight text-white uppercase bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400">
            Đội Ngũ <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">Kiến Tạo</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed">
            Gặp gỡ các tổ chức nòng cốt đồng hành và xây dựng nên đấu trường công nghệ & khởi nghiệp <span className="font-orbitron font-semibold text-cyan-400">GenD Arena 2026</span>.
          </p>
          
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mt-4" />
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: SSE-UTH (Main large card) */}
          <div className="group relative rounded-2xl bg-gradient-to-br from-[#0b1124] to-[#070c1e] border border-[#1e2d5a] hover:border-cyan-500/40 transition-all duration-500 overflow-hidden shadow-2xl hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,240,255,0.15)] flex flex-col justify-between">
            {/* Ambient hover glowing effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            {/* Scanline design detail */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            
            <div className="p-8 sm:p-10 space-y-6 relative z-10">
              {/* Card Badge and Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-xs font-bold text-cyan-400 uppercase tracking-wide">
                  <Award className="w-3.5 h-3.5" />
                  {ORGANIZERS[0].role}
                </div>
                
                {/* Stats info nested nicely in Bento cell */}
                <div className="flex gap-4">
                  {ORGANIZERS[0].stats.map((stat, idx) => (
                    <div key={idx} className="border-l border-[#1e2d5a] pl-3">
                      <div className="text-xl font-orbitron font-extrabold text-cyan-400">{stat.value}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logo and Title Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
                {/* next/image container with aspect ratio and fallback */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#131e3d] to-[#070c1e] border border-[#1e2d5a] flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:border-cyan-500/30 transition-colors duration-300">
                  {logoErrors[ORGANIZERS[0].id] ? (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-600/30 flex items-center justify-center font-orbitron text-2xl font-black text-cyan-400 tracking-wider">
                      {ORGANIZERS[0].initials}
                    </div>
                  ) : (
                    <Image
                      src={ORGANIZERS[0].logoPath}
                      alt={ORGANIZERS[0].name}
                      fill
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 80px, 96px"
                      onError={() => handleImageError(ORGANIZERS[0].id)}
                      priority
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide leading-tight group-hover:text-cyan-300 transition-colors">
                    {ORGANIZERS[0].name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">ID: SSE-UTH.ORG</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-sans">
                {ORGANIZERS[0].description}
              </p>
            </div>

            {/* Card Footer for Links */}
            <div className="p-8 sm:p-10 pt-0 border-t border-[#1e2d5a]/40 bg-[#070c1e]/40 flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex gap-3">
                <Link
                  href={ORGANIZERS[0].facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-950/20 border border-cyan-500/10 hover:border-cyan-500/40 text-xs font-semibold text-cyan-400 transition-all duration-300 hover:bg-cyan-500/10 active:translate-y-px"
                >
                  <FacebookIcon className="w-4 h-4" />
                  <span>Facebook</span>
                </Link>
                {ORGANIZERS[0].email && (
                  <Link
                    href={`mailto:${ORGANIZERS[0].email}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#131e3d]/40 border border-[#1e2d5a] hover:border-slate-400 text-xs font-semibold text-slate-300 transition-all duration-300 hover:bg-[#131e3d]/80 active:translate-y-px"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </Link>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline-block">
                Establishment: 2018 UTH
              </span>
            </div>
          </div>

          {/* Card 2: FIC (Secondary right card) */}
          <div className="group relative rounded-2xl bg-gradient-to-br from-[#0b1124] to-[#070c1e] border border-[#1e2d5a] hover:border-indigo-500/40 transition-all duration-500 overflow-hidden shadow-2xl hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(99,102,241,0.15)] flex flex-col justify-between">
            {/* Ambient hover glowing effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            {/* Decorative Cyber Line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            
            <div className="p-8 space-y-6 relative z-10">
              {/* Card Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-950/40 border border-indigo-500/30 text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {ORGANIZERS[1].role}
                </div>
              </div>

              {/* Logo and Title Section */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#131e3d] to-[#070c1e] border border-[#1e2d5a] flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:border-indigo-500/30 transition-colors duration-300">
                  {logoErrors[ORGANIZERS[1].id] ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-600/30 flex items-center justify-center font-orbitron text-xl font-black text-indigo-400 tracking-wider">
                      {ORGANIZERS[1].initials}
                    </div>
                  ) : (
                    <Image
                      src={ORGANIZERS[1].logoPath}
                      alt={ORGANIZERS[1].name}
                      fill
                      className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 64px, 64px"
                      onError={() => handleImageError(ORGANIZERS[1].id)}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-orbitron font-bold text-white tracking-wide leading-snug group-hover:text-indigo-300 transition-colors">
                    {ORGANIZERS[1].name}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">ID: FIC.HUB</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                {ORGANIZERS[1].description}
              </p>
            </div>

            {/* Card Footer for Links */}
            <div className="p-8 pt-0 border-t border-[#1e2d5a]/40 bg-[#070c1e]/40 flex flex-col gap-3 relative z-10">
              {/* Stats row inside FIC card */}
              <div className="flex justify-between border-b border-[#1e2d5a]/30 pb-3 text-xs">
                {ORGANIZERS[1].stats.map((stat, idx) => (
                  <div key={idx} className="flex justify-between w-full">
                    <span className="text-slate-500">{stat.label}</span>
                    <span className="font-orbitron font-bold text-indigo-400">{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5">
                <Link
                  href={ORGANIZERS[1].facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-950/20 border border-indigo-500/10 hover:border-indigo-500/40 text-xs font-semibold text-indigo-400 transition-all duration-300 hover:bg-indigo-500/10 active:translate-y-px"
                >
                  <FacebookIcon className="w-3.5 h-3.5" />
                  <span>Facebook</span>
                </Link>
                {ORGANIZERS[1].email && (
                  <Link
                    href={`mailto:${ORGANIZERS[1].email}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#131e3d]/40 border border-[#1e2d5a] hover:border-slate-400 text-xs font-semibold text-slate-300 transition-all duration-300 hover:bg-[#131e3d]/80 active:translate-y-px"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Banner / Extra Bento Grid Card (Full width on large, beautifully containing stats and custom italic accents) */}
          <div className="md:col-span-2 group relative rounded-2xl bg-gradient-to-r from-[#0b1124] to-[#111c3a] border border-[#1e2d5a] hover:border-emerald-500/30 transition-all duration-500 overflow-hidden shadow-2xl p-8 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            {/* Left part: Accent Slogan & Text with Italic Serif */}
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <h3 className="text-xl sm:text-2xl text-white font-orbitron font-semibold tracking-wide">
                Sứ Mệnh Đồng Hành
              </h3>
              
              {/* Italic serif accents to avoid looking AI generic */}
              <p className="text-emerald-400 font-serif italic text-base sm:text-lg leading-relaxed pl-2 border-l-2 border-emerald-500/40">
                &ldquo;Đồng lòng kiến tạo sân chơi công nghệ lớn nhất dành cho sinh viên, nơi các ý tưởng khởi nghiệp sáng tạo cất cánh và vươn tầm cao mới.&rdquo;
              </p>
            </div>

            {/* Right part: Action / General details */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto justify-center shrink-0">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-[#1e2d5a] text-center min-w-[120px] backdrop-blur-sm">
                <div className="text-3xl font-orbitron font-extrabold text-white">02</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Đồng tổ chức</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-[#1e2d5a] text-center min-w-[120px] backdrop-blur-sm">
                <div className="text-3xl font-orbitron font-extrabold text-cyan-400">100%</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Nhiệt huyết</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-[#1e2d5a] text-center min-w-[120px] backdrop-blur-sm">
                <div className="text-3xl font-orbitron font-extrabold text-indigo-400">2026</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Bứt phá</div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Floating Back to Home button */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors duration-300 py-2 px-4 rounded-lg hover:bg-cyan-950/20 border border-transparent hover:border-cyan-500/10"
          >
            <span>Quay lại Trang chủ</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
      <Footer />
    </div>
  )
}
