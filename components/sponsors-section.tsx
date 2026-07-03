'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Sponsor = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  tier: 'platinum' | 'gold' | 'silver' | 'partner'
  display_order: number
}

const TIER_CONFIG: Record<Sponsor['tier'], { label: string; glow: string; border: string }> = {
  platinum: { label: 'PLATINUM', glow: 'shadow-[0_0_15px_rgba(226,232,240,0.15)]', border: 'border-slate-400/40' },
  gold:     { label: 'GOLD',     glow: 'shadow-[0_0_15px_rgba(251,191,36,0.12)]',  border: 'border-amber-400/40' },
  silver:   { label: 'SILVER',   glow: 'shadow-[0_0_12px_rgba(148,163,184,0.10)]', border: 'border-slate-500/30' },
  partner:  { label: 'PARTNER',  glow: '',                                           border: 'border-[#1e2d5a]' },
}

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const [imgError, setImgError] = useState(false)
  const tier = TIER_CONFIG[sponsor.tier]

  const inner = (
    <div
      className={`shrink-0 h-16 px-6 bg-[#0a1025] border rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-cyan-500/40 ${tier.border} ${tier.glow}`}
      title={`${sponsor.name} (${tier.label})`}
    >
      {sponsor.logo_url && !imgError ? (
        <img
          src={sponsor.logo_url}
          alt={sponsor.name}
          className="h-8 max-w-[120px] object-contain filter brightness-75 hover:brightness-110 transition"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-orbitron text-sm font-bold text-slate-400 tracking-wider whitespace-nowrap">
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

  const duration = sponsors.length * 3

  return (
    <section className="relative py-16 px-6 overflow-hidden border-t border-b border-[#1e2d5a]/40">
      {/* Faded edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050814] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050814] to-transparent z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto mb-8 text-center relative z-10">
        <p className="text-xs font-orbitron tracking-[0.3em] text-cyan-500/70 uppercase mb-2">SUPPORT NETWORK</p>
        <h2 className="font-orbitron text-3xl font-bold tracking-widest uppercase text-white">
          NHÀ TÀI TRỢ & ĐỐI TÁC
        </h2>
        <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-3 mx-auto" />
      </div>

      {/* Marquee track */}
      {loading ? (
        <div className="flex gap-6 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shrink-0 h-16 w-32 bg-[#0b1124] border border-[#1e2d5a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden group/marquee">
          <div
            className="flex w-max marquee-track"
            style={{ ['--marquee-duration' as string]: `${duration}s` }}
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-6" aria-hidden={copy === 1 ? true : undefined}>
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
