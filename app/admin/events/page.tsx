'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { EventWithStats, EventFormData, EventType, EventRegistration } from '@/types/event'
import {
  getAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventStatus,
  getEventRegistrations,
} from '@/services/events'
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Plus,
  Pencil,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  MapPin,
  Ticket,
  Users,
  Video,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EventTypeBadge({ type }: { type: EventType }) {
  const configs: Record<
    EventType,
    { label: string; variant: 'brand' | 'warning' | 'info' | 'default'; icon: typeof Video }
  > = {
    webinar: { label: 'Webinar', variant: 'brand', icon: Video },
    kickoff: { label: 'Kick-off', variant: 'info', icon: Sparkles },
    finale: { label: 'Chung kết', variant: 'warning', icon: CalendarCheck },
    other: { label: 'Sự kiện khác', variant: 'default', icon: Calendar },
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

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  try {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch {
    return null
  }
}

function formatDisplayDateTime(iso: string | null): string {
  if (!iso) return 'Chưa ấn định thời gian'
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

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40)
}

const DEFAULT_FORM: EventFormData = {
  title: '',
  description: '',
  event_type: 'webinar',
  event_date: null,
  location: '',
  total_tickets: 100,
  is_open: true,
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  // Dialog & Action States
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const data = await getAdminEvents()
      setEvents(data)
    } catch (e) {
      console.error('Failed to load events:', e)
      setError('Không thể tải danh sách sự kiện. Vui lòng thử lại.')
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = (await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()) as { data: { role: string } | null }

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await loadData()
      if (isMounted) setLoading(false)
    }
    init()
    return () => {
      isMounted = false
    }
  }, [router, supabase, loadData])

  // ─── Modal Open Handler ─────────────────────────────────────────────────────

  const handleOpenModal = (event?: EventWithStats) => {
    if (event) {
      setEditingId(event.id)
      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        event_date: event.event_date ? isoToDatetimeLocal(event.event_date) : null,
        location: event.location || '',
        total_tickets: event.total_tickets,
        is_open: event.is_open,
      })
    } else {
      setEditingId(null)
      setFormData(DEFAULT_FORM)
    }
    setShowModal(true)
  }

  // ─── Submit Form ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const payload: EventFormData = {
        ...formData,
        event_date: formData.event_date ? datetimeLocalToIso(formData.event_date) : null,
      }

      const res = editingId
        ? await updateEvent(editingId, payload)
        : await createEvent(payload)

      if (res.error) throw new Error(res.error)

      setShowModal(false)
      setMessage({
        text: editingId ? 'Đã cập nhật sự kiện thành công.' : 'Đã tạo sự kiện mới thành công.',
        ok: true,
      })
      await loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      console.error('Save event error:', msg)
      setMessage({ text: 'Lỗi khi lưu sự kiện: ' + msg, ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Toggle Open/Close ──────────────────────────────────────────────────────

  const handleToggleStatus = async (event: EventWithStats) => {
    setTogglingId(event.id)
    setMessage(null)
    const newStatus = !event.is_open
    const { error: toggleErr } = await toggleEventStatus(event.id, newStatus)
    setTogglingId(null)

    if (toggleErr) {
      console.error('Toggle status error:', toggleErr)
      setMessage({ text: 'Lỗi khi thay đổi trạng thái: ' + toggleErr, ok: false })
    } else {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, is_open: newStatus } : e))
      )
      setMessage({
        text: `Đã ${newStatus ? 'mở' : 'đóng'} đăng ký cho sự kiện "${event.title}".`,
        ok: true,
      })
    }
  }

  // ─── Delete Handler ─────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      const { error: delErr } = await deleteEvent(id)
      if (delErr) throw new Error(delErr)
      await loadData()
      setMessage({ text: 'Đã xoá sự kiện thành công.', ok: true })
    } catch (e) {
      console.error('Failed to delete event:', e)
      setMessage({
        text: 'Lỗi khi xóa sự kiện: ' + (e instanceof Error ? e.message : 'Không xác định'),
        ok: false,
      })
    }
  }

  // ─── Export CSV Handler ─────────────────────────────────────────────────────

  const handleExportCsv = async (event: EventWithStats) => {
    setExportingId(event.id)
    try {
      const registrations = await getEventRegistrations(event.id)

      if (registrations.length === 0) {
        setMessage({
          text: `Sự kiện "${event.title}" hiện chưa có lượt đăng ký nào để xuất file.`,
          ok: false,
        })
        setExportingId(null)
        return
      }

      const headers = [
        'Họ và tên',
        'Email',
        'Số điện thoại',
        'Trường đại học',
        'Khoa / Viện',
        'Mã số sinh viên',
        'User ID',
        'Thời gian đăng ký',
      ]

      const escapeCsv = (val: string | null | undefined) => {
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      }

      const csvRows = [
        headers.join(','),
        ...registrations.map((r: EventRegistration) =>
          [
            escapeCsv(r.full_name),
            escapeCsv(r.email),
            escapeCsv(r.phone),
            escapeCsv(r.university),
            escapeCsv(r.faculty),
            escapeCsv(r.student_id),
            escapeCsv(r.user_id),
            escapeCsv(r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''),
          ].join(',')
        ),
      ]

      // Prepend UTF-8 BOM so Excel opens Vietnamese characters with correct encoding
      const csvContent = '\uFEFF' + csvRows.join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      const filename = `DanhSach_${sanitizeFilename(event.title)}_${new Date().toISOString().slice(0, 10)}.csv`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setMessage({
        text: `Đã xuất thành công ${registrations.length} lượt đăng ký cho sự kiện "${event.title}".`,
        ok: true,
      })
    } catch (err) {
      console.error('Export CSV error:', err)
      setMessage({
        text: 'Lỗi khi xuất CSV: ' + (err instanceof Error ? err.message : 'Không xác định'),
        ok: false,
      })
    } finally {
      setExportingId(null)
    }
  }

  // ─── Filtered Events ────────────────────────────────────────────────────────

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

  // ─── Summary Stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = events.length
    const open = events.filter((e) => e.is_open).length
    const totalTickets = events.reduce((sum, e) => sum + e.total_tickets, 0)
    const totalRegistered = events.reduce((sum, e) => sum + e.registered_count, 0)
    return { total, open, totalTickets, totalRegistered }
  }, [events])

  if (loading) return <Loading text="Đang tải dữ liệu quản trị sự kiện..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-violet/5 blur-[120px]" />
      </div>

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-[150ms] mb-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại Control Center
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">
                  BTC
                </Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý sự kiện &amp; Vé tham dự
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Tạo webinar, kickoff, chung kết, kiểm soát số lượng vé và xuất danh sách người tham gia
              </p>
            </div>
            <Button
              id="create-event-btn"
              variant="primary"
              size="md"
              leftIcon={<Plus className="size-4" />}
              onClick={() => handleOpenModal()}
            >
              Tạo sự kiện mới
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Error Fallback Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 px-4 py-3 text-sm text-semantic-danger"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData()}
              className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger shrink-0"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div
            role={message.ok ? 'status' : 'alert'}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all ${
              message.ok
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {message.ok ? (
              <CheckCircle className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Summary Stats Grid */}
        <section aria-label="Thống kê tổng quan sự kiện">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-tertiary">Tổng sự kiện</span>
                <Calendar className="size-4 text-brand-cyan" />
              </div>
              <p className="font-mono text-2xl font-bold text-text-primary">{stats.total}</p>
            </Card>

            <Card className="p-4 flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-tertiary">Đang mở đăng ký</span>
                <span className="size-2.5 rounded-full bg-semantic-success animate-pulse" />
              </div>
              <p className="font-mono text-2xl font-bold text-semantic-success">{stats.open}</p>
            </Card>

            <Card className="p-4 flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-tertiary">Tổng vé phát hành</span>
                <Ticket className="size-4 text-accent-violet" />
              </div>
              <p className="font-mono text-2xl font-bold text-accent-violet">{stats.totalTickets}</p>
            </Card>

            <Card className="p-4 flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-tertiary">Lượt đăng ký</span>
                <Users className="size-4 text-semantic-warning" />
              </div>
              <p className="font-mono text-2xl font-bold text-semantic-warning">{stats.totalRegistered}</p>
            </Card>
          </div>
        </section>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-raised border border-surface-border p-3 rounded-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện theo tên, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-surface-border bg-surface-overlay text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary px-2 py-1 bg-surface-overlay border border-surface-border rounded-lg">
              <Filter className="size-3.5" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-text-primary outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-surface-overlay text-text-primary">
                  Tất cả loại sự kiện
                </option>
                <option value="webinar" className="bg-surface-overlay text-text-primary">
                  Webinar
                </option>
                <option value="kickoff" className="bg-surface-overlay text-text-primary">
                  Kick-off
                </option>
                <option value="finale" className="bg-surface-overlay text-text-primary">
                  Chung kết
                </option>
                <option value="other" className="bg-surface-overlay text-text-primary">
                  Khác
                </option>
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData()}
              title="Làm mới dữ liệu"
              className="size-9 p-0 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {/* Events List */}
        <section aria-label="Danh sách sự kiện">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Danh sách sự kiện ({filteredEvents.length})
            </h2>
          </div>

          {filteredEvents.length === 0 ? (
            <Card className="p-12 text-center text-text-tertiary border-dashed">
              <Calendar className="size-10 text-text-disabled mx-auto mb-3" />
              <p className="text-sm font-medium text-text-secondary">Không tìm thấy sự kiện nào</p>
              <p className="text-xs text-text-tertiary mt-1">
                {events.length === 0
                  ? 'Nhấn "Tạo sự kiện mới" để bắt đầu thiết lập sự kiện đầu tiên.'
                  : 'Thử điều chỉnh bộ lọc hoặc từ khoá tìm kiếm.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((ev) => {
                const percent = Math.min(100, Math.round((ev.registered_count / (ev.total_tickets || 1)) * 100))
                const isFull = ev.remaining_tickets === 0

                return (
                  <Card key={ev.id} className="p-5 transition-all hover:border-surface-border-strong">
                    <div className="flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
                      {/* Left: Event Details */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <EventTypeBadge type={ev.event_type} />
                          <h3 className="font-display text-base font-semibold text-text-primary truncate">
                            {ev.title}
                          </h3>
                          <Badge
                            variant={ev.is_open ? 'success' : 'default'}
                            size="sm"
                            className="font-medium"
                          >
                            {ev.is_open ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}
                          </Badge>
                          {isFull && (
                            <Badge variant="danger" size="sm">
                              Hết vé
                            </Badge>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-text-tertiary">
                          <span className="inline-flex items-center gap-1.5 text-text-secondary">
                            <Clock className="size-3.5 text-brand-cyan" />
                            {formatDisplayDateTime(ev.event_date)}
                          </span>

                          {ev.location && (
                            <span className="inline-flex items-center gap-1.5 text-text-secondary">
                              <MapPin className="size-3.5 text-semantic-warning" />
                              <span className="truncate max-w-[200px]">{ev.location}</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5 text-accent-violet" />
                            {ev.registered_count} người đăng ký
                          </span>
                        </div>

                        {/* Ticket Progress Bar */}
                        <div className="pt-2 max-w-md">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-text-tertiary">
                              Tiến độ vé: <strong className="text-text-primary font-mono">{ev.registered_count}</strong> / {ev.total_tickets}
                            </span>
                            <span className="font-medium text-brand-cyan">
                              {isFull ? 'Hết vé' : `Còn lại: ${ev.remaining_tickets} vé`} ({percent}%)
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

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap pt-3 lg:pt-0 border-t lg:border-t-0 border-surface-border">
                        {/* Toggle Open/Close Switch Button */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={ev.is_open}
                          id={`toggle-event-${ev.id}`}
                          onClick={() => handleToggleStatus(ev)}
                          disabled={togglingId === ev.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
                            ev.is_open
                              ? 'bg-semantic-success/15 border-semantic-success/30 text-semantic-success hover:bg-semantic-success/20'
                              : 'bg-surface-overlay border-surface-border text-text-tertiary hover:border-surface-border-strong hover:text-text-secondary'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {togglingId === ev.id ? (
                            <span className="size-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          ) : (
                            <span
                              className={`size-2 rounded-full ${
                                ev.is_open ? 'bg-semantic-success' : 'bg-text-tertiary'
                              }`}
                            />
                          )}
                          {ev.is_open ? 'Mở đăng ký' : 'Đóng đăng ký'}
                        </button>

                        {/* Export CSV Button */}
                        <Button
                          id={`export-csv-${ev.id}`}
                          variant="secondary"
                          size="sm"
                          leftIcon={
                            exportingId === ev.id ? (
                              <span className="size-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )
                          }
                          disabled={exportingId === ev.id}
                          onClick={() => handleExportCsv(ev)}
                          title="Tải danh sách đăng ký dạng CSV"
                        >
                          Tải CSV
                        </Button>

                        {/* Edit Button */}
                        <Button
                          id={`edit-event-${ev.id}`}
                          variant="secondary"
                          size="sm"
                          leftIcon={<Pencil className="size-3.5" />}
                          onClick={() => handleOpenModal(ev)}
                        >
                          Sửa
                        </Button>

                        {/* Delete Button */}
                        <Button
                          id={`delete-event-${ev.id}`}
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="size-3.5" />}
                          onClick={() => setDeleteTarget({ id: ev.id, title: ev.title })}
                          className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger"
                        >
                          Xoá
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xoá sự kiện</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá sự kiện &quot;{deleteTarget?.title}&quot; không? Tất cả dữ liệu đăng ký liên quan sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => setDeleteTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant="primary"
              size="md"
              className="bg-semantic-danger text-white hover:bg-semantic-danger/90 active:bg-semantic-danger/80"
              onClick={() => {
                if (deleteTarget) {
                  handleDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Xác nhận xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create / Edit Event Dialog ────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-event-title"
        >
          <div className="w-full max-w-xl rounded-xl border border-surface-border bg-surface-overlay p-6 shadow-elevation-3 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 id="modal-event-title" className="font-display text-lg font-semibold text-text-primary">
                {editingId ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                className="size-8 p-0 text-text-tertiary hover:text-text-primary"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="ev-title" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Tên sự kiện *
                </label>
                <input
                  id="ev-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Webinar #1: Pitching to Top Tier VCs"
                  className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                />
              </div>

              {/* Event Type & Total Tickets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ev-type" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Loại sự kiện *
                  </label>
                  <select
                    id="ev-type"
                    value={formData.event_type}
                    onChange={(e) =>
                      setFormData({ ...formData, event_type: e.target.value as EventType })
                    }
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors cursor-pointer"
                  >
                    <option value="webinar">Webinar (Trực tuyến)</option>
                    <option value="kickoff">Kick-off (Lễ phát động)</option>
                    <option value="finale">Chung kết (Grand Finale)</option>
                    <option value="other">Sự kiện khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ev-tickets" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Tổng số vé phát hành *
                  </label>
                  <input
                    id="ev-tickets"
                    type="number"
                    required
                    min={1}
                    max={10000}
                    value={formData.total_tickets}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_tickets: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                  />
                </div>
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ev-date" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Thời gian tổ chức
                  </label>
                  <input
                    id="ev-date"
                    type="datetime-local"
                    value={formData.event_date || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, event_date: e.target.value || null })
                    }
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="ev-location" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Địa điểm / Link phòng họp
                  </label>
                  <input
                    id="ev-location"
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Zoom Meeting / Hội trường A2"
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="ev-desc" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Mô tả sự kiện
                </label>
                <textarea
                  id="ev-desc"
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nội dung tóm tắt, diễn giả khách mời, agenda sự kiện..."
                  className="w-full px-3 py-2 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors resize-none"
                />
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3.5 bg-surface-base border border-surface-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text-primary">Mở cổng đăng ký</p>
                  <p className="text-xs text-text-tertiary">
                    Cho phép người tham dự đăng ký nhận vé tham gia sự kiện này
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.is_open}
                  id="modal-is-open-toggle"
                  onClick={() => setFormData({ ...formData, is_open: !formData.is_open })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
                    formData.is_open ? 'bg-semantic-success' : 'bg-surface-elevated'
                  }`}
                >
                  <span
                    className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      formData.is_open ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Huỷ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  isLoading={submitting}
                >
                  {editingId ? 'Cập nhật sự kiện' : 'Tạo sự kiện'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
