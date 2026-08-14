import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { siteConfig } from '@/config/site'
import LandingClient from '@/app/_landing/landing-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
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

  // Find the registration/application start date dynamically — FROZEN
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
    <LandingClient
      targetDate={targetDate}
      phaseTitle={phaseTitle}
      phases={phases || []}
    />
  )
}