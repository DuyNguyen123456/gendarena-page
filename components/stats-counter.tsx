'use client'

import { useEffect, useRef, useState } from 'react'

interface Stat {
  value: string
  label: string
  desc: string
  textGlow?: string
  border: string
}

function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])

  return count
}

function StatCard({ stat, animated }: { stat: Stat; animated: boolean }) {
  // Parse value: e.g. "500+" → target=500, suffix="+"
  //              "100 TR" → target=100, suffix=" TR"
  //              "50+" → target=50, suffix="+"
  const match = stat.value.match(/^(\d+)(.*)$/)
  const numTarget = match ? parseInt(match[1]) : 0
  const suffix = match ? match[2] : ''

  const count = useCountUp(numTarget, 1800, animated)

  return (
    <div className={`tech-panel cyber-corners p-6 flex flex-col items-center justify-center transition hover:border-cyan-400/40 hover:bg-cyan-950/10 group ${stat.border}`}>
      <div className={`font-orbitron text-4xl font-extrabold mb-1 tracking-tight ${stat.textGlow ? `text-yellow-400 ${stat.textGlow}` : 'text-cyan-400'}`}>
        {animated ? `${count}${suffix}` : stat.value}
      </div>
      <div className="text-xs font-bold tracking-widest text-slate-300 mb-2">{stat.label}</div>
      <div className="text-slate-500 text-xs text-center">{stat.desc}</div>
    </div>
  )
}

const STATS: Stat[] = [
  { value: '500+', label: 'ĐẤU THỦ THAM GIA', desc: 'Các thí sinh trên toàn quốc', border: 'border-cyan-500/20' },
  { value: '100 TR', label: 'TỔNG GIẢI THƯỞNG', desc: 'Hỗ trợ vốn & cơ hội đầu tư', border: 'border-yellow-500/20', textGlow: 'neon-text-yellow' },
  { value: '50+', label: 'HỘI ĐỒNG CHUYÊN GIA', desc: 'Mentors và ban giám khảo công nghệ', border: 'border-cyan-500/20' },
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
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [animated])

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {STATS.map((stat, idx) => (
        <StatCard key={idx} stat={stat} animated={animated} />
      ))}
    </div>
  )
}
