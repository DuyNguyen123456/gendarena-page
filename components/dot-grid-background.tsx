export default function DotGridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-40 z-0"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--color-brand-cyan) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 25%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 25%, transparent 80%)',
      }}
      aria-hidden="true"
    />
  )
}
