'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoadingProps {
  variant?: 'page' | 'section' | 'button' | 'full' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  label?: string
  className?: string
}

/**
 * Unified Loading component adhering to GenD Arena 2026 design tokens.
 *
 * variant="page" | "full"    → Full-screen overlay with centered spinner
 * variant="section" | "inline" → Centered spinner for cards/panels/sections
 * variant="button"           → Tiny inline spinner for buttons
 */
export default function Loading({
  variant = 'page',
  size = 'md',
  text,
  label,
  className,
}: LoadingProps) {
  const displayText = text || label

  // ── Button / Inline tiny variant ─────────────────────────────────────────────
  if (variant === 'button') {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Loader2 className="size-4 animate-spin text-brand-cyan shrink-0" />
        {displayText && <span className="text-xs text-text-secondary">{displayText}</span>}
      </span>
    )
  }

  const iconSizeClass =
    size === 'sm' ? 'size-6' : size === 'lg' ? 'size-12' : 'size-8'

  // ── Section / Inline variant ────────────────────────────────────────────────
  if (variant === 'section' || variant === 'inline') {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-12 px-4 transition-colors",
          className
        )}
      >
        <Loader2 className={cn("animate-spin text-brand-cyan shrink-0", iconSizeClass)} />
        {displayText && (
          <p className="text-sm font-medium text-text-secondary tracking-wide">
            {displayText}
          </p>
        )}
      </div>
    )
  }

  // ── Page / Full screen variant (default) ────────────────────────────────────
  return (
    <div
      className={cn(
        "min-h-screen bg-surface-base text-text-primary flex flex-col items-center justify-center gap-4 relative",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-10 md:size-12 animate-spin text-brand-cyan shrink-0" />
        <p className="font-display text-sm md:text-base font-medium text-text-secondary tracking-wide animate-pulse">
          {displayText ?? 'Đang tải dữ liệu...'}
        </p>
      </div>
    </div>
  )
}
