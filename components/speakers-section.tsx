'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Speaker = {
  id: string
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  avatar_url: string | null
  linkedin_url: string | null
  category: 'speaker' | 'judge' | 'mentor'
  display_order: number
}

const CATEGORY_LABELS: Record<Speaker['category'], { label: string; color: string; bg: string }> = {
  speaker: { label: 'DIỄN GIẢ', color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-500/30' },
  judge:   { label: 'GIÁM KHẢO', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/30' },
  mentor:  { label: 'CỐ VẤN',    color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-500/30' },
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const [imgError, setImgError] = useState(false)
  const cat = CATEGORY_LABELS[speaker.category]

  return (
    <div className="shrink-0 w-64 md:w-72 tech-panel-glow border-cyan-500/15 hover:border-cyan-400/40 p-6 rounded-2xl flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 group snap-start">
      {/* Avatar */}
      <div className="relative flex items-center justify-center mx-auto">
        <div
          className="w-20 h-20 rounded-full border-2 border-cyan-500/30 group-hover:border-cyan-400/60 transition overflow-hidden bg-[#131e3d] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.08)]"
        >
          {speaker.avatar_url && !imgError ? (
            <img
              src={speaker.avatar_url}
              alt={speaker.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="font-orbitron text-2xl font-extrabold text-cyan-400 select-none">
              {speaker.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-400/10 group-hover:border-cyan-400/30 transition blur-[2px] pointer-events-none" />
      </div>

      {/* Category Badge */}
      <div className="flex justify-center">
        <span className={`text-[10px] font-orbitron font-bold tracking-widest px-2.5 py-0.5 rounded border ${cat.bg} ${cat.color}`}>
          {cat.label}
        </span>
      </div>

      {/* Info */}
      <div className="text-center">
        <h3 className="font-orbitron text-sm font-bold text-white tracking-wider group-hover:text-cyan-400 transition leading-snug">
          {speaker.name}
        </h3>
        {speaker.title && (
          <p className="text-xs text-slate-400 mt-1 font-semibold leading-snug">{speaker.title}</p>
        )}
        {speaker.organization && (
          <p className="text-[11px] text-cyan-500/70 mt-0.5 font-orbitron tracking-wider">{speaker.organization}</p>
        )}
      </div>

      {/* Bio truncated */}
      {speaker.bio && (
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 text-center">
          {speaker.bio}
        </p>
      )}

      {/* LinkedIn */}
      {speaker.linkedin_url && (
        <a
          href={speaker.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-center text-[10px] font-bold font-orbitron tracking-widest text-cyan-400/70 hover:text-cyan-400 transition uppercase"
        >
          LinkedIn →
        </a>
      )}
    </div>
  )
}

export default function SpeakersSection() {
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('speakers')
      .select('*')
      .eq('is_featured', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setSpeakers(data as Speaker[])
        setLoading(false)
      })
  }, [])

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })
  }
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })
  }

  if (!loading && speakers.length === 0) return null

  return (
    <section className="relative py-20 px-6 overflow-hidden">
      {/* Bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060b1a]/80 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-10 gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs font-orbitron tracking-[0.3em] text-cyan-500/70 uppercase mb-2">EXPERT PANEL</p>
            <h2 className="font-orbitron text-3xl font-bold tracking-widest uppercase text-white">
              DIỄN GIẢ & GIÁM KHẢO
            </h2>
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-3 mx-auto md:mx-0" />
          </div>

          {/* Scroll buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={scrollLeft}
              className="w-10 h-10 rounded-lg border border-[#1e2d5a] bg-[#0b1124] hover:border-cyan-500/50 hover:text-cyan-400 text-slate-400 flex items-center justify-center transition cursor-pointer"
              aria-label="Scroll left"
            >
              ←
            </button>
            <button
              onClick={scrollRight}
              className="w-10 h-10 rounded-lg border border-[#1e2d5a] bg-[#0b1124] hover:border-cyan-500/50 hover:text-cyan-400 text-slate-400 flex items-center justify-center transition cursor-pointer"
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </div>

        {/* Carousel */}
        {loading ? (
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shrink-0 w-64 md:w-72 h-72 bg-[#0b1124] border border-[#1e2d5a] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {speakers.map((speaker) => (
              <SpeakerCard key={speaker.id} speaker={speaker} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
