'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

function getCategoryBadge(category: Speaker['category']) {
  if (category === 'judge') {
    return <Badge variant="brand" size="sm">Giám khảo</Badge>
  }
  if (category === 'mentor') {
    return <Badge variant="warning" size="sm">Cố vấn</Badge>
  }
  return <Badge variant="info" size="sm">Diễn giả</Badge>
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="shrink-0 w-[240px] sm:w-64 md:w-72 bg-surface-raised border border-surface-border hover:border-surface-border-strong hover:shadow-elevation-2 p-5 sm:p-6 rounded-xl flex flex-col gap-3.5 sm:gap-4 transition-all duration-[250ms] group snap-start">
      {/* Avatar */}
      <div className="relative flex items-center justify-center mx-auto">
        <div className="size-16 sm:size-20 rounded-full border-2 border-surface-border group-hover:border-brand-cyan/50 transition-colors overflow-hidden bg-surface-overlay flex items-center justify-center">
          {speaker.avatar_url && !imgError ? (
            <img
              src={speaker.avatar_url}
              alt={`Ảnh đại diện ${speaker.name}`}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="font-display text-xl sm:text-2xl font-bold text-brand-cyan select-none">
              {speaker.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Category Badge */}
      <div className="flex justify-center">
        {getCategoryBadge(speaker.category)}
      </div>

      {/* Info */}
      <div className="text-center">
        <h3 className="font-display text-base font-semibold text-text-primary group-hover:text-brand-cyan transition-colors leading-snug">
          {speaker.name}
        </h3>
        {speaker.title && (
          <p className="text-xs text-text-secondary mt-1 font-medium leading-snug">
            {speaker.title}
          </p>
        )}
        {speaker.organization && (
          <p className="text-xs text-brand-cyan/80 mt-0.5 font-display font-medium tracking-wide">
            {speaker.organization}
          </p>
        )}
      </div>

      {/* Bio truncated */}
      {speaker.bio && (
        <p className="text-xs text-text-tertiary leading-relaxed line-clamp-3 text-center">
          {speaker.bio}
        </p>
      )}

      {/* LinkedIn */}
      {speaker.linkedin_url && (
        <a
          href={speaker.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-center text-xs font-medium text-brand-cyan hover:text-brand-cyan-bright transition-colors"
        >
          Hồ sơ LinkedIn →
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
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-8 sm:mb-10 gap-4">
          <div className="text-center md:text-left">
            <Badge variant="brand" size="md" className="mb-3">
              HỘI ĐỒNG CHUYÊN GIA
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
              Diễn Giả & Giám Khảo
            </h2>
            <p className="text-text-secondary text-sm md:text-base mt-2">
              Đội ngũ cố vấn và chuyên gia hàng đầu từ các doanh nghiệp công nghệ & quỹ đầu tư.
            </p>
          </div>

          {/* Scroll buttons */}
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={scrollLeft}
              aria-label="Scroll left"
              className="p-2"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={scrollRight}
              aria-label="Scroll right"
              className="p-2"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        {loading ? (
          <div className="flex gap-4 sm:gap-5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[240px] sm:w-64 md:w-72 h-80 bg-surface-raised border border-surface-border rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide px-1"
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
