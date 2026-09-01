export const BANK_CONFIG = {
  BANK_ID: process.env.NEXT_PUBLIC_BANK_ID || 'MOMO',
  BANK_NAME: 'Ví MoMo',
  ACCOUNT_NO: process.env.NEXT_PUBLIC_BANK_ACCOUNT || 'PSG2624319000000029',
  ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_NAME || 'NGUYEN NHAT HAO',
  QR_IMAGE_URL: '/images/payment-qr.jpg',
}

export interface VietQRParams {
  amount: number
  memo: string
  template?: 'compact2' | 'compact' | 'qr_only' | 'print'
}

/**
 * Generates dynamic VietQR image URL using img.vietqr.io API
 */
export function getVietQRUrl({
  amount,
  memo,
  template = 'compact2',
}: VietQRParams): string {
  const bankId = BANK_CONFIG.BANK_ID
  const accountNo = BANK_CONFIG.ACCOUNT_NO
  const accountName = encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)
  const addInfo = encodeURIComponent(memo)

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`
}

/**
 * Formats a standardized payment transfer memo for a team
 * Format: [Số lượng thành viên]_[Tên đội viết liền không dấu]_GENDARENA
 * e.g. "04_AHNEMVANPHONG_GENDARENA"
 */
export function generatePaymentMemo(teamName: string, membersCount: number = 1): string {
  const memberPrefix = String(Math.max(1, membersCount || 1)).padStart(2, '0')
  const cleaned = (teamName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim()

  return `${memberPrefix}_${cleaned || 'DOITHI'}_GENDARENA`
}

