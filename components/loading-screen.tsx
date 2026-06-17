'use client'

import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  text?: string
}

export default function LoadingScreen({ text = 'INITIALIZING ARENA SYSTEMS' }: LoadingScreenProps) {
  const [dots, setDots] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 100
        // Accelerate early, slow near end
        const increment = p < 70 ? Math.random() * 8 + 3 : Math.random() * 2 + 0.5
        return Math.min(p + increment, 97)
      })
    }, 150)

    return () => {
      clearInterval(dotInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col items-center justify-center gap-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Radar visual */}
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* Expanding rings */}
        <div className="radar-ring absolute w-32 h-32" style={{ animationDelay: '0s' }} />
        <div className="radar-ring absolute w-24 h-24" style={{ animationDelay: '0.5s' }} />
        <div className="radar-ring absolute w-16 h-16" style={{ animationDelay: '1s' }} />

        {/* Spinning arc */}
        <div
          className="absolute w-28 h-28 rounded-full border-2 border-transparent border-t-cyan-400"
          style={{ animation: 'radar-spin 1.2s linear infinite' }}
        />
        <div
          className="absolute w-20 h-20 rounded-full border-2 border-transparent border-b-blue-500"
          style={{ animation: 'radar-spin 0.8s linear infinite reverse' }}
        />

        {/* Center dot */}
        <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.8)]" />

        {/* Radar sweep line */}
        <div
          className="absolute w-14 h-0.5 origin-left"
          style={{
            background: 'linear-gradient(90deg, rgba(0,240,255,0.8), transparent)',
            left: '50%',
            top: '50%',
            marginTop: '-1px',
            animation: 'radar-spin 1.2s linear infinite',
          }}
        />
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-3">
        <p className="font-orbitron text-base font-bold tracking-widest text-cyan-400 uppercase">
          {text}
          <span className="inline-block w-8 text-left">{dots}</span>
        </p>
        <p className="text-slate-500 text-xs tracking-widest uppercase">
          GEND ARENA • SECURE ACCESS TERMINAL
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-[#1e2d5a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #112E81, #00F0FF)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.5)',
          }}
        />
      </div>
    </div>
  )
}
