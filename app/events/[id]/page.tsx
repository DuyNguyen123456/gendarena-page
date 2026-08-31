'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { EventWithStats, EventType } from '@/types/event'
import type { Profile } from '@/types/profile'
import { getPublicEventById, checkUserRegistration } from '@/services/events'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Users,
  Video,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  User as UserIcon,
  Zap,
  Info,
  CalendarCheck,
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
    webinar: { label: 'Webinar Trực tuyến', variant: 'brand', icon: Video },
    kickoff: { label: 'Kick-off Lễ phát động', variant: 'info', icon: Sparkles },
    finale: { label: 'Chung kết', variant: 'warning', icon: CalendarCheck },
    other: { label: 'Sự kiện đặc biệt', variant: 'default', icon: Calendar },
  }

  const config = configs[type] || configs.other
  const Icon = config.icon

  return (
    <Badge variant={config.variant} size="sm" className="gap-1.5 font-medium">
      <Icon className="size-3" />
      <span>{config.label}</span>
    </Badge>
  )
}

function formatDisplayDateTime(iso: string | null): string {
  if (!iso) return 'Thông báo sau'
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', {
      weekday: 'long',
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

interface RegistrationFormData {
  full_name: string
  email: string
  phone: string
  university: string
  faculty: string
  student_id: string
}

const DEFAULT_FORM: RegistrationFormData = {
  full_name: '',
  email: '',
  phone: '',
  university: '',
  faculty: '',
  student_id: '',
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const eventId = resolvedParams.id

  const [event, setEvent] = useState<EventWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth & Profile
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [useCustomForm, setUseCustomForm] = useState(false)

  // Form State & State Machine
  const [formData, setFormData] = useState<RegistrationFormData>(DEFAULT_FORM)
  const [phase, setPhase] = useState<'form' | 'submitting' | 'success'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [errorPayload, setErrorPayload] = useState<{ code?: string; message: string } | null>(null)

  // Success state (Persistent)
  const [successPayload, setSuccessPayload] = useState<{
    ticketCode: string
    email: string
    fullName: string
  } | null>(null)

  // Concurrency & Double-submit guards
  const submittingRef = useRef(false)
  const submitSeqRef = useRef(0)

  const router = useRouter()

  // 1. Initial Load Effect (Only depends on eventId)
  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    async function init() {
      try {
        setLoading(true)
        setError(null)

        // Fetch Event Detail
        const eventData = await getPublicEventById(eventId)
        if (!isMounted) return

        if (!eventData) {
          setError('Không tìm thấy sự kiện hoặc sự kiện đã bị xoá.')
          setLoading(false)
          return
        }
        setEvent(eventData)

        // Fetch User & Profile if logged in
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) return

        if (user) {
          setUserId(user.id)
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (!isMounted) return

          if (prof) {
            setProfile(prof as Profile)
            // Preload form data
            setFormData({
              full_name: prof.full_name || '',
              email: prof.email || user.email || '',
              phone: prof.phone || '',
              university: prof.university || '',
              faculty: prof.faculty || '',
              student_id: '',
            })

            // Check if already registered
            const userEmail = prof.email || user.email
            if (userEmail || user.id) {
              const isRegistered = await checkUserRegistration(eventId, userEmail, user.id)
              if (isRegistered && isMounted) {
                setSuccessPayload({
                  ticketCode: `GEND-EVT-${eventId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
                  email: userEmail || '',
                  fullName: prof.full_name || 'Bạn',
                })
                setPhase('success')
              }
            }
          }
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Error loading event detail:', err)
        setError('Có lỗi xảy ra khi tải dữ liệu sự kiện. Vui lòng thử lại.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [eventId])

  // 2. Realtime / Fresh Capacity Refresh (Soft polling only updates event counts, never touches success state)
  useEffect(() => {
    let isCancelled = false

    const refreshCountsOnly = async () => {
      try {
        const fresh = await getPublicEventById(eventId)
        if (fresh && !isCancelled) {
          setEvent(fresh)
        }
      } catch {
        // Silently ignore background refresh errors
      }
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshCountsOnly()
      }
    }, 12000)

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshCountsOnly()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      isCancelled = true
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [eventId])

  // ─── Form Submission Handler ────────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent, isOneClick: boolean = false) => {
    if (e) e.preventDefault()

    // Prevent double submissions or submitting when already in success phase
    if (submittingRef.current || phase === 'success') return
    submittingRef.current = true
    const currentSeq = ++submitSeqRef.current

    setSubmitting(true)
    setPhase('submitting')
    setErrorPayload(null)

    try {
      const payload = {
        event_id: eventId,
        user_id: userId || null,
        full_name: (isOneClick ? profile?.full_name : formData.full_name)?.trim(),
        email: (isOneClick ? profile?.email : formData.email)?.trim().toLowerCase(),
        phone: (isOneClick ? profile?.phone : formData.phone)?.trim() || null,
        university: (isOneClick ? profile?.university : formData.university)?.trim() || null,
        faculty: (isOneClick ? profile?.faculty : formData.faculty)?.trim() || null,
        student_id: (!isOneClick ? formData.student_id : '')?.trim() || null,
      }

      if (!payload.full_name) throw new Error('Vui lòng cung cấp Họ và tên đầy đủ.')
      if (!payload.email) throw new Error('Vui lòng cung cấp địa chỉ Email nhận vé.')

      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const resJson = await res.json().catch(() => ({}))

      // Ignore stale responses from previous attempts
      if (currentSeq !== submitSeqRef.current) return

      if (!res.ok || !resJson.success || !resJson.ticketCode) {
        const errorCode =
          resJson.code ||
          (res.status === 429
            ? 'RATE_LIMITED'
            : res.status === 409
            ? 'ALREADY_REGISTERED'
            : res.status === 404
            ? 'EVENT_NOT_FOUND'
            : 'INTERNAL')
        const errorMsg =
          resJson.message ||
          resJson.error ||
          'Đăng ký không thành công. Vui lòng thử lại sau giây lát.'

        setPhase('form')

        if (process.env.NODE_ENV === 'development') {
          console.error('[Event Registration Failed]', res.status, errorCode, errorMsg, resJson)
        }

        if (errorCode === 'SOLD_OUT') {
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  registered_count: prev.total_tickets,
                  remaining_tickets: 0,
                }
              : null
          )
          setErrorPayload({
            code: 'SOLD_OUT',
            message: errorMsg || 'Sự kiện đã hết vé tham gia. Hẹn gặp bạn ở các sự kiện tiếp theo!',
          })
          return
        }

        if (errorCode === 'ALREADY_REGISTERED') {
          setErrorPayload({
            code: 'ALREADY_REGISTERED',
            message: errorMsg || 'Email này đã đăng ký sự kiện. Mỗi email chỉ đăng ký một lần.',
          })
          return
        }

        if (errorCode === 'RATE_LIMITED') {
          setErrorPayload({
            code: 'RATE_LIMITED',
            message: errorMsg || 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
          })
          return
        }

        if (errorCode === 'EVENT_CLOSED') {
          setErrorPayload({
            code: 'EVENT_CLOSED',
            message: errorMsg || 'Sự kiện này hiện đã đóng cổng đăng ký.',
          })
          setEvent((prev) => (prev ? { ...prev, is_open: false } : null))
          return
        }

        if (errorCode === 'RPC_MISSING') {
          setErrorPayload({
            code: 'RPC_MISSING',
            message:
              'Hệ thống vé chưa được cấu hình hàm xử lý (register_event_ticket). Vui lòng thông báo BTC chạy file migration SQL.',
          })
          return
        }

        if (errorCode === 'CONFIG') {
          setErrorPayload({
            code: 'CONFIG',
            message: 'Hệ thống chưa cấu hình SUPABASE_SERVICE_ROLE_KEY. Vui lòng liên hệ quản trị viên.',
          })
          return
        }

        // Generic/Internal error with server message
        setErrorPayload({
          code: errorCode,
          message: errorMsg,
        })
        return
      }

      // ─── Registration Successful (Permanent Phase) ───
      setSuccessPayload({
        ticketCode: resJson.ticketCode,
        email: payload.email,
        fullName: payload.full_name,
      })
      setPhase('success')

      // Update remaining ticket in local state safely
      if (event) {
        const nextRegCount =
          typeof resJson.registered_count === 'number'
            ? resJson.registered_count
            : event.registered_count + 1
        const nextRemaining =
          typeof resJson.remaining_tickets === 'number'
            ? resJson.remaining_tickets
            : Math.max(0, event.total_tickets - nextRegCount)

        setEvent({
          ...event,
          registered_count: nextRegCount,
          remaining_tickets: nextRemaining,
        })
      }
    } catch (err) {
      if (currentSeq === submitSeqRef.current) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
        setPhase('form')
        setErrorPayload({ code: 'CLIENT_ERROR', message: msg })
      }
    } finally {
      if (currentSeq === submitSeqRef.current) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  if (loading) return <Loading text="Đang tải thông tin sự kiện..." />

  if (error || !event) {
    return (
      <div className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertCircle className="size-12 text-semantic-danger mx-auto" />
          <h1 className="font-display text-xl font-bold text-text-primary">Không tìm thấy sự kiện</h1>
          <p className="text-sm text-text-secondary">{error || 'Sự kiện không tồn tại hoặc đã bị gỡ.'}</p>
          <Link href="/events">
            <Button variant="primary" size="md" className="mt-2">
              Xem tất cả sự kiện
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const percent = Math.min(100, Math.round((event.registered_count / (event.total_tickets || 1)) * 100))
  const isFull = event.remaining_tickets === 0
  const isClosed = !event.is_open

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-accent-violet/5 blur-[140px]" />
      </div>

      {/* Breadcrumb Header */}
      <div className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />
            Tất cả sự kiện
          </Link>
        </div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ─── Left Column: Event Details & Progress ─── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <EventTypeBadge type={event.event_type} />
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text-primary leading-tight">
                {event.title}
              </h1>
            </div>

            {/* Event Key Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <Card className="p-4 bg-surface-raised border-surface-border flex items-start gap-3">
                <div className="size-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center shrink-0 text-brand-cyan">
                  <Clock className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-tertiary">Thời gian tổ chức</div>
                  <div className="text-xs sm:text-sm font-semibold text-text-primary mt-0.5">
                    {formatDisplayDateTime(event.event_date)}
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-surface-raised border-surface-border flex items-start gap-3">
                <div className="size-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center shrink-0 text-semantic-warning">
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-tertiary">Địa điểm / Nền tảng</div>
                  <div className="text-xs sm:text-sm font-semibold text-text-primary mt-0.5 truncate">
                    {event.location || 'Zoom Online (BTC gửi link)'}
                  </div>
                </div>
              </Card>
            </div>

            {/* Ticket Availability Progress */}
            <Card className="p-5 bg-surface-raised border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="size-4 text-brand-cyan" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Tình trạng vé tham dự
                  </span>
                </div>
                {isFull ? (
                  <Badge variant="danger" size="sm">
                    Hết vé
                  </Badge>
                ) : isClosed ? (
                  <Badge variant="default" size="sm">
                    Đã đóng
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    Đang mở đăng ký
                  </Badge>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-tertiary">
                    Đã xác nhận: <strong className="text-text-primary font-mono">{event.registered_count}</strong> / {event.total_tickets} vé
                  </span>
                  <span className="font-semibold text-brand-cyan">
                    {isFull ? 'Hết vé' : `Còn lại: ${event.remaining_tickets} vé`}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-surface-elevated overflow-hidden border border-surface-border">
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
            </Card>

            {/* Event Description */}
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                Nội dung &amp; Giới thiệu sự kiện
              </h2>
              <div className="bg-surface-raised border border-surface-border rounded-xl p-5 text-sm text-text-secondary leading-relaxed whitespace-pre-line space-y-3">
                {event.description || 'Chưa có thông tin mô tả chi tiết cho sự kiện này.'}
              </div>
            </div>

            {/* Note from BTC */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-overlay border border-surface-border text-xs text-text-secondary">
              <Info className="size-4 text-brand-cyan shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary font-medium">Quyền lợi khi tham dự:</strong> Nhận tài liệu độc quyền từ diễn giả, cơ hội networking trực tiếp với Ban giám khảo và nhận giấy chứng nhận tham dự từ Ban tổ chức GenD Arena 2026.
              </div>
            </div>
          </div>

          {/* ─── Right Column: Registration Form / 1-Click / Success State ─── */}
          <div className="lg:col-span-5">
            {phase === 'success' && successPayload ? (
              /* Success State Card */
              <Card className="p-6 sm:p-8 bg-surface-raised border-surface-border text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="size-14 rounded-full bg-semantic-success/15 border border-semantic-success/30 flex items-center justify-center mx-auto text-semantic-success">
                  <CheckCircle className="size-7" />
                </div>

                <div className="space-y-1.5">
                  <Badge variant="success" size="sm">
                    Đăng ký thành công
                  </Badge>
                  <h2 className="font-display text-xl font-bold text-text-primary">
                    Chúc mừng bạn đã có vé!
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Xin chào <strong>{successPayload.fullName}</strong>, bạn đã ghi danh thành công cho sự kiện này.
                  </p>
                </div>

                {/* Ticket Code Box */}
                <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border text-center space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-text-tertiary">Mã vé tham dự</div>
                  <div className="font-mono text-xl font-bold text-brand-cyan tracking-wider">
                    {successPayload.ticketCode}
                  </div>
                </div>

                {!userId ? (
                  /* Guest Call-to-Action Card */
                  <div className="p-4 sm:p-5 rounded-xl bg-surface-overlay border border-surface-border text-left space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-brand-cyan shrink-0" />
                      <h3 className="font-display text-sm font-bold text-text-primary">
                        Tham gia đấu trường GenD Arena 2026
                      </h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Tạo tài khoản để lập đội thi, nộp bài dự thi và nhận các thông báo quan trọng từ Ban tổ chức cuộc thi GenD Arena.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <Link href="/register" className="w-full">
                        <Button variant="primary" size="sm" className="w-full justify-center text-xs font-semibold">
                          Tạo tài khoản ngay
                        </Button>
                      </Link>
                      <Link href="/login" className="w-full">
                        <Button variant="secondary" size="sm" className="w-full justify-center text-xs">
                          Đăng nhập
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Logged-in User Actions */
                  <div className="space-y-2 pt-1">
                    <Link href="/dashboard" className="block">
                      <Button variant="primary" size="md" className="w-full justify-center text-xs font-semibold">
                        Về Dashboard
                      </Button>
                    </Link>
                  </div>
                )}

                <Link href="/events" className="block pt-1">
                  <Button variant="secondary" size="md" className="w-full justify-center text-xs">
                    Xem các sự kiện khác
                  </Button>
                </Link>
              </Card>
            ) : isFull ? (
              /* Ticket Full Card */
              <Card className="p-8 bg-surface-raised border-surface-border text-center space-y-4">
                <div className="size-12 rounded-full bg-semantic-danger/10 border border-semantic-danger/30 flex items-center justify-center mx-auto text-semantic-danger">
                  <Ticket className="size-6" />
                </div>
                <h2 className="font-display text-lg font-bold text-text-primary">Sự kiện đã hết vé</h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Số lượng vé phát hành ({event.total_tickets} vé) đã được người tham dự đăng ký hết. Hãy theo dõi các sự kiện tiếp theo của GenD Arena!
                </p>
                <Link href="/events">
                  <Button variant="secondary" size="md" className="w-full text-xs">
                    Khám phá sự kiện khác
                  </Button>
                </Link>
              </Card>
            ) : isClosed ? (
              /* Closed Card */
              <Card className="p-8 bg-surface-raised border-surface-border text-center space-y-4">
                <AlertCircle className="size-10 text-text-disabled mx-auto" />
                <h2 className="font-display text-lg font-bold text-text-primary">Cổng đăng ký đã đóng</h2>
                <p className="text-xs text-text-secondary">
                  Ban tổ chức đã đóng nhận đăng ký cho sự kiện này.
                </p>
                <Link href="/events">
                  <Button variant="secondary" size="md" className="w-full text-xs">
                    Xem sự kiện khác
                  </Button>
                </Link>
              </Card>
            ) : profile && !useCustomForm ? (
              /* ─── Case A: Logged-in User (1-Click Join) ─── */
              <Card className="p-6 sm:p-7 bg-surface-raised border-surface-border space-y-5 shadow-elevation-2">
                <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
                  <Zap className="size-4 text-brand-cyan" />
                  <h2 className="font-display text-base font-bold text-text-primary">
                    Đăng ký nhanh 1-Chạm
                  </h2>
                </div>

                <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border space-y-2 text-xs">
                  <div className="text-text-tertiary">Đăng ký với thông tin tài khoản:</div>
                  <div className="font-semibold text-text-primary text-sm">
                    {profile.full_name || 'Thí sinh GenD Arena'}
                  </div>
                  <div className="text-text-secondary flex items-center gap-1.5">
                    <Mail className="size-3.5 text-text-tertiary" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.university && (
                    <div className="text-text-secondary flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-text-tertiary" />
                      <span>{profile.university}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="text-text-secondary flex items-center gap-1.5">
                      <Phone className="size-3.5 text-text-tertiary" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>

                {errorPayload && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{errorPayload.message}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <Button
                    id="one-click-register-btn"
                    variant="primary"
                    size="lg"
                    leftIcon={<Zap className="size-4" />}
                    onClick={() => handleSubmit(undefined, true)}
                    disabled={submitting}
                    isLoading={submitting}
                    className="w-full justify-center font-bold text-sm h-11 shadow-sm"
                  >
                    Xác nhận đăng ký tham gia
                  </Button>

                  <button
                    type="button"
                    onClick={() => setUseCustomForm(true)}
                    className="w-full text-center text-xs text-text-tertiary hover:text-brand-cyan transition-colors py-1 outline-none"
                  >
                    Đăng ký với thông tin khác
                  </button>
                </div>
              </Card>
            ) : (
              /* ─── Case B: Guest Minimalist Form ─── */
              <Card className="p-6 sm:p-7 bg-surface-raised border-surface-border space-y-5 shadow-elevation-2">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <UserIcon className="size-4 text-brand-cyan" />
                    <h2 className="font-display text-base font-bold text-text-primary">
                      Form Đăng Ký Tham Gia
                    </h2>
                  </div>
                  {profile && useCustomForm && (
                    <button
                      type="button"
                      onClick={() => setUseCustomForm(false)}
                      className="text-xs text-brand-cyan hover:underline outline-none"
                    >
                      Dùng thông tin tài khoản
                    </button>
                  )}
                </div>

                {errorPayload && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{errorPayload.message}</span>
                  </div>
                )}

                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg-fullname" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Họ và tên <span className="text-semantic-danger">*</span>
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => {
                        setFormData({ ...formData, full_name: e.target.value })
                        if (errorPayload) setErrorPayload(null)
                      }}
                      placeholder="Nguyễn Văn A"
                      className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-email" className="block text-xs font-medium text-text-secondary mb-1.5">
                        Email nhận vé <span className="text-semantic-danger">*</span>
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                          if (errorPayload) setErrorPayload(null)
                        }}
                        placeholder="email@example.com"
                        className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-medium text-text-secondary mb-1.5">
                        Số điện thoại <span className="text-semantic-danger">*</span>
                      </label>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value })
                          if (errorPayload) setErrorPayload(null)
                        }}
                        placeholder="0912345678"
                        className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* University & Faculty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-uni" className="block text-xs font-medium text-text-secondary mb-1.5">
                        Trường Đại học / Đơn vị <span className="text-semantic-danger">*</span>
                      </label>
                      <input
                        id="reg-uni"
                        type="text"
                        required
                        value={formData.university}
                        onChange={(e) => {
                          setFormData({ ...formData, university: e.target.value })
                          if (errorPayload) setErrorPayload(null)
                        }}
                        placeholder="ĐH Ngân Hàng TP.HCM (HUB)"
                        className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-fac" className="block text-xs font-medium text-text-secondary mb-1.5">
                        Khoa / Viện
                      </label>
                      <input
                        id="reg-fac"
                        type="text"
                        value={formData.faculty}
                        onChange={(e) => {
                          setFormData({ ...formData, faculty: e.target.value })
                          if (errorPayload) setErrorPayload(null)
                        }}
                        placeholder="Khoa HTTTQL / Kinh tế..."
                        className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Student ID */}
                  <div>
                    <label htmlFor="reg-stuid" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Mã số sinh viên (MSSV)
                    </label>
                    <input
                      id="reg-stuid"
                      type="text"
                      value={formData.student_id}
                      onChange={(e) => {
                        setFormData({ ...formData, student_id: e.target.value })
                        if (errorPayload) setErrorPayload(null)
                      }}
                      placeholder="030138210001"
                      className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-overlay text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors"
                    />
                    <p className="text-[11px] text-text-tertiary mt-1">
                      * Bắt buộc đối với Sinh viên Trường Đại học Ngân Hàng TP.HCM (HUB) để ghi nhận điểm rèn luyện.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    id="guest-register-btn"
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting}
                    isLoading={submitting}
                    className="w-full justify-center font-bold text-sm h-11 mt-2"
                  >
                    Xác nhận đăng ký tham gia
                  </Button>

                  {!profile && (
                    <div className="pt-2 text-center text-xs text-text-tertiary">
                      Đã có tài khoản GenD Arena?{' '}
                      <Link href="/login" className="text-brand-cyan hover:underline font-medium">
                        Đăng nhập để đăng ký 1-chạm
                      </Link>
                    </div>
                  )}
                </form>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
