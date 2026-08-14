'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

type Sponsor = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  tier: 'platinum' | 'gold' | 'silver' | 'partner'
  display_order: number
}

const TIER_CONFIG: Record<Sponsor['tier'], { label: string; border: string }> = {
  platinum: { label: 'PLATINUM', border: 'border-slate-300/40' },
  gold:     { label: 'GOLD',     border: 'border-semantic-warning/40' },
  silver:   { label: 'SILVER',   border: 'border-slate-500/30' },
  partner:  { label: 'PARTNER',  border: 'border-surface-border' },
}

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const [imgError, setImgError] = useState(false)
  const tier = TIER_CONFIG[sponsor.tier]

  const inner = (
    <div
      className={`shrink-0 h-14 sm:h-16 px-4 sm:px-6 mr-4 sm:mr-6 bg-surface-raised border rounded-xl flex items-center justify-center transition-colors duration-[250ms] hover:border-brand-cyan/40 ${tier.border}`}
      title={`${sponsor.name} (${tier.label})`}
    >
      {sponsor.logo_url && !imgError ? (
        <img
          src={sponsor.logo_url}
          alt={`Logo ${sponsor.name}`}
          className="h-6 sm:h-8 max-w-[110px] sm:max-w-[130px] object-contain opacity-80 hover:opacity-100 transition-opacity"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-display text-xs sm:text-sm font-semibold text-text-secondary tracking-wide whitespace-nowrap">
          {sponsor.name}
        </span>
      )}
    </div>
  )

  if (sponsor.website_url) {
    return (
      <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    )
  }
  return inner
}

export default function SponsorsSection() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsors')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setSponsors(data as Sponsor[])
        setLoading(false)
      })
  }, [])

  if (!loading && sponsors.length === 0) return null

  const duration = Math.max(sponsors.length * 3.5, 20)

  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60 overflow-hidden">
      {/* Faded edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 md:w-32 bg-gradient-to-r from-surface-base to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 md:w-32 bg-gradient-to-l from-surface-base to-transparent z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto mb-8 sm:mb-10 text-center relative z-10">
        <Badge variant="brand" size="md" className="mb-3">
          ĐỐI TÁC ĐỒNG HÀNH
        </Badge>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
          Nhà Tài Trợ & Đối Tác
        </h2>
        <p className="text-text-secondary text-sm md:text-base mt-2 max-w-xl mx-auto">
          Cảm ơn các doanh nghiệp và tổ chức công nghệ đã đồng hành cùng GenD Arena 2026.
        </p>
      </div>

      {/* Marquee track */}
      {loading ? (
        <div className="flex gap-4 sm:gap-6 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="shrink-0 h-14 sm:h-16 w-28 sm:w-36 bg-surface-raised border border-surface-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden group/marquee">
          <div
            className="flex w-max marquee-track"
            style={{ ['--marquee-duration' as string]: `${duration}s` }}
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 ? true : undefined}>
                {sponsors.map((sponsor) => (
                  <SponsorLogo key={`${sponsor.id}-${copy}`} sponsor={sponsor} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .marquee-track {
          animation: marquee-scroll var(--marquee-duration) linear infinite;
        }
        .group\\/marquee:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
