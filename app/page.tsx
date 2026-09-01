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

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: phases } = await supabase
    .from('competition_phases')
    .select('*')
    .order('display_order', { ascending: true })

  // Find the active countdown phase dynamically
  // 1. Look for phase with status active
  // 2. Or phase with open submission
  // 3. Or registration / sơ loại / dream / earliest phase
  const targetPhase =
    phases?.find((p) => p.status === 'active') ||
    phases?.find((p) => p.submission_open) ||
    phases?.find(
      (p) =>
        p.title?.toLowerCase().includes('mở đơn') ||
        p.title?.toLowerCase().includes('đăng ký') ||
        p.title?.toLowerCase().includes('sơ loại') ||
        p.title?.toLowerCase().includes('dream')
    ) ||
    phases?.[0]

  // Priority: 1. submission_opens_at (exact ISO datetime with hours/mins), 2. start_date, 3. default fallback
  const targetDate =
    targetPhase?.submission_opens_at ||
    (targetPhase?.start_date
      ? targetPhase.start_date.includes('T')
        ? targetPhase.start_date
        : `${targetPhase.start_date}T00:00:00+07:00`
      : '2026-09-01T00:00:00+07:00')

  const phaseTitle = targetPhase?.title || 'Vòng Sơ Loại'

  return (
    <LandingClient
      targetDate={targetDate}
      phaseTitle={phaseTitle}
      phases={phases || []}
    />
  )
}