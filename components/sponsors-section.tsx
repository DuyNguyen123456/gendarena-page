'use client'

import { useEffect, useMemo, useState } from 'react'
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
  gold:     { label: 'GOLD',     border: 'border-amber-500/40' },
  silver:   { label: 'SILVER',   border: 'border-slate-500/30' },
  partner:  { label: 'PARTNER',  border: 'border-surface-border' },
}

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const [imgError, setImgError] = useState(false)
  const tier = TIER_CONFIG[sponsor.tier] || TIER_CONFIG.partner

  const inner = (
    <div
      className={`shrink-0 h-20 sm:h-24 md:h-26 min-w-[170px] sm:min-w-[200px] md:min-w-[230px] px-6 sm:px-8 bg-surface-raised/90 border rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-brand-cyan/50 hover:bg-surface-raised hover:shadow-[0_8px_25px_rgba(0,240,255,0.12)] ${tier.border}`}
      title={`${sponsor.name} (${tier.label})`}
    >
      {sponsor.logo_url && !imgError ? (
        <img
          src={sponsor.logo_url}
          alt={`Logo ${sponsor.name}`}
          className="h-10 sm:h-12 md:h-14 max-w-[130px] sm:max-w-[160px] md:max-w-[180px] object-contain opacity-90 hover:opacity-100 transition-opacity"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-display text-sm sm:text-base font-semibold text-text-primary tracking-wide whitespace-nowrap">
          {sponsor.name}
        </span>
      )}
    </div>
  )

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block shrink-0 focus:outline-none"
      >
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

  // Nhân bản danh sách nếu quá ít để đảm bảo một nửa track luôn phủ kín màn hình lớn, không bao giờ bị đứt quãng
  const displaySponsors = useMemo(() => {
    if (!sponsors.length) return []
    let list = [...sponsors]
    while (list.length < 8) {
      list = [...list, ...sponsors]
    }
    return list
  }, [sponsors])

  if (!loading && sponsors.length === 0) return null

  const duration = Math.max(displaySponsors.length * 3.5, 25)

  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60 overflow-hidden">
      {/* Faded side gradient edges for seamless feel */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 md:w-40 bg-gradient-to-r from-surface-base via-surface-base/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 md:w-40 bg-gradient-to-l from-surface-base via-surface-base/80 to-transparent z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto mb-10 sm:mb-12 text-center relative z-10">
        <Badge variant="brand" size="md" className="mb-3">
          ĐỐI TÁC ĐỒNG HÀNH
        </Badge>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
          Nhà Tài Trợ & Đối Tác
        </h2>
        <p className="text-text-secondary text-sm md:text-base mt-2 max-w-xl mx-auto leading-relaxed">
          Cảm ơn các doanh nghiệp và tổ chức công nghệ đã đồng hành cùng GenD Arena 2026.
        </p>
      </div>

      {/* Marquee track */}
      {loading ? (
        <div className="flex gap-5 sm:gap-6 md:gap-8 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="shrink-0 h-20 sm:h-24 md:h-26 w-44 sm:w-52 md:w-60 bg-surface-raised border border-surface-border rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden group/marquee py-2">
          <div
            className="flex w-max marquee-track"
            style={{ ['--marquee-duration' as string]: `${duration}s` }}
          >
            {/* Group 1 (50% width) */}
            <div className="flex shrink-0 items-center gap-5 sm:gap-6 md:gap-8 pr-5 sm:pr-6 md:pr-8">
              {displaySponsors.map((sponsor, idx) => (
                <SponsorLogo key={`s1-${sponsor.id}-${idx}`} sponsor={sponsor} />
              ))}
            </div>

            {/* Group 2 (50% width) - Identical duplicate for seamless infinite loop */}
            <div
              className="flex shrink-0 items-center gap-5 sm:gap-6 md:gap-8 pr-5 sm:pr-6 md:pr-8"
              aria-hidden="true"
            >
              {displaySponsors.map((sponsor, idx) => (
                <SponsorLogo key={`s2-${sponsor.id}-${idx}`} sponsor={sponsor} />
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: marquee-scroll var(--marquee-duration) linear infinite;
        }
        .group\\/marquee:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}
