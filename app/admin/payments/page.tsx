'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getAdminPaymentTeams,
  approveTeamPayment,
  rejectTeamPayment,
} from '@/services/payments'
import {
  calculateExpectedFee,
  type AdminPaymentTeam,
  type TeamPaymentStatus,
} from '@/types/payment'
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  CreditCard,
  Eye,
  ExternalLink,
  Users,
  ShieldAlert,
  AlertCircle,
  DollarSign,
  Phone,
  Mail,
  School,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function AdminPaymentsPage() {
  const [teams, setTeams] = useState<AdminPaymentTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | TeamPaymentStatus>('all')

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; teamName: string } | null>(null)

  // Reject Modal
  const [rejectTarget, setRejectTarget] = useState<AdminPaymentTeam | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  // Approve Confirm Modal
  const [approveTarget, setApproveTarget] = useState<AdminPaymentTeam | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  const loadData = useCallback(async () => {
    setLoading(true)
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

    setAdminId(user.id)
    const teamsData = await getAdminPaymentTeams()
    setTeams(teamsData)
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Stats calculation
  const stats = useMemo(() => {
    const pending = teams.filter((t) => t.status === 'locked_pending_payment').length
    const verified = teams.filter((t) => t.status === 'verified').length
    const rejected = teams.filter((t) => t.status === 'payment_rejected').length
    const draft = teams.filter((t) => t.status === 'draft').length
    const totalCollected = teams
      .filter((t) => t.status === 'verified')
      .reduce((sum, t) => sum + (t.payment_amount || 0), 0)

    return { pending, verified, rejected, draft, totalCollected, total: teams.length }
  }, [teams])

  // Filtered teams
  const filteredTeams = useMemo(() => {
    let result = teams

    if (selectedTab !== 'all') {
      result = result.filter((t) => t.status === selectedTab)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.leader?.full_name && t.leader.full_name.toLowerCase().includes(q)) ||
          (t.leader?.email && t.leader.email.toLowerCase().includes(q)) ||
          (t.leader?.phone && t.leader.phone.toLowerCase().includes(q)) ||
          (t.competitions?.title && t.competitions.title.toLowerCase().includes(q))
      )
    }

    return result
  }, [teams, selectedTab, searchQuery])

  // Handle Approve
  const handleApprove = async (team: AdminPaymentTeam) => {
    if (!adminId) return
    setActionLoading(team.id)
    setApproveTarget(null)

    const res = await approveTeamPayment(team.id, adminId)
    setActionLoading(null)

    if (res.ok) {
      setToast({
        text: `Đã duyệt lệ phí và xác thực thành công cho đội "${team.name}"!`,
        type: 'success',
      })
      await loadData()
    } else {
      setToast({
        text: res.error || 'Có lỗi xảy ra khi duyệt thanh toán.',
        type: 'error',
      })
    }
  }

  // Handle Reject
  const handleRejectConfirm = async () => {
    if (!rejectTarget || !adminId) return
    const finalReason = customReason.trim() || rejectReason.trim() || 'Biên lai chuyển khoản không hợp lệ hoặc số tiền không khớp.'

    setActionLoading(rejectTarget.id)
    const res = await rejectTeamPayment(rejectTarget.id, finalReason, adminId)
    setActionLoading(null)
    setRejectTarget(null)
    setRejectReason('')
    setCustomReason('')

    if (res.ok) {
      setToast({
        text: `Đã từ chối lệ phí của đội "${rejectTarget.name}". Trưởng đội đã nhận được thông báo.`,
        type: 'success',
      })
      await loadData()
    } else {
      setToast({
        text: res.error || 'Có lỗi xảy ra khi từ chối thanh toán.',
        type: 'error',
      })
    }
  }

  const presetReasons = [
    'Số tiền chuyển khoản không đúng với mức phí theo sĩ số đội.',
    'Ảnh chụp biên lai bị mờ, không nhìn rõ mã giao dịch hoặc thời gian.',
    'Nội dung chuyển khoản không ghi rõ Tên đội / Mã đội thi.',
    'Giao dịch chuyển khoản không thành công hoặc bị huỷ.',
  ]

  if (loading) return <Loading text="Đang tải dữ liệu lệ phí đội thi..." />

  return (
    <div className="min-h-screen bg-slate-950 text-text-primary">
      {/* Background Ambience */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-slate-900/60">
        <DotGridBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan-bright font-medium transition mb-4 group"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            <span>Quay lại Trung tâm kiểm soát</span>
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="warning" size="sm">
                  BTC Quản trị
                </Badge>
                <Badge variant="brand" size="sm">
                  Phase 1
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
                <CreditCard className="size-7 text-brand-cyan" />
                <span>Quản lý & Duyệt Lệ phí Đội thi</span>
              </h1>
              <p className="text-sm text-text-secondary mt-1 max-w-2xl">
                Kiểm tra biên lai thanh toán, đối soát số tiền theo sĩ số đội và cấp Huy hiệu Verified để mở quyền nộp bài cho thí sinh.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              leftIcon={<RotateCcw className="size-4" />}
              className="text-xs"
            >
              Làm mới dữ liệu
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast feedback */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in-0 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="size-5 shrink-0 text-rose-400" />
              )}
              <span className="font-medium">{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-text-tertiary hover:text-text-primary p-1"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Stats Top Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-amber-500/30 bg-amber-500/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
              <span>Chờ duyệt lệ phí</span>
              <Clock className="size-4" />
            </div>
            <div className="text-2xl font-bold font-display text-text-primary">
              {stats.pending}
            </div>
            <p className="text-[11px] text-text-tertiary">Đội đã khóa và nộp biên lai</p>
          </Card>

          <Card className="p-5 border-brand-cyan/30 bg-brand-cyan/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-brand-cyan font-medium">
              <span>Đã xác thực (Verified)</span>
              <CheckCircle2 className="size-4" />
            </div>
            <div className="text-2xl font-bold font-display text-text-primary">
              {stats.verified}
            </div>
            <p className="text-[11px] text-text-tertiary">Đủ điều kiện nộp đề án</p>
          </Card>

          <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Tổng tiền đã thu</span>
              <DollarSign className="size-4" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-400">
              {formatVND(stats.totalCollected)}
            </div>
            <p className="text-[11px] text-text-tertiary">Từ {stats.verified} đội đã duyệt</p>
          </Card>

          <Card className="p-5 border-rose-500/30 bg-rose-500/5 space-y-1">
            <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
              <span>Bị từ chối</span>
              <XCircle className="size-4" />
            </div>
            <div className="text-2xl font-bold font-display text-text-primary">
              {stats.rejected}
            </div>
            <p className="text-[11px] text-text-tertiary">Cần nộp lại biên lai</p>
          </Card>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={selectedTab === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTab('all')}
              className="text-xs h-8"
            >
              Tất cả ({stats.total})
            </Button>
            <Button
              variant={selectedTab === 'locked_pending_payment' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTab('locked_pending_payment')}
              className="text-xs h-8"
            >
              Chờ duyệt ({stats.pending})
            </Button>
            <Button
              variant={selectedTab === 'verified' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTab('verified')}
              className="text-xs h-8"
            >
              Đã duyệt ({stats.verified})
            </Button>
            <Button
              variant={selectedTab === 'payment_rejected' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTab('payment_rejected')}
              className="text-xs h-8"
            >
              Bị từ chối ({stats.rejected})
            </Button>
            <Button
              variant={selectedTab === 'draft' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTab('draft')}
              className="text-xs h-8"
            >
              Bản nháp ({stats.draft})
            </Button>
          </div>

          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="Tìm theo tên đội, trưởng đội, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="size-4" />}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Table / List View */}
        {filteredTeams.length === 0 ? (
          <Card className="py-16 text-center border-slate-800 bg-slate-900/40">
            <CreditCard className="size-12 mx-auto text-text-tertiary opacity-40 mb-3" />
            <h3 className="text-sm font-semibold text-text-primary">
              Không có đội thi nào trong mục này
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có đội thi nào khớp với bộ lọc hiện tại.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTeams.map((team) => {
              const expectedFee = calculateExpectedFee(team.members_count)
              const isMatch = team.payment_amount === expectedFee

              return (
                <Card
                  key={team.id}
                  className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700/80 transition space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    {/* Team Name & Competition */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-base text-text-primary">
                          {team.name}
                        </h3>
                        {team.status === 'locked_pending_payment' && (
                          <Badge variant="warning" size="sm" className="animate-pulse">
                            Chờ duyệt lệ phí
                          </Badge>
                        )}
                        {team.status === 'verified' && (
                          <Badge variant="brand" size="sm">
                            <CheckCircle2 className="size-3 mr-1" />
                            Đã xác thực (Verified)
                          </Badge>
                        )}
                        {team.status === 'payment_rejected' && (
                          <Badge variant="danger" size="sm">
                            <XCircle className="size-3 mr-1" />
                            Lệ phí bị từ chối
                          </Badge>
                        )}
                        {team.status === 'draft' && (
                          <Badge variant="default" size="sm">
                            Bản nháp
                          </Badge>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-medium text-text-secondary">
                          <Users className="size-3 text-brand-cyan" />
                          {team.members_count} thành viên
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Cuộc thi: <span className="text-text-primary font-medium">{team.competitions?.title || 'GenD Arena'}</span>
                      </p>
                    </div>

                    {/* Actions on desktop */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {team.status === 'locked_pending_payment' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setApproveTarget(team)}
                            isLoading={actionLoading === team.id}
                            leftIcon={<Check className="size-4" />}
                            className="text-xs"
                          >
                            Duyệt lệ phí
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setRejectTarget(team)
                              setRejectReason(presetReasons[0])
                            }}
                            isLoading={actionLoading === team.id}
                            leftIcon={<X className="size-4" />}
                            className="text-xs text-rose-400 border-rose-800/80 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700"
                          >
                            Từ chối
                          </Button>
                        </>
                      )}

                      {team.status === 'verified' && (
                        <div className="text-right">
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 justify-end">
                            <CheckCircle2 className="size-3.5" />
                            Đã duyệt ngày {formatDate(team.payment_verified_at)}
                          </span>
                        </div>
                      )}

                      {team.status === 'payment_rejected' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setApproveTarget(team)}
                          isLoading={actionLoading === team.id}
                          className="text-xs text-brand-cyan"
                        >
                          Duyệt lại
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Leader info */}
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <p className="font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">
                        Thông tin Trưởng đội
                      </p>
                      <p className="text-text-primary font-medium text-sm">
                        {team.leader?.full_name || 'Chưa cập nhật tên'}
                      </p>
                      <div className="space-y-1 text-text-secondary text-[11px]">
                        {team.leader?.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="size-3 text-text-tertiary shrink-0" />
                            <a href={`mailto:${team.leader.email}`} className="hover:text-brand-cyan">
                              {team.leader.email}
                            </a>
                          </div>
                        )}
                        {team.leader?.phone && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="size-3 text-text-tertiary shrink-0" />
                            <a href={`tel:${team.leader.phone}`} className="hover:text-brand-cyan">
                              {team.leader.phone}
                            </a>
                          </div>
                        )}
                        {team.leader?.university && (
                          <div className="flex items-center gap-1.5 truncate">
                            <School className="size-3 text-text-tertiary shrink-0" />
                            <span>{team.leader.university}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fee & Payment Details */}
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <p className="font-semibold text-text-tertiary uppercase tracking-wider text-[10px]">
                        Đối soát Lệ phí
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Mức phí theo sĩ số:</span>
                        <span className="font-mono font-semibold text-text-primary">
                          {formatVND(expectedFee)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Số tiền khai báo:</span>
                        <span
                          className={`font-mono font-bold ${
                            isMatch ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {formatVND(team.payment_amount)}
                        </span>
                      </div>
                      <div className="pt-1 text-[11px] text-text-tertiary flex items-center justify-between">
                        <span>Thời gian nộp:</span>
                        <span>{formatDate(team.payment_submitted_at)}</span>
                      </div>
                    </div>

                    {/* Receipt thumbnail / Rejection reason */}
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                      <p className="font-semibold text-text-tertiary uppercase tracking-wider text-[10px] mb-1">
                        Biên lai chuyển khoản
                      </p>

                      {team.payment_receipt_url ? (
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() =>
                              setPreviewImage({
                                url: team.payment_receipt_url!,
                                teamName: team.name,
                              })
                            }
                            className="relative size-16 rounded-md overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer group shrink-0"
                          >
                            <img
                              src={team.payment_receipt_url}
                              alt="Biên lai CK"
                              className="size-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="size-4 text-brand-cyan" />
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: team.payment_receipt_url!,
                                  teamName: team.name,
                                })
                              }
                              className="text-xs text-brand-cyan hover:underline font-medium flex items-center gap-1"
                            >
                              <span>Phóng to xem chi tiết</span>
                              <ExternalLink className="size-3" />
                            </button>
                            <p className="text-[10px] text-text-tertiary">
                              Bấm vào ảnh để kiểm tra số tài khoản &amp; mã GD
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-text-disabled text-xs italic">
                          Chưa tải lên ảnh biên lai
                        </div>
                      )}

                      {team.payment_rejected_reason && (
                        <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300">
                          <span className="font-semibold">Lý do từ chối: </span>
                          <span>{team.payment_rejected_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Phóng to xem ảnh biên lai */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent size="xl" className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-slate-950 border border-slate-800">
          {previewImage && (
            <div className="space-y-4">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg text-text-primary">
                  Biên lai chuyển khoản - {previewImage.teamName}
                </DialogTitle>
                <DialogDescription className="text-xs text-text-secondary">
                  Kiểm tra kỹ Số tiền, Thời gian giao dịch và Nội dung chuyển khoản
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center max-h-[65vh]">
                <img
                  src={previewImage.url}
                  alt={`Biên lai ${previewImage.teamName}`}
                  className="max-h-[65vh] w-auto object-contain"
                />
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Mở ảnh gốc trong tab mới</span>
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewImage(null)}
                  className="text-xs"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Xác nhận Duyệt lệ phí */}
      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
      >
        <DialogContent size="md" className="p-6 bg-slate-950 border border-slate-800">
          {approveTarget && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-2">
                <div className="size-10 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center">
                  <CheckCircle2 className="size-6" />
                </div>
                <DialogTitle className="text-lg text-text-primary">
                  Xác nhận Duyệt Lệ phí Đội thi
                </DialogTitle>
                <DialogDescription className="text-xs text-text-secondary leading-relaxed">
                  Bạn đang chuẩn bị xác nhận thanh toán lệ phí cho đội <strong className="text-text-primary font-semibold">{approveTarget.name}</strong> ({approveTarget.members_count} thành viên - {formatVND(approveTarget.payment_amount)}).
                </DialogDescription>
              </DialogHeader>

              <div className="p-3.5 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20 text-xs text-text-secondary space-y-1.5">
                <p className="font-semibold text-brand-cyan flex items-center gap-1">
                  <Sparkles className="size-3.5" />
                  Hành động tự động sau khi duyệt:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-text-tertiary">
                  <li>Đội thi chuyển sang trạng thái <strong>Verified</strong>.</li>
                  <li>Mở quyền nộp đề án và nộp file bài thi cho đội.</li>
                  <li>Gửi thông báo thành công đến toàn bộ thành viên trong đội.</li>
                </ul>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setApproveTarget(null)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(approveTarget)}
                  isLoading={actionLoading === approveTarget.id}
                  className="text-xs"
                >
                  Xác nhận Duyệt ngay
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Nhập lý do Từ chối */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent size="md" className="p-6 bg-slate-950 border border-slate-800">
          {rejectTarget && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-2">
                <div className="size-10 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="size-6" />
                </div>
                <DialogTitle className="text-lg text-text-primary">
                  Từ chối Biên lai - {rejectTarget.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-text-secondary">
                  Chọn lý do từ chối để hệ thống tự động gửi thông báo hướng dẫn tới Trưởng đội.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-text-secondary">
                  Chọn lý do mẫu:
                </label>
                <div className="space-y-1.5">
                  {presetReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRejectReason(reason)
                        setCustomReason('')
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition ${
                        rejectReason === reason && !customReason
                          ? 'border-brand-cyan/60 bg-brand-cyan/10 text-brand-cyan font-medium'
                          : 'border-slate-800 bg-slate-900/60 text-text-secondary hover:border-slate-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-text-secondary">
                    Hoặc nhập lý do tùy chỉnh:
                  </label>
                  <Textarea
                    placeholder="Nhập ghi chú cụ thể cho thí sinh..."
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value)
                      setRejectReason('')
                    }}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRejectTarget(null)
                    setRejectReason('')
                    setCustomReason('')
                  }}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRejectConfirm}
                  isLoading={actionLoading === rejectTarget.id}
                  className="text-xs bg-rose-600 border-rose-500 text-white hover:bg-rose-500 hover:text-white"
                >
                  Xác nhận Từ chối
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
