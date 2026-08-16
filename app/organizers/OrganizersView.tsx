'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, ArrowUpRight, Users } from 'lucide-react'
import { siteConfig } from '@/config/site'
import Footer from '@/components/footer'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  },
]

interface OrganizerCardProps {
  org: Organizer
  logoError: boolean
  onImageError: (id: string) => void
}

function OrganizerCard({ org, logoError, onImageError }: OrganizerCardProps) {
  return (
    <Card
      className="p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-surface-overlay border-surface-border shadow-elevation-2 hover:border-brand-cyan/40 transition-all duration-300"
    >
      <div className="space-y-6">
        {/* Role badge */}
        <div>
          <Badge variant="brand" size="sm">
            {org.role}
          </Badge>
        </div>

        {/* Logo + name */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative size-20 sm:size-24 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden shrink-0">
            {logoError ? (
              <span className="font-mono text-xl font-bold text-brand-cyan">
                {org.initials}
              </span>
            ) : (
              <Image
                src={org.logoPath}
                alt={`Logo ${org.name}`}
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 80px, 96px"
                onError={() => onImageError(org.id)}
                priority
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight leading-tight">
              {org.name}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
          {org.description}
        </p>
      </div>

      {/* Card footer with links */}
      <div className="pt-4 border-t border-surface-border flex flex-wrap items-center gap-3">
        <Link
          href={org.facebook}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FacebookIcon className="size-3.5" />}
          >
            Facebook
          </Button>
        </Link>

        {org.email && (
          <Link href={`mailto:${org.email}`}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Mail className="size-3.5" />}
            >
              Email
            </Button>
          </Link>
        )}
      </div>
    </Card>
  )
}

export default function OrganizersView() {
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({})

  const handleImageError = (id: string) => {
    setLogoErrors((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-body">
      {/* Background ambient light */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-semibold text-brand-cyan uppercase tracking-wider">
            <Users className="size-3.5" />
            Ban tổ chức
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">
            Đội Ngũ <span className="text-brand-cyan">Kiến Tạo</span>
          </h1>

          <p className="max-w-2xl mx-auto text-text-secondary text-sm sm:text-base leading-relaxed">
            Gặp gỡ các tổ chức nòng cốt đồng hành và xây dựng nên đấu trường công nghệ &amp; khởi nghiệp{' '}
            <span className="font-semibold text-brand-cyan">GenD Arena 2026</span>.
          </p>
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
        <div className="text-center pt-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="md"
              rightIcon={<ArrowUpRight className="size-4" />}
            >
              Quay lại Trang chủ
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  )
}
