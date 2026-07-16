'use client'

interface LoadingProps {
  variant?: 'page' | 'section' | 'button'
  text?: string
}

/**
 * Unified cyberpunk loading indicator.
 *
 * variant="page"    → full-screen overlay (replaces LoadingScreen)
 * variant="section" → centred spinner inside a card/panel
 * variant="button"  → tiny inline spinner for submit buttons
 */
export default function Loading({ variant = 'page', text }: LoadingProps) {
  // ── Button variant ──────────────────────────────────────────────────────────
  if (variant === 'button') {
    return (
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin"
          style={{ boxShadow: '0 0 6px rgba(0,240,255,0.5)' }}
        />
        {text && <span>{text}</span>}
      </span>
    )
  }

  // ── Shared spinner markup ───────────────────────────────────────────────────
  const Spinner = () => (
    <div className="relative flex items-center justify-center w-20 h-20">
      {/* Outer ring */}
      <div
        className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-cyan-400"
        style={{ animation: 'radar-spin 1.1s linear infinite', boxShadow: '0 0 10px rgba(0,240,255,0.4)' }}
      />
      {/* Inner ring (reverse) */}
      <div
        className="absolute w-12 h-12 rounded-full border-2 border-transparent border-b-blue-500/80"
        style={{ animation: 'radar-spin 0.7s linear infinite reverse' }}
      />
      {/* Center dot */}
      <div
        className="w-3 h-3 rounded-full bg-cyan-400"
        style={{ boxShadow: '0 0 10px rgba(0,240,255,0.9), 0 0 20px rgba(0,240,255,0.4)' }}
      />
    </div>
  )

  // ── Section variant ─────────────────────────────────────────────────────────
  if (variant === 'section') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
        <Spinner />
        {text && (
          <p className="font-orbitron text-xs font-bold tracking-widest text-cyan-400 uppercase animate-pulse">
            {text}
          </p>
        )}
      </div>
    )
  }

  // ── Page variant (default) ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col items-center justify-center gap-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      {/* Radar rings */}
      <div className="relative flex items-center justify-center w-40 h-40">
        <div className="radar-ring absolute w-36 h-36" style={{ animationDelay: '0s' }} />
        <div className="radar-ring absolute w-24 h-24" style={{ animationDelay: '0.6s' }} />
        <div className="radar-ring absolute w-14 h-14" style={{ animationDelay: '1.2s' }} />
        <div
          className="absolute w-32 h-32 rounded-full border-2 border-transparent border-t-cyan-400"
          style={{ animation: 'radar-spin 1.1s linear infinite', boxShadow: '0 0 12px rgba(0,240,255,0.4)' }}
        />
        <div
          className="absolute w-20 h-20 rounded-full border-2 border-transparent border-b-blue-500/80"
          style={{ animation: 'radar-spin 0.7s linear infinite reverse' }}
        />
        <div
          className="w-4 h-4 rounded-full bg-cyan-400"
          style={{ boxShadow: '0 0 12px rgba(0,240,255,0.8)' }}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase animate-pulse">
          {text ?? 'Đang tải...'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-0.5 bg-[#1e2d5a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full animate-pulse"
          style={{
            width: '60%',
            background: 'linear-gradient(90deg, #112E81, #00F0FF)',
            boxShadow: '0 0 8px rgba(0,240,255,0.5)',
          }}
        />
      </div>
    </div>
  )
}
