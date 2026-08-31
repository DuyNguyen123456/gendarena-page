'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import type { EventWithStats, EventType } from '@/types/event'
import { getPublicEvents } from '@/services/events'
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Users,
  Video,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EventTypeBadge({ type }: { type: EventType }) {
  const configs: Record<
    EventType,
    { label: string; variant: 'brand' | 'warning' | 'info' | 'default'; icon: typeof Video }
  > = {
    webinar: { label: 'Webinar', variant: 'brand', icon: Video },
    kickoff: { label: 'Kick-off', variant: 'info', icon: Sparkles },
    finale: { label: 'Chung kết', variant: 'warning', icon: CalendarCheck },
    other: { label: 'Sự kiện', variant: 'default', icon: Calendar },
  }

  const config = configs[type] || configs.other
  const Icon = config.icon

  return (
    <Badge variant={config.variant} size="sm" className="gap-1 font-medium">
      <Icon className="size-3" />
      <span>{config.label}</span>
    </Badge>
  )
}

function formatDisplayDateTime(iso: string | null): string {
  if (!iso) return 'Thời gian: Thông báo sau'
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const loadData = async () => {
    try {
      setError(null)
      const data = await getPublicEvents()
      setEvents(data)
    } catch (err) {
      console.error('Failed to load public events:', err)
      setError('Không thể tải danh sách sự kiện lúc này. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleRefreshOnFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        getPublicEvents()
          .then((data) => setEvents(data))
          .catch(() => {})
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleRefreshOnFocus)
      document.addEventListener('visibilitychange', handleRefreshOnFocus)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleRefreshOnFocus)
        document.removeEventListener('visibilitychange', handleRefreshOnFocus)
      }
    }
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchType = typeFilter === 'all' || ev.event_type === typeFilter
      const matchQuery =
        !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchType && matchQuery
    })
  }, [events, searchQuery, typeFilter])

  if (loading) return <Loading text="Đang tải danh sách sự kiện & webinar..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-brand-cyan/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-accent-violet/10 blur-[130px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-10 border-b border-surface-border bg-surface-base/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            GenD Arena 2026 Events Hub
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text-primary">
            Sự Kiện &amp; Webinar Chuyên Sâu
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-text-secondary leading-relaxed">
            Đồng hành cùng các chuyên gia hàng đầu, ban giám khảo và quỹ đầu tư mạo hiểm trong chuỗi
            Webinar đào tạo kỹ năng gọi vốn, pitching đề án và đêm chung kết rực lửa.
          </p>
        </div>
      </section>

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-raised border border-surface-border p-3.5 rounded-xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện, webinar theo tên hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg">
              <Filter className="size-3.5 text-brand-cyan" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-text-primary outline-none cursor-pointer text-xs font-medium"
              >
                <option value="all" className="bg-surface-overlay text-text-primary">
                  Tất cả sự kiện ({events.length})
                </option>
                <option value="webinar" className="bg-surface-overlay text-text-primary">
                  Webinar Trực tuyến
                </option>
                <option value="kickoff" className="bg-surface-overlay text-text-primary">
                  Lễ phát động (Kick-off)
                </option>
                <option value="finale" className="bg-surface-overlay text-text-primary">
                  Chung kết (Grand Finale)
                </option>
                <option value="other" className="bg-surface-overlay text-text-primary">
                  Sự kiện khác
                </option>
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData()}
              title="Làm mới dữ liệu"
              className="size-10 p-0 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary border border-surface-border"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {/* Error Fallback */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger text-sm flex items-center justify-between gap-3"
          >
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData()}
              className="text-semantic-danger hover:bg-semantic-danger/10"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Card className="p-12 text-center text-text-tertiary border-dashed">
            <Calendar className="size-12 text-text-disabled mx-auto mb-3" />
            <p className="text-base font-medium text-text-secondary">
              {events.length === 0
                ? 'Hiện tại chưa có sự kiện nào mở đăng ký'
                : 'Không tìm thấy sự kiện phù hợp với tìm kiếm'}
            </p>
            <p className="text-xs text-text-tertiary mt-1.5">
              {events.length === 0
                ? 'Ban tổ chức sẽ sớm cập nhật lịch trình các buổi Webinar tiếp theo.'
                : 'Hãy thử xóa bộ lọc hoặc đổi từ khóa tìm kiếm.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => {
              const percent = Math.min(100, Math.round((ev.registered_count / (ev.total_tickets || 1)) * 100))
              const isFull = ev.remaining_tickets === 0

              return (
                <Card
                  key={ev.id}
                  className="flex flex-col justify-between p-6 transition-all duration-200 hover:border-surface-border-strong hover:shadow-elevation-2"
                >
                  <div className="space-y-4">
                    {/* Top Type & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <EventTypeBadge type={ev.event_type} />
                      {isFull ? (
                        <Badge variant="danger" size="sm" className="font-semibold">
                          Hết vé
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm" className="gap-1 font-medium">
                          <CheckCircle2 className="size-3" />
                          <span>Đang mở đăng ký</span>
                        </Badge>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h2 className="font-display text-lg font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-cyan transition-colors">
                        {ev.title}
                      </h2>
                      {ev.description && (
                        <p className="text-xs text-text-secondary line-clamp-3 mt-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="space-y-2 pt-2 border-t border-surface-border text-xs text-text-tertiary">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Clock className="size-4 text-brand-cyan shrink-0" />
                        <span className="truncate">{formatDisplayDateTime(ev.event_date)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-text-secondary">
                        <MapPin className="size-4 text-semantic-warning shrink-0" />
                        <span className="truncate">
                          {ev.location || 'Zoom Meeting Online (Sẽ gửi link)'}
                        </span>
                      </div>
                    </div>

                    {/* Ticket Progress */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-text-tertiary">
                          Đã đăng ký: <strong className="text-text-primary font-mono">{ev.registered_count}</strong> / {ev.total_tickets}
                        </span>
                        <span className="font-semibold text-brand-cyan">
                          {isFull ? 'Hết vé' : `Còn: ${ev.remaining_tickets} vé`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-surface-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull
                              ? 'bg-semantic-danger'
                              : percent >= 80
                              ? 'bg-semantic-warning'
                              : 'bg-brand-cyan'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-6">
                    {isFull ? (
                      <Button
                        variant="secondary"
                        size="md"
                        disabled
                        className="w-full justify-center opacity-60 cursor-not-allowed text-xs"
                      >
                        Đã hết vé tham dự
                      </Button>
                    ) : (
                      <Link href={`/events/${ev.id}`} className="block">
                        <Button
                          variant="primary"
                          size="md"
                          rightIcon={<ArrowRight className="size-4" />}
                          className="w-full justify-center text-xs font-semibold"
                        >
                          Đăng ký tham gia ngay
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
