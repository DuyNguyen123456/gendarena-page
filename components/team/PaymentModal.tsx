'use client'

import { useState, useRef, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BANK_CONFIG, getVietQRUrl, generatePaymentMemo } from '@/constants/bank'
import { calculateExpectedFee, type TeamPaymentStatus } from '@/types/payment'
import { submitTeamPayment } from '@/services/payments'
import {
  CreditCard,
  Copy,
  Check,
  Upload,
  FileText,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Users,
  Sparkles,
  ExternalLink,
  Download,
  XCircle,
  Clock,
} from 'lucide-react'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: {
    id: string
    name: string
    status?: TeamPaymentStatus
    payment_amount?: number
    payment_rejected_reason?: string | null
    leader_id: string
  }
  membersCount: number
  onSuccess: () => void
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export default function PaymentModal({
  open,
  onOpenChange,
  team,
  membersCount,
  onSuccess,
}: PaymentModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const expectedAmount = useMemo(() => calculateExpectedFee(membersCount), [membersCount])
  const memo = useMemo(() => generatePaymentMemo(team.name), [team.name])
  const qrUrl = useMemo(
    () => getVietQRUrl({ amount: expectedAmount, memo }),
    [expectedAmount, memo]
  )

  const isEligible = membersCount >= 3 && membersCount <= 5

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg('Kích thước tệp quá lớn. Tối đa 10MB.')
      return
    }

    setFile(selected)
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!isEligible) {
      setErrorMsg('Đội thi cần có từ 3 đến 5 thành viên để nộp lệ phí.')
      return
    }

    if (!file) {
      setErrorMsg('Vui lòng tải lên ảnh chụp màn hình biên lai chuyển khoản thành công.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const res = await submitTeamPayment({
      teamId: team.id,
      leaderId: team.leader_id,
      file,
      expectedAmount,
      teamName: team.name,
    })

    setIsSubmitting(false)

    if (res.ok) {
      handleRemoveFile()
      onOpenChange(false)
      onSuccess()
    } else {
      setErrorMsg(res.error || 'Có lỗi xảy ra khi gửi biên lai. Vui lòng thử lại.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 bg-slate-950 border border-slate-800 text-text-primary">
        <DialogHeader className="text-left space-y-1.5 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              Lệ phí dự thi
            </Badge>
            <span className="text-xs text-text-tertiary">|</span>
            <span className="text-xs text-text-secondary font-medium">
              Đội thi: <strong className="text-brand-cyan">{team.name}</strong>
            </span>
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <CreditCard className="size-6 text-brand-cyan" />
            <span>Nộp Lệ phí &amp; Xác thực Đội thi</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Hoàn tất chuyển khoản lệ phí dự thi để khóa danh sách thành viên và nhận Huy hiệu Verified mở cổng nộp bài.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Rejection Warning Banner */}
          {team.status === 'payment_rejected' && team.payment_rejected_reason && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-rose-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Biên lai trước đó bị từ chối</span>
              </div>
              <p className="text-[11px] text-rose-300/90 pl-6">
                <strong>Lý do: </strong>{team.payment_rejected_reason}
              </p>
              <p className="text-[10px] text-rose-400/80 pl-6">
                Vui lòng kiểm tra lại thông tin và tải lên ảnh biên lai hợp lệ bên dưới.
              </p>
            </div>
          )}

          {/* Sĩ số & Mức phí cảnh báo */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-brand-cyan" />
                <span className="text-xs font-semibold text-text-primary">
                  Sĩ số đội hiện tại: {membersCount} thành viên
                </span>
              </div>
              <p className="text-[11px] text-text-tertiary">
                Bảng biểu phí: 3 thành viên = 36.000đ | 4 thành viên = 44.000đ | 5 thành viên = 50.000đ
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-semibold text-text-tertiary block">
                Mức phí cần thanh toán
              </span>
              <span className="font-mono text-xl font-bold text-brand-cyan">
                {formatVND(expectedAmount)}
              </span>
            </div>
          </div>

          {!isEligible && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Chưa đủ điều kiện chốt đội thi</span>
              </div>
              <p className="text-[11px] text-amber-200/90">
                Đội thi cần có tối thiểu <strong>3 thành viên</strong> (tối đa 5 thành viên) để chốt danh sách và nộp lệ phí dự thi. Hiện tại đội bạn có {membersCount} thành viên.
              </p>
            </div>
          )}

          {/* Transfer & VietQR Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* VietQR Code Card */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <QrCode className="size-4 text-brand-cyan" />
                <span>Quét mã VietQR chuyển khoản nhanh</span>
              </div>

              <div className="relative p-2 rounded-xl bg-white shadow-xl max-w-[240px] w-full aspect-square flex items-center justify-center overflow-hidden">
                <img
                  src={qrUrl}
                  alt={`VietQR ${team.name}`}
                  className="size-full object-contain"
                />
              </div>

              <p className="text-[11px] text-text-tertiary max-w-xs">
                Mã QR đã nhúng sẵn số tiền <strong>{formatVND(expectedAmount)}</strong> và nội dung chuyển khoản tự động.
              </p>
            </div>

            {/* Manual Account Details */}
            <div className="space-y-3 text-xs">
              <p className="font-semibold text-text-secondary text-xs flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>Thông tin tài khoản nhận lệ phí của BTC:</span>
              </p>

              {/* Bank Name */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-text-tertiary">
                  Ngân hàng thụ hưởng
                </span>
                <p className="font-medium text-text-primary">{BANK_CONFIG.BANK_NAME}</p>
              </div>

              {/* Account Number */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] uppercase font-semibold text-text-tertiary">
                    Số tài khoản
                  </span>
                  <p className="font-mono font-bold text-sm text-brand-cyan truncate">
                    {BANK_CONFIG.ACCOUNT_NO}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(BANK_CONFIG.ACCOUNT_NO, 'account_no')}
                  className="text-xs h-7 px-2.5 shrink-0"
                >
                  {copiedField === 'account_no' ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span className="ml-1">
                    {copiedField === 'account_no' ? 'Đã sao chép' : 'Sao chép'}
                  </span>
                </Button>
              </div>

              {/* Account Name */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] uppercase font-semibold text-text-tertiary">
                    Chủ tài khoản
                  </span>
                  <p className="font-medium text-text-primary text-xs uppercase truncate">
                    {BANK_CONFIG.ACCOUNT_NAME}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(BANK_CONFIG.ACCOUNT_NAME, 'account_name')}
                  className="text-xs h-7 px-2.5 shrink-0"
                >
                  {copiedField === 'account_name' ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span className="ml-1">
                    {copiedField === 'account_name' ? 'Đã sao chép' : 'Sao chép'}
                  </span>
                </Button>
              </div>

              {/* Transfer Memo */}
              <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/30 flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] uppercase font-semibold text-brand-cyan">
                    Nội dung chuyển khoản (Bắt buộc)
                  </span>
                  <p className="font-mono font-bold text-xs text-text-primary truncate">
                    {memo}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(memo, 'memo')}
                  className="text-xs h-7 px-2.5 shrink-0 border-brand-cyan/40 text-brand-cyan hover:bg-brand-cyan/10"
                >
                  {copiedField === 'memo' ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span className="ml-1">
                    {copiedField === 'memo' ? 'Đã sao chép' : 'Sao chép'}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Receipt Section */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Upload className="size-4 text-brand-cyan" />
                <span>Tải lên ảnh chụp màn hình biên lai chuyển khoản</span>
              </label>
              <span className="text-[11px] text-text-tertiary">
                Hỗ trợ JPG, PNG, WebP, PDF (Tối đa 10MB)
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="hidden"
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-brand-cyan/60 rounded-xl p-6 text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900/80 group"
              >
                <Upload className="size-8 mx-auto text-text-tertiary group-hover:text-brand-cyan transition mb-2" />
                <p className="text-xs font-medium text-text-primary">
                  Nhấn vào đây để chọn ảnh biên lai chuyển khoản
                </p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Đảm bảo thấy rõ Số tiền, Thời gian và Mã giao dịch
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="size-14 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="size-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <FileText className="size-6 text-brand-cyan" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-8"
                  >
                    Thay đổi
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="text-xs h-8 text-rose-400 border-rose-900/40 hover:bg-rose-950/40"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
                <XCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-[11px] text-text-tertiary">
            Sau khi nộp, danh sách thành viên sẽ được chốt và chờ BTC phê duyệt.
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!isEligible || !file || isSubmitting}
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="size-4" />}
              className="text-xs"
            >
              Xác nhận đã chuyển khoản
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
