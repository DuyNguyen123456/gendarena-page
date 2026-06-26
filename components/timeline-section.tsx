import type { CompetitionPhase, PhaseStatus } from '@/types/phase'
import { Book, Microscope, Trophy, Flag, Star, Circle, Calendar, Target, ClipboardList, PenTool } from 'lucide-react'

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
    return (
      <span className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">
        ● ĐANG MỞ
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="bg-blue-950/50 border border-blue-500/40 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">
        ✓ ĐÃ KẾT THÚC
      </span>
    )
  }
  // upcoming
  return (
    <span className="bg-slate-800/60 border border-slate-600/40 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">
      SẮP TỚI
    </span>
  )
}

function getIconComponent(iconName: string) {
  const name = iconName?.toLowerCase() || ''
  if (name.includes('book')) return <Book className="w-3 h-3" />
  if (name.includes('microscope')) return <Microscope className="w-3 h-3" />
  if (name.includes('trophy')) return <Trophy className="w-3 h-3" />
  if (name.includes('flag')) return <Flag className="w-3 h-3" />
  if (name.includes('star')) return <Star className="w-3 h-3" />
  if (name.includes('calendar')) return <Calendar className="w-3 h-3" />
  if (name.includes('target')) return <Target className="w-3 h-3" />
  if (name.includes('clipboard')) return <ClipboardList className="w-3 h-3" />
  if (name.includes('pen')) return <PenTool className="w-3 h-3" />
  return <Circle className="w-3 h-3" />
}

export default function TimelineSection({ phases }: TimelineSectionProps) {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      {/* Section background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070c1e]/80 to-transparent pointer-events-none" />
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[600px] bg-[#112E81]/5 blur-[80px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col items-center mb-14">
          <p className="text-xs font-orbitron tracking-[0.3em] text-cyan-500/70 uppercase mb-3">MISSION TIMELINE</p>
          <h2 className="font-orbitron text-3xl font-bold tracking-widest uppercase mb-3">
            LỊCH TRÌNH ĐẤU TRƯỜNG
          </h2>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        </div>

        {(!phases || phases.length === 0) ? (
          <div className="tech-panel p-12 text-center border-cyan-500/10">
            <p className="text-slate-500 text-sm font-semibold tracking-wide">
              Lịch trình đang được cập nhật. Vui lòng quay lại sau.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/60 via-blue-500/30 to-transparent md:-translate-x-1/2 pointer-events-none" />

            <div className="space-y-10">
              {phases.map((phase, idx) => {
                const isLeft = idx % 2 === 0
                const isActive = phase.status === 'active'
                return (
                  <div
                    key={phase.id}
                    className={`relative flex items-start gap-6 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  >
                    {/* Content box */}
                    <div className={`flex-1 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-16 md:pl-0`}>
                      <div className={`tech-panel-glow p-5 hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1 ${isActive ? 'border-cyan-400/30 shadow-[0_0_20px_rgba(0,240,255,0.08)]' : ''}`}>
                        <div className={`flex items-center gap-2 mb-2 ${isLeft ? 'md:flex-row-reverse md:justify-start' : ''}`}>
                          <span className="font-orbitron text-xs text-cyan-500/60 tracking-widest">
                            PHASE {String(phase.phase_number).padStart(2, '0')}
                          </span>
                          <StatusBadge status={phase.status} />
                        </div>
                        <h3 className="font-orbitron text-base font-bold text-white tracking-wide uppercase mb-1">
                          {phase.title}
                        </h3>
                        <div className="text-xs font-bold text-cyan-400 font-orbitron mb-2 tracking-wider">
                          {formatDateRange(phase.start_date, phase.end_date)}
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">{phase.description}</p>
                      </div>
                    </div>

                    {/* Center node */}
                    <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 top-5 flex items-center justify-center">
                      <div className={`timeline-node w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-950 text-cyan-400'
                          : 'border-[#1e2d5a] bg-[#0b1124] text-slate-400'
                      }`}>
                        {getIconComponent(phase.icon)}
                      </div>
                    </div>

                    {/* Empty spacer for alternating layout on md+ */}
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
