'use client'

import { useEffect, useState, useRef } from 'react'

interface CountdownProps {
  targetDate: string
  phaseTitle?: string
}

export default function Countdown({ targetDate, phaseTitle = 'VÒNG SƠ LOẠI' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  })

  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const targetTime = new Date(targetDate).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = targetTime - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [targetDate])

  if (!isMounted) {
    // Return skeleton to prevent layout shift during hydration
    return (
      <div className="w-full max-w-2xl mx-auto my-6 p-6 rounded-lg border border-[#1e2d5a] bg-slate-950/40 animate-pulse h-[140px]" />
    )
  }

  // Calculate percentage fills for visual feedback
  const secondsPercent = (timeLeft.seconds / 60) * 100
  const minutesPercent = (timeLeft.minutes / 60) * 100
  const hoursPercent = (timeLeft.hours / 24) * 100
  const daysPercent = Math.min((timeLeft.days / 90) * 100, 100) // normalized to 90 days max

  return (
    <div className="w-full max-w-2xl mx-auto my-8 relative group">
      {/* Cyberpunk Decorative Borders */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-indigo-500/30 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none" />
      
      {/* Cyber corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-20" />

      {/* Main Container */}
      <div className="relative tech-panel-glow bg-[#0b1124]/90 p-5 md:p-6 rounded-xl border border-cyan-500/30 overflow-hidden">
        {/* Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,48,0)_96%,rgba(0,240,255,0.06)_98%)] bg-[length:100%_4px] pointer-events-none" />
        
        {/* Cyber hud dot indicator */}
        <div className="absolute top-2 left-6 right-6 flex justify-between items-center text-[9px] text-cyan-400/40 font-mono tracking-widest pointer-events-none select-none">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-400/50 uppercase">{phaseTitle}</span>
          </span>
        </div>

        {timeLeft.isExpired ? (
          <div className="text-center py-6">
            <h3 className="font-orbitron text-xl md:text-2xl font-bold tracking-widest text-cyan-400 animate-pulse">
              ĐÃ ĐẾN GIỜ MỞ ĐƠN CHÍNH THỨC!
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-2">Hệ thống đang mở nhận hồ sơ đăng ký tham dự giải đấu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 md:gap-5 mt-4 text-center">
            {/* Days Card */}
            <div className="relative flex flex-col items-center p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-lg overflow-hidden">
              <span className="font-orbitron text-3xl md:text-5xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] select-none">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wider font-sans mt-1">
                NGÀY
              </span>
              {/* Progress bar ticker */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-cyan-400 transition-all duration-1000" style={{ width: `${daysPercent}%` }} />
            </div>

            {/* Hours Card */}
            <div className="relative flex flex-col items-center p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-lg overflow-hidden">
              <span className="font-orbitron text-3xl md:text-5xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] select-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wider font-sans mt-1">
                GIỜ
              </span>
              {/* Progress bar ticker */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-cyan-400 transition-all duration-1000" style={{ width: `${hoursPercent}%` }} />
            </div>

            {/* Minutes Card */}
            <div className="relative flex flex-col items-center p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-lg overflow-hidden">
              <span className="font-orbitron text-3xl md:text-5xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] select-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wider font-sans mt-1">
                PHÚT
              </span>
              {/* Progress bar ticker */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-cyan-400 transition-all duration-1000" style={{ width: `${minutesPercent}%` }} />
            </div>

            {/* Seconds Card */}
            <div className="relative flex flex-col items-center p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-lg overflow-hidden">
              <span className="font-orbitron text-3xl md:text-5xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] select-none">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wider font-sans mt-1">
                GIÂY
              </span>
              {/* Progress bar ticker */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-cyan-400 transition-all duration-500" style={{ width: `${secondsPercent}%` }} />
            </div>
          </div>
        )}


      </div>
    </div>
  )
}
