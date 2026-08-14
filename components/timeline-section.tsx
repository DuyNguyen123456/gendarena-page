import type { CompetitionPhase, PhaseStatus } from '@/types/phase'
import { Book, Microscope, Trophy, Flag, Star, Circle, Calendar, Target, ClipboardList, PenTool } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TimelineSectionProps {
  phases: CompetitionPhase[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Chưa xác định'
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return `Từ ${formatDate(start)}`
  return `Đến ${formatDate(end)}`
}

function StatusBadge({ status }: { status: PhaseStatus }) {
  if (status === 'active') {
    return <Badge variant="success" size="sm">Đang mở</Badge>
  }
  if (status === 'completed') {
    return <Badge variant="default" size="sm">Đã kết thúc</Badge>
  }
  return <Badge variant="warning" size="sm">Sắp tới</Badge>
}

function getIconComponent(iconName: string) {
  const name = iconName?.toLowerCase() || ''
  if (name.includes('book')) return <Book className="size-3.5" />
  if (name.includes('microscope')) return <Microscope className="size-3.5" />
  if (name.includes('trophy')) return <Trophy className="size-3.5" />
  if (name.includes('flag')) return <Flag className="size-3.5" />
  if (name.includes('star')) return <Star className="size-3.5" />
  if (name.includes('calendar')) return <Calendar className="size-3.5" />
  if (name.includes('target')) return <Target className="size-3.5" />
  if (name.includes('clipboard')) return <ClipboardList className="size-3.5" />
  if (name.includes('pen')) return <PenTool className="size-3.5" />
  return <Circle className="size-3.5" />
}

export default function TimelineSection({ phases }: TimelineSectionProps) {
  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12 md:mb-16">
          <Badge variant="brand" size="md" className="mb-3">
            LỘ TRÌNH
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-3">
            Lịch Trình Đấu Trường
          </h2>
          <p className="text-text-secondary text-sm md:text-base max-w-xl">
            Các cột mốc quan trọng từ vòng sơ loại, đào tạo đến chung kết toàn quốc.
          </p>
        </div>

        {(!phases || phases.length === 0) ? (
          <div className="bg-surface-raised border border-surface-border rounded-xl p-8 sm:p-12 text-center">
            <p className="text-text-secondary text-sm font-medium">
              Lịch trình đang được cập nhật. Vui lòng quay lại sau.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-4 sm:left-6 md:left-1/2 top-4 bottom-4 w-px bg-surface-border md:-translate-x-1/2 pointer-events-none" />

            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {phases.map((phase, idx) => {
                const isLeft = idx % 2 === 0
                const isActive = phase.status === 'active'
                return (
                  <div
                    key={phase.id}
                    className={`relative flex items-start gap-4 md:gap-0 ${
                      isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Content box */}
                    <div className={`flex-1 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-9 sm:pl-12 md:pl-0`}>
                      <div
                        className={`bg-surface-raised p-4 sm:p-5 md:p-6 rounded-xl border transition-all duration-[250ms] ${
                          isActive
                            ? 'border-brand-cyan/40 shadow-elevation-2'
                            : 'border-surface-border hover:border-surface-border-strong'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-2 flex-wrap ${
                            isLeft ? 'md:flex-row-reverse md:justify-start' : ''
                          }`}
                        >
                          <span className="font-display text-xs font-semibold text-brand-cyan tracking-wider uppercase">
                            Giai đoạn {String(phase.phase_number).padStart(2, '0')}
                          </span>
                          <StatusBadge status={phase.status} />
                        </div>
                        <h3 className="font-display text-base md:text-lg font-semibold text-text-primary mb-1">
                          {phase.title}
                        </h3>
                        <div className="font-mono text-xs font-medium text-brand-cyan/90 mb-2.5">
                          {formatDateRange(phase.start_date, phase.end_date)}
                        </div>
                        <p className="text-text-secondary text-sm leading-relaxed">
                          {phase.description}
                        </p>
                      </div>
                    </div>

                    {/* Center node */}
                    <div className="absolute left-1 sm:left-3 md:left-1/2 md:-translate-x-1/2 top-4 sm:top-5 flex items-center justify-center">
                      <div
                        className={`size-6 rounded-full border flex items-center justify-center z-10 transition-colors ${
                          isActive
                            ? 'border-brand-cyan bg-brand-cyan/20 text-brand-cyan'
                            : 'border-surface-border bg-surface-overlay text-text-tertiary'
                        }`}
                      >
                        {getIconComponent(phase.icon)}
                      </div>
                    </div>

                    {/* Spacer for alternating layout */}
                    <div className="hidden md:block flex-1" />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
