export const BANK_CONFIG = {
  BANK_ID: process.env.NEXT_PUBLIC_BANK_ID || 'ICB',
  BANK_NAME: 'VietinBank - CN Vĩnh Long - PGD Phước Thọ',
  ACCOUNT_NO: process.env.NEXT_PUBLIC_BANK_ACCOUNT || '107882670096',
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
 * e.g. "GEND TEAM_ALPHA"
 */
export function generatePaymentMemo(teamName: string): string {
  const cleaned = teamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')

  return `GEND ${cleaned.slice(0, 20)}`
}

