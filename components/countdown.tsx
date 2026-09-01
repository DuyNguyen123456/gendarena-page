'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil, Clock, Calendar, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface CountdownProps {
  targetDate: string
  phaseTitle?: string
  phases?: any[]
  onUpdate?: (updated: { phaseId?: string; title: string; targetDate: string }) => void
}

function AnimatedNumber({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion()

  // Guard: undefined / NaN → show "00", never crash
  const safe = typeof value === 'number' && !Number.isNaN(value) ? value : 0
  const padded = String(safe).padStart(2, '0')

  if (prefersReducedMotion) {
    return (
      <span className="inline-block font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-cyan leading-none select-none tabular-nums">
        {padded}
      </span>
    )
  }

  return (
    <div className="relative inline-block">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={padded}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="inline-block font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-cyan leading-none select-none tabular-nums"
        >
          {padded}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/** Convert ISO or date string to local datetime-local input string (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const YYYY = d.getFullYear()
    const MM = pad(d.getMonth() + 1)
    const DD = pad(d.getDate())
    const HH = pad(d.getHours())
    const mm = pad(d.getMinutes())
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`
  } catch {
    return ''
  }
}

export default function Countdown({
  targetDate: initialTargetDate,
  phaseTitle: initialPhaseTitle = 'Vòng Sơ Loại',
  phases = [],
  onUpdate,
}: CountdownProps) {
  const router = useRouter()
  const [targetDate, setTargetDate] = useState(initialTargetDate)
  const [phaseTitle, setPhaseTitle] = useState(initialPhaseTitle)

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  })

  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Admin Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('')
  const [modalTitle, setModalTitle] = useState(initialPhaseTitle)
  const [modalDateTime, setModalDateTime] = useState(() => toDatetimeLocal(initialTargetDate))
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Sync with prop changes if parent updates
  useEffect(() => {
    setTargetDate(initialTargetDate)
    setPhaseTitle(initialPhaseTitle)
  }, [initialTargetDate, initialPhaseTitle])

  // Check admin role
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (profile?.role === 'admin') {
          setIsAdmin(true)
        }
      }
    })
  }, [])

  // Timer calculation
  useEffect(() => {
    setIsMounted(true)
    const targetTime = new Date(targetDate).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = targetTime - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [targetDate])

  const openAdminModal = () => {
    // Find matching phase or default to active / first phase
    const matched =
      phases.find((p) => p.title === phaseTitle || (p.title && phaseTitle.includes(p.title))) ||
      phases.find((p) => p.status === 'active') ||
      phases[0]

    const targetId = matched?.id || (phases.length > 0 ? phases[0].id : '')
    setSelectedPhaseId(targetId)

    if (matched) {
      setModalTitle(matched.title || phaseTitle)
      const dateStr = matched.submission_opens_at || matched.start_date || targetDate
      setModalDateTime(toDatetimeLocal(dateStr))
    } else {
      setModalTitle(phaseTitle)
      setModalDateTime(toDatetimeLocal(targetDate))
    }

    setSaveSuccess(false)
    setModalError(null)
    setShowEditModal(true)
  }

  const handlePhaseSelectChange = (phaseId: string) => {
    setSelectedPhaseId(phaseId)
    const found = phases.find((p) => p.id === phaseId)
    if (found) {
      setModalTitle(found.title)
      const dateStr = found.submission_opens_at || found.start_date || targetDate
      setModalDateTime(toDatetimeLocal(dateStr))
    }
  }

  const handleSaveCountdown = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTitle.trim()) {
      setModalError('Vui lòng nhập tên vòng thi.')
      return
    }
    if (!modalDateTime) {
      setModalError('Vui lòng chọn ngày và giờ đếm ngược.')
      return
    }

    setIsSaving(true)
    setModalError(null)

    try {
      const isoString = new Date(modalDateTime).toISOString()
      const dateOnly = modalDateTime.slice(0, 10)

      const supabase = createClient()

      // Resolve the phase ID to update
      let targetIdToUpdate = selectedPhaseId
      if (!targetIdToUpdate && phases.length > 0) {
        const found =
          phases.find((p) => p.title === phaseTitle || (p.title && phaseTitle.includes(p.title))) ||
          phases[0]
        targetIdToUpdate = found?.id || phases[0]?.id
      }

      if (targetIdToUpdate) {
        // Update the existing phase in competition_phases table
        const { error: dbError } = await supabase
          .from('competition_phases')
          .update({
            title: modalTitle.trim(),
            start_date: dateOnly,
            submission_opens_at: isoString,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetIdToUpdate)

        if (dbError) throw new Error(dbError.message)
      } else {
        // Fallback: If no phases exist at all, create a new phase
        const { data: newPhase, error: insertError } = await supabase
          .from('competition_phases')
          .insert({
            title: modalTitle.trim(),
            description: 'Vòng thi chính thức',
            start_date: dateOnly,
            submission_opens_at: isoString,
            status: 'active',
            icon: 'target',
            display_order: 1,
          })
          .select('id')
          .single()

        if (insertError) throw new Error(insertError.message)
        if (newPhase) targetIdToUpdate = newPhase.id
      }

      // Update local state immediately
      setTargetDate(isoString)
      setPhaseTitle(modalTitle.trim())

      if (onUpdate) {
        onUpdate({
          phaseId: targetIdToUpdate || undefined,
          title: modalTitle.trim(),
          targetDate: isoString,
        })
      }

      // Refresh Next.js server components so page revalidation takes effect
      router.refresh()

      setSaveSuccess(true)
      setTimeout(() => {
        setShowEditModal(false)
        setSaveSuccess(false)
      }, 900)
    } catch (err: any) {
      console.error('Error updating countdown phase:', err)
      setModalError(err.message || 'Lỗi khi cập nhật mốc thời gian')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isMounted) {
    return (
      <div className="w-full bg-surface-raised border border-surface-border rounded-xl p-4 sm:p-6 md:p-8 animate-pulse h-[150px] sm:h-[180px]" />
    )
  }

  return (
    <>
      <div className="w-full bg-surface-raised border border-surface-border rounded-xl p-4 sm:p-6 md:p-8 transition-colors duration-[250ms] relative group">
        {/* Header info */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-brand-cyan animate-pulse shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold text-text-tertiary uppercase tracking-wider font-display truncate">
              {phaseTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin ? (
              <button
                type="button"
                onClick={openAdminModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/35 text-brand-cyan text-[11px] font-semibold transition cursor-pointer shadow-xs"
                title="Admin: Chỉnh sửa ngày, giờ và tên vòng thi"
              >
                <Pencil className="size-3" />
                <span>Chỉnh sửa</span>
                <Badge variant="brand" size="sm" className="ml-0.5 text-[9px] py-0 px-1">
                  Admin
                </Badge>
              </button>
            ) : (
              <span className="text-[11px] sm:text-xs font-medium text-text-tertiary">
                Đếm ngược mở đơn
              </span>
            )}
          </div>
        </div>

        {timeLeft.isExpired ? (
          <div className="text-center py-4 px-3 bg-surface-overlay border border-brand-cyan/20 rounded-lg space-y-2">
            <h3 className="font-display text-base sm:text-lg md:text-xl font-semibold text-brand-cyan">
              Đã mở đơn đăng ký chính thức!
            </h3>
            <p className="text-xs text-text-secondary">
              Hệ thống đang mở nhận hồ sơ tham dự giải đấu.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openAdminModal}
                className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:underline font-medium pt-1 cursor-pointer"
              >
                <Pencil className="size-3" /> Đặt mốc đếm ngược cho vòng thi tiếp theo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 md:gap-4 text-center">
            {[
              { value: timeLeft.days, label: 'Ngày' },
              { value: timeLeft.hours, label: 'Giờ' },
              { value: timeLeft.minutes, label: 'Phút' },
              { value: timeLeft.seconds, label: 'Giây' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-surface-overlay border border-surface-border rounded-lg"
              >
                <AnimatedNumber value={value} />
                <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-text-tertiary uppercase tracking-wider mt-1.5 sm:mt-2 font-display">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Quick Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-brand-cyan mb-1">
              <Clock className="size-5" />
              <Badge variant="brand" size="sm">Cài đặt Admin</Badge>
            </div>
            <DialogTitle>Cài đặt đồng hồ đếm ngược & Lịch trình vòng</DialogTitle>
            <DialogDescription>
              Chỉnh sửa tên vòng, ngày và giờ đếm ngược hiển thị trực tiếp trên trang chủ.
            </DialogDescription>
          </DialogHeader>

          {modalError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-semantic-success/10 border border-semantic-success/30 text-semantic-success text-xs font-medium">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Đã lưu và cập nhật đồng hồ đếm ngược thành công!</span>
            </div>
          )}

          <form onSubmit={handleSaveCountdown} className="space-y-4 pt-1">
            {/* Phase Selector */}
            {phases.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary flex items-center justify-between">
                  <span>Chọn vòng thi để đồng bộ</span>
                  <Link
                    href="/admin/phases"
                    className="text-brand-cyan hover:underline flex items-center gap-1 text-[11px] font-normal"
                    target="_blank"
                  >
                    Quản lý tất cả vòng <ArrowRight className="size-3" />
                  </Link>
                </label>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => handlePhaseSelectChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition cursor-pointer"
                >
                  <option value="">-- Chọn vòng thi --</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.phase_number ? `Vòng ${p.phase_number}: ` : ''}{p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Tên vòng thi hiển thị trên đồng hồ *
              </label>
              <input
                type="text"
                required
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                placeholder="VD: Vòng Sơ Loại: DREAM"
                className="w-full h-10 px-3 rounded-xl border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition"
              />
            </div>

            {/* Date and Time Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Calendar className="size-3.5 text-brand-cyan" />
                <span>Ngày & Giờ đếm ngược (Mốc thời gian mở đơn / bắt đầu) *</span>
              </label>
              <input
                type="datetime-local"
                required
                value={modalDateTime}
                onChange={(e) => setModalDateTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition"
              />
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                * Đồng hồ trên trang chủ sẽ tự động đếm ngược đến chính xác ngày và giờ này.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-surface-border">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                leftIcon={<Sparkles className="size-4" />}
              >
                Lưu & Áp dụng ngay
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
