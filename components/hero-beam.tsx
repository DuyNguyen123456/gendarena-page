'use client'

import { motion, useReducedMotion } from 'framer-motion'

export default function HeroBeam() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Primary beam — top center, slow drift */}
      <motion.div
        className="absolute -top-60 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-brand-cyan/[0.06] blur-3xl"
        animate={prefersReducedMotion ? {} : {
          x: ['-12%', '12%', '-12%'],
          y: ['-6%', '6%', '-6%'],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Secondary beam — bottom left, slower drift, more muted */}
      <motion.div
        className="absolute top-1/2 -left-20 w-[400px] h-[400px] rounded-full bg-brand-cyan/[0.04] blur-3xl"
        animate={prefersReducedMotion ? {} : {
          x: ['-8%', '8%', '-8%'],
          y: ['8%', '-8%', '8%'],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />
    </div>
  )
}
