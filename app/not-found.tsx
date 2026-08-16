import Link from 'next/link'
import { SearchX, Home, ArrowLeft } from 'lucide-react'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-brand-cyan/5 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-brand-blue/10 rounded-full blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <Card className="p-8 sm:p-10 shadow-elevation-3 bg-surface-overlay border-surface-border flex flex-col items-center">
          {/* Icon Badge */}
          <div className="size-16 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan mb-6 shadow-glow">
            <SearchX className="size-8 text-brand-cyan" aria-hidden="true" />
          </div>

          {/* 404 Code Badge */}
          <span className="font-mono text-xs font-semibold tracking-wider text-brand-cyan uppercase mb-2">
            MÃ LỖI: 404 NOT FOUND
          </span>

          {/* Main Title */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mb-3">
            404 — Không tìm thấy trang
          </h1>

          {/* Friendly Description */}
          <p className="font-body text-text-secondary text-sm leading-relaxed mb-8 max-w-md">
            Địa chỉ bạn đang tìm kiếm có thể đã bị di chuyển, xóa bỏ hoặc không tồn tại trên hệ thống GenD Arena.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Link href="/" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Home className="size-4" />}
                className="w-full sm:w-auto"
              >
                Trang chủ
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ArrowLeft className="size-4" />}
                className="w-full sm:w-auto"
              >
                Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
