'use client'

import { useEffect, useRef } from 'react'

/**
 * CursorCardGlow — Modal.com style card border + radial glow following cursor.
 *
 * Performance & constraints:
 * - Listens on parent element (Card) via pointermove + rAF.
 * - Updates CSS variables --card-x, --card-y directly with 0 React re-renders.
 * - Renders subtle surface glow + masked border glow.
 * - Disabled on touch (coarse pointer), reduced-motion, and viewports < 1024px.
 */
export default function CursorCardGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    const parent = el?.parentElement
    if (!parent || !el) return

    // Guard: touch, reduced motion, or mobile/tablet viewport
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 1024

    if (isTouch || prefersReducedMotion || isMobile) return

    let rafId: number | null = null
    let targetX = 0
    let targetY = 0

    const onPointerMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      targetX = e.clientX - rect.left
      targetY = e.clientY - rect.top

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (el) {
            el.style.setProperty('--card-x', `${targetX}px`)
            el.style.setProperty('--card-y', `${targetY}px`)
            el.style.opacity = '1'
          }
          rafId = null
        })
      }
    }

    const onPointerLeave = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (el) {
        el.style.opacity = '0'
      }
    }

    parent.addEventListener('pointermove', onPointerMove, { passive: true })
    parent.addEventListener('pointerleave', onPointerLeave, { passive: true })

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      parent.removeEventListener('pointermove', onPointerMove)
      parent.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px z-0 rounded-lg hidden lg:block opacity-0 transition-opacity duration-300 overflow-hidden"
    >
      {/* Subtle radial background fill */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(320px circle at var(--card-x, -999px) var(--card-y, -999px), rgba(0, 212, 255, 0.10), transparent 75%)',
        }}
      />
      {/* Subtle illuminated border highlight */}
      <div
        className="absolute inset-0 rounded-lg border border-brand-cyan/40"
        style={{
          maskImage:
            'radial-gradient(180px circle at var(--card-x, -999px) var(--card-y, -999px), black 20%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(180px circle at var(--card-x, -999px) var(--card-y, -999px), black 20%, transparent 75%)',
        }}
      />
    </div>
  )
}
