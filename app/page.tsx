import Link from 'next/link'
import ParticleField from '@/components/particle-field'
import StatsCounter from '@/components/stats-counter'
import Countdown from '@/components/countdown'
import Footer from '@/components/footer'
import SpeakersSection from '@/components/speakers-section'
import SponsorsSection from '@/components/sponsors-section'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import TimelineSection from '@/components/timeline-section'
import { siteConfig } from '@/config/site'
import { Rocket, Lightbulb, Users, Trophy } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trang chủ — Đấu Trường Khởi Nghiệp Công Nghệ',
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
    description: siteConfig.description,
  },
}

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
            GenD Arena • Season 2026
          </div>

          {/* Title */}
          <h1 className="font-orbitron text-5xl md:text-7xl font-extrabold tracking-tight mb-4 leading-tight uppercase">
            SÀN ĐẤU <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 neon-text-cyan drop-shadow-[0_0_30px_rgba(0,240,255,0.3)]">
              {siteConfig.name}
            </span>
          </h1>

          {/* Tagline */}
          <div className="font-orbitron text-cyan-400 text-sm md:text-base font-bold tracking-[0.25em] uppercase mb-8 animate-pulse">
            {siteConfig.tagline}
          </div>

          {/* Subtitle */}
          <p className="text-slate-400 text-base md:text-lg max-w-3xl mx-auto mb-8 leading-relaxed font-medium">
            {siteConfig.description}
          </p>

          {/* Countdown Component */}
          <div className="w-full max-w-2xl mb-10">
            <Countdown targetDate={targetDate} phaseTitle={phaseTitle} />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            <Link
              href="/register"
              className="tech-btn-accent shimmer-btn font-orbitron font-bold inline-flex items-center justify-center gap-2 px-9 py-4 rounded-lg text-base tracking-wider hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(0,240,255,0.2)] text-black"
            >
              <Rocket className="w-5 h-5 text-black shrink-0" />
              <span>Đăng ký tham gia</span>
            </Link>
            <Link
              href="/login"
              className="tech-btn-primary font-orbitron font-bold inline-flex items-center justify-center px-8 py-4 rounded-lg text-base tracking-wider hover:scale-105 active:scale-95 transition-all duration-200 text-white"
            >
              Đăng nhập hệ thống
            </Link>
          </div>

          {/* Stats Grid — animated counter */}
          <StatsCounter />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-5xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center mb-12">
          <h2 className="font-orbitron text-2xl md:text-3xl font-bold tracking-widest uppercase mb-3">
            VỀ CUỘC THI
          </h2>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Lightbulb className="w-7 h-7 text-cyan-400" />,
              num: '01',
              title: 'Ý tưởng đột phá',
              desc: 'Chia sẻ các đề xuất khoa học, giải pháp công nghệ hoặc phần mềm đột phá giải quyết các bài toán thực tế.'
            },
            {
              icon: <Users className="w-7 h-7 text-cyan-400" />,
              num: '02',
              title: 'Đội ngũ phát triển',
              desc: 'Xây dựng đội nhóm 2-5 thành viên đa ngành (lập trình, kĩ thuật, thiết kế) để cùng thiết kế và tối ưu sản phẩm.'
            },
            {
              icon: <Trophy className="w-7 h-7 text-cyan-400" />,
              num: '03',
              title: 'Giải thưởng & Cơ hội',
              desc: 'Tranh tài trực tiếp trên sàn đấu công nghệ để nhận giải thưởng 100 triệu VNĐ cùng cơ hội gọi vốn startup.'
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
                <div className="p-3 bg-cyan-950/30 border border-cyan-800/30 rounded-lg inline-block mb-4 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition duration-300">
                  {item.icon}
                </div>
                <h3 className="font-orbitron text-base font-bold mb-3 tracking-wider text-slate-100 group-hover:text-cyan-400 transition">
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

      {/* Speakers & Judges Carousel */}
      <SpeakersSection />

      {/* Sponsors Marquee */}
      <SponsorsSection />

      <Footer />
    </div>
  )
}