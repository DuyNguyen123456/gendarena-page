import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAppUrl(): string {
  // 1. Nếu đang chạy trên Trình duyệt (Client-side)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    // Nếu là localhost / 127.0.0.1 -> Luôn dùng http://
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return origin.replace(/^https:/, 'http:')
    }
    return origin
  }

  // 2. Môi trường Server-side hoặc Build
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gendarena.com'
  return siteUrl.replace(/\/$/, '')
}
