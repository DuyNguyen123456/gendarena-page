import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAppUrl() {
  // In browser during local development, always use actual origin to avoid
  // accidentally sending recovery emails to a production URL from .env.local
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    return window.location.origin
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
  // Production browser fallback
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}
