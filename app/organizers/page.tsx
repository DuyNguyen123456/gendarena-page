'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, ArrowUpRight, Users } from 'lucide-react'
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

interface Organizer {
  id: string
  name: string
  role: string
  description: string
  logoPath: string
  initials: string
  facebook: string
  email?: string
  colorTheme: {
    accent: string
    badgeBg: string
    badgeBorder: string
    hoverBorder: string
    hoverGlow: string
    hoverOverlay: string
    scanline: string
    logoBorder: string
    logoFallbackGrad: string
    logoFallbackText: string
    linkBg: string
    linkBorder: string
    linkHoverBorder: string
    linkHoverBg: string
    linkText: string
    topLine: string
  }
}

const ORGANIZERS: Organizer[] = [
  {
    id: 'sse-uth',
    name: siteConfig.organizers.sse.name,
    role: 'Đơn vị đồng tổ chức',
    description:
      'Đơn vị đi đầu trong việc truyền cảm hứng, bồi dưỡng tư duy khởi nghiệp sáng tạo và nâng cao năng lực thực chiến cho sinh viên. SSE-UTH tự hào là cầu nối tin cậy giữa nhà trường, doanh nghiệp và các dự án sinh viên triển vọng, chắp cánh cho những ý tưởng công nghệ và dịch vụ mang tính ứng dụng cao.',
    logoPath: '/organizers/logo-clb.png',
    initials: 'SSE',
    facebook: siteConfig.organizers.sse.facebook,
    email: siteConfig.organizers.sse.email,
    colorTheme: {
      accent: 'text-cyan-400',
      badgeBg: 'bg-cyan-950/40',
      badgeBorder: 'border-cyan-500/30',
      hoverBorder: 'hover:border-cyan-500/40',
      hoverGlow: 'hover:shadow-[0_15px_30px_rgba(0,240,255,0.15)]',
      hoverOverlay: 'from-cyan-500/10',
      scanline: 'via-cyan-500/30',
      logoBorder: 'group-hover:border-cyan-500/30',
      logoFallbackGrad: 'from-cyan-500/20 to-blue-600/30',
      logoFallbackText: 'text-cyan-400',
      linkBg: 'bg-cyan-950/20',
      linkBorder: 'border-cyan-500/10',
      linkHoverBorder: 'hover:border-cyan-500/40',
      linkHoverBg: 'hover:bg-cyan-500/10',
      linkText: 'text-cyan-400',
      topLine: 'via-cyan-500/30',
    },
  },
  {
    id: 'fic',
    name: siteConfig.organizers.fic.name,
    role: 'Đơn vị đồng tổ chức',
    description:
      'Nơi hội tụ những tâm hồn đam mê kinh doanh, sáng tạo và sẵn sàng đương đầu với thử thách. FIC mang sứ mệnh lan tỏa tinh thần khởi nghiệp, hỗ trợ các ý tưởng kinh doanh từ giai đoạn sơ khởi cho đến khi định hình, thông qua các buổi hội thảo chuyên sâu, workshop kỹ năng và kết nối mạng lưới cố vấn chất lượng.',
    logoPath: '/organizers/logo-doitac.png',
    initials: 'FIC',
    facebook: siteConfig.organizers.fic.facebook,
    email: siteConfig.organizers.fic.email,
    colorTheme: {
      accent: 'text-indigo-400',
      badgeBg: 'bg-indigo-950/40',
      badgeBorder: 'border-indigo-500/30',
      hoverBorder: 'hover:border-indigo-500/40',
      hoverGlow: 'hover:shadow-[0_15px_30px_rgba(99,102,241,0.15)]',
      hoverOverlay: 'from-indigo-500/10',
      scanline: 'via-indigo-500/30',
      logoBorder: 'group-hover:border-indigo-500/30',
      logoFallbackGrad: 'from-indigo-500/20 to-purple-600/30',
      logoFallbackText: 'text-indigo-400',
      linkBg: 'bg-indigo-950/20',
      linkBorder: 'border-indigo-500/10',
      linkHoverBorder: 'hover:border-indigo-500/40',
      linkHoverBg: 'hover:bg-indigo-500/10',
      linkText: 'text-indigo-400',
      topLine: 'via-indigo-500/30',
    },
  },
]

interface OrganizerCardProps {
  org: Organizer
  logoError: boolean
  onImageError: (id: string) => void
}

function OrganizerCard({ org, logoError, onImageError }: OrganizerCardProps) {
  const c = org.colorTheme
  return (
    <div
      className={`group relative rounded-2xl bg-gradient-to-br from-[#0b1124] to-[#070c1e] border border-[#1e2d5a] ${c.hoverBorder} transition-all duration-500 overflow-hidden shadow-2xl hover:-translate-y-1.5 ${c.hoverGlow} flex flex-col justify-between`}
    >
      {/* Ambient hover glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${c.hoverOverlay} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />

      {/* Top scanline accent */}
      <div
        className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${c.scanline} to-transparent`}
      />

      {/* Body */}
      <div className="p-8 sm:p-10 space-y-6 relative z-10">
        {/* Role badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md ${c.badgeBg} border ${c.badgeBorder} text-xs font-bold ${c.accent} uppercase tracking-wide`}
        >
          {org.role}
        </div>

        {/* Logo + name */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#131e3d] to-[#070c1e] border border-[#1e2d5a] flex items-center justify-center overflow-hidden shrink-0 shadow-lg ${c.logoBorder} transition-colors duration-300`}
          >
            {logoError ? (
              <div
                className={`w-full h-full bg-gradient-to-br ${c.logoFallbackGrad} flex items-center justify-center font-orbitron text-2xl font-black ${c.logoFallbackText} tracking-wider`}
              >
                {org.initials}
              </div>
            ) : (
              <Image
                src={org.logoPath}
                alt={org.name}
                fill
                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 80px, 96px"
                onError={() => onImageError(org.id)}
                priority
              />
            )}
          </div>

          <div className="space-y-1">
            <h2
              className={`text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide leading-tight group-hover:${c.accent.replace('text-', 'text-').replace('400', '300')} transition-colors`}
            >
              {org.name}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-sans">
          {org.description}
        </p>
      </div>

      {/* Card footer with links */}
      <div className="p-8 sm:p-10 pt-0 border-t border-[#1e2d5a]/40 bg-[#070c1e]/40 flex flex-wrap items-center gap-3 relative z-10">
        <Link
          href={org.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${c.linkBg} border ${c.linkBorder} ${c.linkHoverBorder} text-xs font-semibold ${c.linkText} transition-all duration-300 ${c.linkHoverBg} active:translate-y-px`}
        >
          <FacebookIcon className="w-4 h-4" />
          <span>Facebook</span>
        </Link>

        {org.email && (
          <Link
            href={`mailto:${org.email}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#131e3d]/40 border border-[#1e2d5a] hover:border-slate-400 text-xs font-semibold text-slate-300 transition-all duration-300 hover:bg-[#131e3d]/80 active:translate-y-px"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </Link>
        )}
      </div>
    </div>
  )
}

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

        {/* Page Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131e3d] border border-[#1e2d5a] text-xs font-semibold text-cyan-400 uppercase tracking-widest animate-pulse">
            <Users className="w-3.5 h-3.5" />
            Ban tổ chức
          </div>

          <h1 className="font-orbitron text-3xl sm:text-5xl font-black tracking-tight text-white uppercase bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400">
            Đội Ngũ <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">Kiến Tạo</span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed">
            Gặp gỡ các tổ chức nòng cốt đồng hành và xây dựng nên đấu trường công nghệ &amp; khởi nghiệp{' '}
            <span className="font-orbitron font-semibold text-cyan-400">GenD Arena 2026</span>.
          </p>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mt-4" />
        </div>

        {/* Organizer Cards Grid — 2 equal columns on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ORGANIZERS.map((org) => (
            <OrganizerCard
              key={org.id}
              org={org}
              logoError={!!logoErrors[org.id]}
              onImageError={handleImageError}
            />
          ))}
        </div>

        {/* Back to home */}
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
