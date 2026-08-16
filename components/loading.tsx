'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface LoadingProps {
  variant?: 'page' | 'dashboard' | 'submissions' | 'profile' | 'browse' | 'section' | 'button' | 'full' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  label?: string
  className?: string
}

/**
 * Unified Skeleton Loading component adhering to GenD Arena 2026 design tokens.
 * Supports desktop multi-column & mobile stacked views with smooth pulse animation.
 */
export default function Loading({
  variant = 'page',
  size = 'md',
  text,
  label,
  className,
}: LoadingProps) {
  const displayText = text || label

  // ── Button / Inline tiny spinner variant ─────────────────────────────────────
  if (variant === 'button') {
    return (
      <span className={cn("inline-flex items-center gap-2", className)} aria-live="polite">
        <Loader2 className="size-4 animate-spin text-brand-cyan shrink-0" />
        {displayText && <span className="text-xs text-text-secondary">{displayText}</span>}
      </span>
    )
  }

  // ── Section / Inline Card Skeleton ──────────────────────────────────────────
  if (variant === 'section' || variant === 'inline') {
    return (
      <div
        className={cn("w-full py-6 space-y-4", className)}
        aria-label={displayText || 'Đang tải dữ liệu...'}
        role="status"
      >
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    )
  }

  // ── Dashboard Skeleton ─────────────────────────────────────────────────────
  if (variant === 'dashboard') {
    return (
      <div
        className={cn("min-h-screen bg-surface-base text-text-primary", className)}
        aria-label={displayText || 'Đang tải dữ liệu bảng điều khiển...'}
        role="status"
      >
        {/* Hero Header Skeleton */}
        <div className="border-b border-surface-border bg-surface-raised/40 py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="h-8 w-40 rounded-lg" />
            </div>

            <div className="space-y-2 pt-2">
              <Skeleton className="h-8 md:h-10 w-64 md:w-80" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
          </div>
        </div>

        {/* Content Skeleton: Stats + 2-Column Grid */}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
          {/* 4 Stats Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-xl border border-surface-border bg-surface-raised flex items-center gap-3.5">
                <Skeleton className="size-10 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
            ))}
          </div>

          {/* 2 Columns: Left Roster / Right Side Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-xl border border-surface-border bg-surface-raised space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <Skeleton className="h-5 w-44" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-surface-border bg-surface-overlay flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <Skeleton className="size-10 rounded-full shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-xl border border-surface-border bg-surface-raised space-y-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Submissions Skeleton ───────────────────────────────────────────────────
  if (variant === 'submissions') {
    return (
      <div
        className={cn("min-h-screen bg-surface-base text-text-primary", className)}
        aria-label={displayText || 'Đang tải dữ liệu bài nộp...'}
        role="status"
      >
        <div className="border-b border-surface-border bg-surface-raised/40 py-8 md:py-12">
          <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-3">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-8 md:h-10 w-64 md:w-80" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
          <div className="p-6 rounded-xl border border-surface-border bg-surface-raised space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
              <Skeleton className="size-9 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-4 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Profile Skeleton ───────────────────────────────────────────────────────
  if (variant === 'profile') {
    return (
      <div
        className={cn("min-h-screen bg-surface-base text-text-primary", className)}
        aria-label={displayText || 'Đang tải hồ sơ cá nhân...'}
        role="status"
      >
        <div className="border-b border-surface-border bg-surface-raised/40 py-8 md:py-12">
          <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-3">
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-8 md:h-10 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
          <div className="p-6 sm:p-8 rounded-xl border border-surface-border bg-surface-raised space-y-6">
            <Skeleton className="h-6 w-48" />
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <Skeleton className="size-24 rounded-full shrink-0" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg sm:col-span-2" />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-xl border border-surface-border bg-surface-raised space-y-6">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="flex justify-end pt-4 border-t border-surface-border">
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Browse Teams Skeleton ──────────────────────────────────────────────────
  if (variant === 'browse') {
    return (
      <div
        className={cn("min-h-screen bg-surface-base text-text-primary", className)}
        aria-label={displayText || 'Đang tải danh sách...'}
        role="status"
      >
        <div className="border-b border-surface-border bg-surface-raised/40 py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-3">
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-8 md:h-10 w-64 md:w-80" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <Skeleton className="h-10 w-full sm:max-w-md rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-xl border border-surface-border bg-surface-raised space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <Skeleton className="h-6 w-14 rounded-md" />
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="pt-3 border-t border-surface-border flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // ── Default Page / Full Skeleton (Adaptive Multi-row + Responsive Cards) ──
  return (
    <div
      className={cn("min-h-screen bg-surface-base text-text-primary", className)}
      aria-label={displayText || 'Đang tải hệ thống...'}
      role="status"
    >
      {/* Header Banner Skeleton */}
      <div className="border-b border-surface-border bg-surface-raised/40 py-8 md:py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-8 md:h-10 w-64 md:w-80" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 rounded-xl border border-surface-border bg-surface-raised space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
              <div className="pt-3 border-t border-surface-border flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
