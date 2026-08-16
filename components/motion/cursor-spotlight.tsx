'use client'

import { useEffect, useRef } from 'react'

/**
 * CursorSpotlight — Fluid organic water-bubble / blob spotlight following pointer.
 *
 * Performance & constraints:
 * - Uses pointermove + lerp loop on requestAnimationFrame updating CSS variables.
 * - Zero React re-renders.
 * - Layered asymmetrical organic gradients for soft water-bubble feel.
 * - Strictly disabled on:
 *   1. Touch devices (matchMedia '(pointer: coarse)')
 *   2. Reduced motion (matchMedia '(prefers-reduced-motion: reduce)')
 *   3. Mobile/tablet screens (window.innerWidth < 1024)
 * - Transitions opacity to 0 smoothly on pointerleave.
 */
export default function CursorSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = spotlightRef.current
    const parent = el?.parentElement
    if (!parent || !el) return

    // Guard: touch devices, reduced motion preference, or small screens
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 1024

    if (isTouch || prefersReducedMotion || isMobile) return

    let rafId: number | null = null
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let isInside = false

    const updatePosition = () => {
      if (!isInside) {
        rafId = null
        return
      }

      // Smooth organic lerp follow physics (fluid lag)
      currentX += (targetX - currentX) * 0.14
      currentY += (targetY - currentY) * 0.14

      el.style.setProperty('--spot-x', `${currentX.toFixed(1)}px`)
      el.style.setProperty('--spot-y', `${currentY.toFixed(1)}px`)
      el.style.setProperty('--spot-offset-x', `${(currentX + 25).toFixed(1)}px`)
      el.style.setProperty('--spot-offset-y', `${(currentY - 18).toFixed(1)}px`)

      rafId = requestAnimationFrame(updatePosition)
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      targetX = e.clientX - rect.left
      targetY = e.clientY - rect.top

      if (!isInside) {
        isInside = true
        currentX = targetX
        currentY = targetY
        el.style.opacity = '1'
        if (rafId === null) {
          rafId = requestAnimationFrame(updatePosition)
        }
      } else if (rafId === null) {
        rafId = requestAnimationFrame(updatePosition)
      }
    }

    const onPointerLeave = () => {
      isInside = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      el.style.opacity = '0'
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
        background: `
          radial-gradient(ellipse 500px 380px at var(--spot-x, -999px) var(--spot-y, -999px), rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.03) 40%, transparent 70%),
          radial-gradient(ellipse 360px 440px at var(--spot-offset-x, -999px) var(--spot-offset-y, -999px), rgba(14, 165, 233, 0.05) 0%, rgba(124, 58, 237, 0.02) 45%, transparent 75%)
        `,
      }}
    />
  )
}
