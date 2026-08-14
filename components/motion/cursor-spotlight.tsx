'use client'

import { useEffect, useRef } from 'react'

/**
 * CursorSpotlight — Modal.com style radial cyan spotlight following the pointer in Hero.
 *
 * Performance & constraints:
 * - Uses pointermove + requestAnimationFrame updating CSS variables directly (0 React re-renders).
 * - Fully disabled on:
 *   1. Touch devices (matchMedia '(pointer: coarse)')
 *   2. Reduced motion (matchMedia '(prefers-reduced-motion: reduce)')
 *   3. Mobile/tablet screens (window.innerWidth < 1024)
 * - Transitions opacity to 0 on pointerleave within 250ms.
 */
export default function CursorSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = spotlightRef.current
    const parent = el?.parentElement
    if (!parent || !el) return

    // Guard: touch, reduced motion, or mobile viewport
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
            el.style.setProperty('--spot-x', `${targetX}px`)
            el.style.setProperty('--spot-y', `${targetY}px`)
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
      ref={spotlightRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block transition-opacity duration-300 opacity-0"
      style={{
        background:
          'radial-gradient(550px circle at var(--spot-x, -999px) var(--spot-y, -999px), rgba(0, 212, 255, 0.11), transparent 70%)',
      }}
    />
  )
}
