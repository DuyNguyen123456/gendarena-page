'use client'

import { useEffect, useRef, useState } from 'react'

interface Stat {
  value: string
  label: string
}

function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    let animId: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) {
        animId = requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }
    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [target, duration, start])

  return count
}

function StatItem({ stat, animated }: { stat: Stat; animated: boolean }) {
  const match = stat.value.match(/^(\d+)(.*)$/)
  const numTarget = match ? parseInt(match[1]) : 0
  const suffix = match ? match[2] : ''

  const count = useCountUp(numTarget, 1800, animated)

  return (
    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
      <div className="font-mono text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">
        {animated ? `${count}${suffix}` : stat.value}
      </div>
      <div className="font-display text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mt-0.5 sm:mt-1">
        {stat.label}
      </div>
    </div>
  )
}

const STATS: Stat[] = [
  { value: '500+', label: 'Thí sinh tham dự' },
  { value: '100tr', label: 'Tổng giải thưởng' },
  { value: '50+', label: 'Chuyên gia & Cố vấn' },
]

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated) {
          setAnimated(true)
        }
      },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [animated])

  return (
    <div
      ref={ref}
      className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 md:gap-8 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-surface-border/60"
    >
      {STATS.map((stat, idx) => (
        <div key={idx} className="flex items-center gap-4 sm:gap-6 md:gap-8">
          <StatItem stat={stat} animated={animated} />
          {idx < STATS.length - 1 && (
            <div className="hidden sm:block w-px h-8 bg-surface-border/80" />
          )}
        </div>
      ))}
    </div>
  )
}
