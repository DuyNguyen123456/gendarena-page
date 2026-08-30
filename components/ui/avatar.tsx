'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  alt?: string
  ringBrand?: boolean
}

const sizeClasses = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
  xl: 'size-14 text-base font-bold',
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  className,
  alt,
  ringBrand = false,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  // Reset imgError if src changes
  useEffect(() => {
    setImgError(false)
  }, [src])

  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase()
  const altText = alt || name || 'User Avatar'

  if (src && !imgError) {
    return (
      <div
        className={cn(
          'relative shrink-0 rounded-full overflow-hidden bg-surface-overlay border',
          ringBrand ? 'border-brand-cyan/40 ring-2 ring-brand-cyan/20' : 'border-surface-border',
          sizeClasses[size],
          className
        )}
      >
        <img
          src={src}
          alt={altText}
          onError={() => setImgError(true)}
          className="size-full object-cover rounded-full"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      aria-label={altText}
      className={cn(
        'relative shrink-0 rounded-full flex items-center justify-center font-semibold select-none transition-colors',
        ringBrand
          ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan ring-2 ring-brand-cyan/20'
          : 'bg-surface-raised border border-surface-border text-text-secondary',
        sizeClasses[size],
        className
      )}
    >
      <span>{initial}</span>
    </div>
  )
}

export default UserAvatar
