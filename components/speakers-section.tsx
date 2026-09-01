'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Users, Filter } from 'lucide-react'

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

const TABS: { key: Speaker['category']; label: string }[] = [
  { key: 'judge', label: 'Giám khảo' },
  { key: 'speaker', label: 'Diễn giả' },
  { key: 'mentor', label: 'Cố vấn' },
]

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
  const [activeCategory, setActiveCategory] = useState<Speaker['category']>('judge')
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

  const filteredSpeakers = speakers.filter((s) => s.category === activeCategory)

  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60">
      <div className="max-w-7xl mx-auto relative z-10 space-y-8 sm:space-y-10">
        {/* Centered Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-semibold text-brand-cyan uppercase tracking-wider">
            <Users className="size-3.5" />
            Hội đồng chuyên gia
          </div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
            Diễn Giả &amp; Giám Khảo
          </h2>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed">
            Đội ngũ cố vấn và chuyên gia hàng đầu từ các doanh nghiệp công nghệ &amp; quỹ đầu tư.
          </p>
        </div>

        {/* Refined Filter Controls & Scroll Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 sm:gap-4">
          {/* Subtle Segmented Pill Filter with horizontal scroll on mobile */}
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide py-1 flex justify-center sm:justify-start">
            <div
              role="tablist"
              aria-label="Phân loại hội đồng chuyên gia"
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-raised border border-surface-border min-w-max"
            >
              <span className="pl-2 pr-1 text-text-disabled text-xs hidden sm:inline-flex items-center gap-1" aria-hidden="true">
                <Filter className="size-3 text-text-tertiary" />
              </span>
              {TABS.map((tab) => {
                const count = speakers.filter((s) => s.category === tab.key).length
                const isActive = activeCategory === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`speaker-tab-${tab.key}`}
                    aria-controls="speaker-tab-panel"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan font-semibold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay/60 border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1 rounded ${
                          isActive ? 'bg-brand-cyan/20 text-brand-cyan' : 'text-text-tertiary'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Carousel Buttons */}
          {filteredSpeakers.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollLeft}
                aria-label="Cuộn sang trái"
                className="size-8 p-0 flex items-center justify-center rounded-lg"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollRight}
                aria-label="Cuộn sang phải"
                className="size-8 p-0 flex items-center justify-center rounded-lg"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Carousel / List View */}
        <div id="speaker-tab-panel" role="tabpanel" aria-labelledby={`speaker-tab-${activeCategory}`}>
          {loading ? (
            <div className="flex gap-4 sm:gap-5 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="shrink-0 w-[240px] sm:w-64 md:w-72 h-80 bg-surface-raised border border-surface-border rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredSpeakers.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-overlay/60 p-8 text-center text-text-tertiary space-y-1">
              <p className="text-sm font-medium text-text-secondary">Chưa có thông tin trong danh mục này.</p>
              <p className="text-xs text-text-tertiary">Thông tin sẽ được ban tổ chức cập nhật sớm.</p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredSpeakers.map((speaker) => (
                <SpeakerCard key={speaker.id} speaker={speaker} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
