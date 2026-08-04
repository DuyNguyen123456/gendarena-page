'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { MASCOT_IMAGE_CONFIG } from '@/data/faqs'

interface FaqMascotTriggerProps {
  isOpen: boolean
  onClick: () => void
  unreadCount?: number
}

export default function FaqMascotTrigger({
  isOpen,
  onClick,
}: FaqMascotTriggerProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center group">
      {/* Hover Tooltip Label */}
      <div
        className={`mr-3 px-3 py-1.5 rounded-lg bg-[#0b132b]/95 border border-cyan-500/40 text-cyan-300 text-xs font-semibold tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all duration-300 pointer-events-none whitespace-nowrap hidden sm:block ${
          isOpen
            ? 'opacity-0 scale-95 translate-x-2'
            : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0'
        }`}
      >
        <span className="flex items-center gap-1.5 font-orbitron">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          Hỏi đáp Gen D Arena 2026
        </span>
      </div>

      {/* Trigger Button with Glowing Neon Rings */}
      <button
        onClick={onClick}
        aria-label={isOpen ? 'Đóng trợ lý FAQ' : 'Mở trợ lý FAQ'}
        aria-expanded={isOpen}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#050814]"
      >
        {/* Animated Cyber Ring Aura */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400 opacity-75 blur-sm group-hover:opacity-100 animate-pulse transition duration-500" />
        
        {/* Outer Border */}
        <div className="absolute inset-0 rounded-full bg-[#070e24] border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center overflow-hidden">
          {!imageError ? (
            <Image
              src={MASCOT_IMAGE_CONFIG.path}
              alt={MASCOT_IMAGE_CONFIG.alt}
              width={64}
              height={64}
              priority
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isOpen ? 'rotate-12 scale-110' : 'group-hover:rotate-6'
              }`}
              onError={() => setImageError(true)}
            />
          ) : (
            /* Fallback Graphic Avatar if Mascot Image is Missing */
            <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-indigo-950 flex flex-col items-center justify-center text-cyan-300 font-orbitron font-bold text-xs tracking-tighter">
              <span className="text-base">🤖</span>
              <span>FAQ</span>
            </div>
          )}
        </div>

        {/* Small "FAQ" Badge */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 bg-cyan-500 text-black text-[10px] font-extrabold font-orbitron px-1.5 py-0.5 rounded-full border border-black shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-bounce">
            FAQ
          </span>
        )}

        {/* Close indicator toggle overlay when open */}
        {isOpen && (
          <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300">
            <span className="text-cyan-400 font-bold text-xl font-orbitron">✕</span>
          </div>
        )}
      </button>
    </div>
  )
}
