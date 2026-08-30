'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import ParticleField from '@/components/particle-field'
import DotGridBackground from '@/components/dot-grid-background'
import HeroBeam from '@/components/hero-beam'
import CursorSpotlight from '@/components/motion/cursor-spotlight'
import CursorCardGlow from '@/components/motion/cursor-card-glow'
import StatsCounter from '@/components/stats-counter'
import Countdown from '@/components/countdown'
import Footer from '@/components/footer'
import SpeakersSection from '@/components/speakers-section'
import SponsorsSection from '@/components/sponsors-section'
import TimelineSection from '@/components/timeline-section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { siteConfig } from '@/config/site'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Lightbulb, Users, Trophy, ArrowRight } from 'lucide-react'

// ─── Hero animation variants ───────────────────────────────────────────────
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const heroItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
}

interface HeroProps {
  targetDate: string
  phaseTitle: string
}

function HeroSection({ targetDate, phaseTitle }: HeroProps) {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-28 overflow-hidden">
      {/* Background layers (back to front) */}
      <HeroBeam />
      <DotGridBackground />
      <ParticleField />
      <CursorSpotlight />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-16 items-center">

          {/* Left Column: stagger reveal - Centered on mobile (<lg), Left-aligned on desktop (lg:) */}
          <motion.div
            className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={heroItem}>
              <Badge variant="brand" size="md" className="mb-4 sm:mb-5">
                GenD Arena · Mùa Giải 2026
              </Badge>
            </motion.div>

            {/* Brand Headline */}
            <motion.h1
              variants={heroItem}
              className="font-display font-semibold tracking-tight leading-tight mb-3 sm:mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-text-primary">
                GenD Arena
              </span>
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-brand-cyan">
                2026
              </span>
            </motion.h1>

            {/* Vietnamese tagline */}
            <motion.p
              variants={heroItem}
              className="font-display text-lg sm:text-xl md:text-2xl font-medium text-text-secondary mt-1 sm:mt-2 mb-2 sm:mb-3 max-w-md sm:max-w-lg lg:max-w-none"
            >
              Đấu Trường Khởi Nghiệp Công Nghệ Trẻ
            </motion.p>

            {/* Sub-tagline */}
            <motion.div
              variants={heroItem}
              className="font-display text-brand-cyan text-xs sm:text-sm md:text-base font-medium tracking-widest uppercase mb-4 sm:mb-5"
            >
              {siteConfig.tagline}
            </motion.div>

            {/* Description */}
            <motion.p
              variants={heroItem}
              className="text-text-secondary text-sm sm:text-base md:text-lg leading-relaxed max-w-md sm:max-w-lg lg:max-w-xl mb-6 sm:mb-8"
            >
              Sàn đấu khởi nghiệp công nghệ dành cho thế hệ trẻ — nơi ý tưởng đột phá gặp gỡ cố vấn chuyên gia và cơ hội gọi vốn với tổng giải thưởng 100 triệu VNĐ.
            </motion.p>

            {/* CTA Row - Full-width stacked on mobile (<sm), inline on sm+ */}
            <motion.div
              variants={heroItem}
              className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto max-w-xs sm:max-w-none justify-center lg:justify-start"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="group animate-subtle-pulse w-full sm:w-auto"
                >
                  <span>Đăng ký tham gia</span>
                  <ArrowRight className="size-4 shrink-0 transition-transform duration-[250ms] group-hover:translate-x-1 motion-reduce:transform-none" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Đăng nhập hệ thống
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div variants={heroItem} className="w-full">
              <StatsCounter />
            </motion.div>
          </motion.div>

          {/* Right Column: slide from right */}
          <motion.div
            className="lg:col-span-5 w-full flex flex-col justify-center max-w-md mx-auto lg:max-w-none mt-4 sm:mt-6 lg:mt-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT }}
          >
            <Countdown targetDate={targetDate} phaseTitle={phaseTitle} />

            {/* Live Phase Indicator */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-4 py-2.5 bg-surface-raised/80 border border-surface-border rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-semantic-success opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-semantic-success" />
                </span>
                <span className="text-text-secondary">
                  Vòng hiện tại:{' '}
                  <span className="text-text-primary font-medium">{phaseTitle}</span>
                </span>
              </div>
              <span className="font-display font-medium text-brand-cyan shrink-0">
                Đang nhận đề án
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

// ─── CORE VALUES section data ─────────────────────────────────────────────
const CORE_VALUES = [
  {
    icon: <Lightbulb className="size-6 text-brand-cyan card-icon" />,
    title: 'Ý Tưởng Đột Phá',
    desc: 'Thử thách giải quyết các bài toán thị trường thực tế bằng phần mềm, AI và giải pháp công nghệ tối ưu.',
  },
  {
    icon: <Users className="size-6 text-brand-cyan card-icon" />,
    title: 'Đội Ngũ Đa Ngành',
    desc: 'Kết nối sinh viên đa lĩnh vực từ kỹ thuật, thiết kế UI/UX đến kinh doanh và quản trị sản phẩm.',
  },
  {
    icon: <Trophy className="size-6 text-brand-cyan card-icon" />,
    title: 'Giải Thưởng & Đầu Tư',
    desc: 'Tổng giá trị giải thưởng 100 triệu VNĐ kèm cơ hội ươm tạo, kết nối mạng lưới quỹ đầu tư mạo hiểm.',
  },
]

// ─── CLIENT WRAPPER (framer-motion requires 'use client') ─────────────────
export default function LandingClient({
  targetDate,
  phaseTitle,
  phases,
}: {
  targetDate: string
  phaseTitle: string
  phases: any[]
}) {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary relative overflow-hidden pb-0">

      {/* ─── SECTION 1: HERO ───────────────────────────────────────────────── */}
      <HeroSection targetDate={targetDate} phaseTitle={phaseTitle} />

      {/* ─── SECTION 2: CORE VALUES ─────────────────────────────────────── */}
      <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60">
        <div className="max-w-7xl mx-auto relative z-10">
          <RevealOnScroll className="flex flex-col items-center text-center mb-10 sm:mb-12 md:mb-16">
            <Badge variant="brand" size="md" className="mb-3">GIÁ TRỊ CỐT LÕI</Badge>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-3">
              Tại Sao Nên Tham Gia GenD Arena?
            </h2>
            <p className="text-text-secondary text-sm md:text-base max-w-xl">
              Nền tảng bứt phá dành cho các nhà khởi nghiệp công nghệ tương lai.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {CORE_VALUES.map((item, idx) => (
                <Card key={idx} interactive className="card-hover-glow flex flex-col justify-between h-full relative overflow-hidden">
                  <CursorCardGlow />
                  <CardHeader className="relative z-10">
                    <div className="size-11 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center mb-4">
                      {item.icon}
                    </div>
                    <CardTitle className="text-lg md:text-xl font-semibold text-text-primary">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <CardDescription className="text-text-secondary text-sm leading-relaxed mt-0">
                      {item.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── SECTION 3: TIMELINE ────────────────────────────────────────── */}
      <RevealOnScroll>
        <TimelineSection phases={phases} />
      </RevealOnScroll>

      {/* ─── SECTION 4: SPEAKERS ────────────────────────────────────────── */}
      <RevealOnScroll>
        <SpeakersSection />
      </RevealOnScroll>

      {/* ─── SECTION 5: SPONSORS ────────────────────────────────────────── */}
      <RevealOnScroll>
        <SponsorsSection />
      </RevealOnScroll>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
