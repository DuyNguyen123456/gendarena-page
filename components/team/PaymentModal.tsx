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
import { BANK_CONFIG, generatePaymentMemo } from '@/constants/bank'
import { calculateExpectedFee, FEE_TIERS, type TeamPaymentStatus } from '@/types/payment'
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
  Download,
  XCircle,
  Eye,
  CheckCircle2,
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
  const [showFullQR, setShowFullQR] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const expectedAmount = useMemo(() => calculateExpectedFee(membersCount), [membersCount])
  const memo = useMemo(() => generatePaymentMemo(team.name, membersCount), [team.name, membersCount])
  const qrImageSrc = BANK_CONFIG.QR_IMAGE_URL || '/images/payment-qr.jpg'

  const isEligible = membersCount >= 1 && membersCount <= 5

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 2 * 1024 * 1024) {
      setErrorMsg('Ảnh biên lai không được vượt quá 2MB.')
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
      setErrorMsg('Đội thi cần có từ 1 đến 5 thành viên để nộp lệ phí.')
      return
    }

    if (!file) {
      setErrorMsg('Vui lòng tải lên ảnh chụp màn hình biên lai chuyển khoản thành công.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ảnh biên lai không được vượt quá 2MB.')
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
    <>
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
              Hoàn tất chuyển khoản lệ phí dự thi để chốt danh sách thành viên và nhận Huy hiệu Verified mở cổng nộp bài.
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

            {/* Sĩ số & Bảng Biểu Phí */}
            <div className="p-4.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-brand-cyan" />
                    <span className="text-xs font-semibold text-text-primary">
                      Sĩ số đội hiện tại: <span className="text-brand-cyan">{membersCount} thành viên</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    Mức phí áp dụng theo chính sách ưu đãi theo số lượng thành viên:
                  </p>
                </div>

                <div className="text-left sm:text-right bg-slate-950/60 p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-text-tertiary block">
                    Mức phí cần thanh toán
                  </span>
                  <span className="font-mono text-xl font-bold text-brand-cyan">
                    {formatVND(expectedAmount)}
                  </span>
                </div>
              </div>

              {/* Bảng biểu phí 5 mốc */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {FEE_TIERS.map((tier) => {
                  const isActive = membersCount === tier.count
                  return (
                    <div
                      key={tier.count}
                      className={`p-2.5 rounded-lg border text-center transition ${
                        isActive
                          ? 'border-brand-cyan bg-brand-cyan/15 text-text-primary shadow-sm ring-1 ring-brand-cyan/40'
                          : 'border-slate-800 bg-slate-950/40 text-text-secondary hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold">
                        <span>{tier.count} người</span>
                        {isActive && <CheckCircle2 className="size-3 text-brand-cyan" />}
                      </div>
                      <div className={`font-mono text-xs font-bold mt-1 ${isActive ? 'text-brand-cyan' : 'text-text-primary'}`}>
                        {tier.totalLabel}
                      </div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">
                        {tier.perPersonLabel}
                      </div>
                      {isActive && (
                        <span className="inline-block mt-1 text-[9px] uppercase font-bold text-brand-cyan bg-brand-cyan/20 px-1.5 py-0.2 rounded">
                          Đội của bạn
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {!isEligible && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Chưa đủ điều kiện chốt đội thi</span>
                </div>
                <p className="text-[11px] text-amber-200/90">
                  Đội thi cần có từ <strong>1 đến 5 thành viên</strong> để nộp lệ phí dự thi.
                </p>
              </div>
            )}

            {/* Transfer & QR Code Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* VietinBank QR Code Card */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                  <QrCode className="size-4 text-brand-cyan" />
                  <span>Quét mã VietQR VietinBank</span>
                </div>

                <div className="relative p-1 rounded-2xl bg-gradient-to-b from-brand-cyan/30 via-slate-800 to-slate-900 shadow-xl max-w-[250px] w-full overflow-hidden group">
                  <img
                    src={qrImageSrc}
                    alt={`Mã VietQR thanh toán - ${BANK_CONFIG.ACCOUNT_NAME}`}
                    className="w-full h-auto rounded-xl object-contain cursor-pointer transition group-hover:opacity-95"
                    onClick={() => setShowFullQR(true)}
                  />
                  <div
                    onClick={() => setShowFullQR(true)}
                    className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer rounded-xl"
                  >
                    <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 text-xs font-medium text-text-primary border border-slate-700 flex items-center gap-1.5 shadow-lg">
                      <Eye className="size-3.5 text-brand-cyan" />
                      Phóng to
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full justify-center pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowFullQR(true)}
                    className="text-xs h-7 px-3"
                    leftIcon={<Eye className="size-3.5" />}
                  >
                    Xem ảnh lớn
                  </Button>
                  <a
                    href={qrImageSrc}
                    download="vietinbank-qr-gendarena.jpg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7 px-3 text-brand-cyan border-brand-cyan/40 hover:bg-brand-cyan/10"
                      leftIcon={<Download className="size-3.5" />}
                    >
                      Tải ảnh QR
                    </Button>
                  </a>
                </div>

                <p className="text-[11px] text-text-tertiary max-w-xs">
                  Mở ứng dụng Ngân hàng (VietinBank iPay hoặc bất kỳ ngân hàng nào) để quét mã QR chuyển khoản nhanh.
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

                {/* Amount to transfer */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] uppercase font-semibold text-text-tertiary">
                      Số tiền cần chuyển ({membersCount} thành viên)
                    </span>
                    <p className="font-mono font-bold text-sm text-emerald-400 truncate">
                      {formatVND(expectedAmount)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(String(expectedAmount), 'amount')}
                    className="text-xs h-7 px-2.5 shrink-0"
                  >
                    {copiedField === 'amount' ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span className="ml-1">
                      {copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép'}
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
                  Hỗ trợ JPG, PNG, WebP, PDF (Tối đa 2MB)
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

      {/* Lightbox / Zoom Dialog for QR Code */}
      <Dialog open={showFullQR} onOpenChange={setShowFullQR}>
        <DialogContent size="md" className="p-4 bg-slate-950 border border-slate-800 text-text-primary max-w-md">
          <DialogHeader className="text-left space-y-1 border-b border-slate-800/80 pb-3">
            <DialogTitle className="text-base font-bold text-text-primary flex items-center gap-2">
              <QrCode className="size-5 text-brand-cyan" />
              <span>Mã VietQR Chuyển Khoản</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              VietinBank - {BANK_CONFIG.ACCOUNT_NAME} - {BANK_CONFIG.ACCOUNT_NO}
            </DialogDescription>
          </DialogHeader>

          <div className="p-2 flex items-center justify-center">
            <img
              src={qrImageSrc}
              alt="Mã VietQR"
              className="max-h-[65vh] w-auto rounded-xl object-contain shadow-2xl border border-slate-800"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <a
              href={qrImageSrc}
              download="vietinbank-qr-gendarena.jpg"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                size="sm"
                className="text-xs w-full sm:w-auto text-brand-cyan border-brand-cyan/40"
                leftIcon={<Download className="size-3.5" />}
              >
                Tải ảnh về máy
              </Button>
            </a>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFullQR(false)}
              className="text-xs"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
