'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  ArrowLeft,
  ScrollText,
  Trophy,
  Calendar,
  Radio,
  Users,
} from 'lucide-react'

type Competition = {
  id: string
  title: string
  description: string
  rules?: string | null
  prizes?: string | null
  status: string
  registration_start?: string | null
  registration_end?: string | null
  submission_start?: string | null
  submission_end?: string | null
}

type User = {
  id: string
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }> = {
  upcoming: { label: 'Sắp diễn ra', variant: 'default' },
  registration: { label: 'Đang mở đăng ký thi', variant: 'info' },
  submission: { label: 'Đang nộp bài', variant: 'brand' },
  judging: { label: 'Đang chấm điểm', variant: 'warning' },
  completed: { label: 'Đã kết thúc', variant: 'success' },
}

export default function CompetitionDetailView({ id }: { id: string }) {
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', id)
        .single()
      if (!isMounted) return
      setCompetition(data)
      setLoading(false)
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [id, router, supabase])

  if (loading) return <Loading text="Đang tải dữ liệu cuộc thi..." />

  if (!competition) return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-xl bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger text-center space-y-4 shadow-elevation-2">
        <div className="flex justify-center">
          <AlertCircle className="size-10 text-semantic-danger" />
        </div>
        <p className="text-sm font-medium">Không tìm thấy thông tin cuộc thi</p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="secondary" size="md">
              Quay lại Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )

  const statusConfig = STATUS_MAP[competition.status] ?? {
    label: competition.status?.toUpperCase() || 'CUỘC THI',
    variant: 'default' as const,
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary py-12 px-4 sm:px-6 relative overflow-hidden font-body">
      {/* Decorative Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute top-10 left-10 w-80 h-80 bg-brand-cyan/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-brand-blue/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        {/* Back navigation */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand-cyan hover:text-brand-cyan-bright transition-colors uppercase"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại Dashboard</span>
        </Link>

        {/* Quest Briefing Header */}
        <Card className="p-6 sm:p-8 bg-surface-overlay border-surface-border shadow-elevation-2">
          <div className="mb-4">
            <Badge variant={statusConfig.variant} size="md">
              {statusConfig.label}
            </Badge>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3">
            {competition.title}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed max-w-3xl">
            {competition.description}
          </p>
        </Card>

        {/* Details Grid (Rules & Prizes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-sm font-semibold tracking-wider text-brand-cyan uppercase mb-4 flex items-center gap-2">
              <ScrollText className="size-4 text-brand-cyan shrink-0" />
              <span>Thể lệ thi đấu</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
              {competition.rules || 'Nội dung thể lệ đang được cập nhật bởi ban tổ chức...'}
            </p>
          </Card>

          <Card className="p-6 bg-surface-overlay border-surface-border">
            <h2 className="font-display text-sm font-semibold tracking-wider text-brand-cyan uppercase mb-4 flex items-center gap-2">
              <Trophy className="size-4 text-brand-cyan shrink-0" />
              <span>Cơ cấu giải thưởng</span>
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
              {competition.prizes || 'Thông tin giải thưởng chi tiết đang được cập nhật...'}
            </p>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="p-6 bg-surface-overlay border-surface-border">
          <h2 className="font-display text-sm font-semibold tracking-wider text-brand-cyan uppercase mb-5 flex items-center gap-2">
            <Calendar className="size-4 text-brand-cyan shrink-0" />
            <span>Lộ trình cuộc thi</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Mở đăng ký', value: competition.registration_start, variant: 'text-brand-cyan' },
              { label: 'Hết đăng ký', value: competition.registration_end, variant: 'text-brand-cyan' },
              { label: 'Bắt đầu nộp', value: competition.submission_start, variant: 'text-semantic-warning' },
              { label: 'Hạn nộp bài', value: competition.submission_end, variant: 'text-semantic-danger' },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-lg bg-surface-raised border border-surface-border flex flex-col justify-between h-20">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{item.label}</span>
                <span className={`text-xs font-mono font-medium ${item.variant}`}>
                  {item.value ? new Date(item.value).toLocaleDateString('vi-VN') : 'Chưa công bố'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {message && (
          <div className="p-4 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-sm text-brand-cyan flex items-center gap-2">
            <Radio className="size-4 text-brand-cyan shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Register Alliance Section */}
        <Link
          href={`/team/create?competitionId=${competition.id}`}
          className="block"
        >
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Users className="size-5" />}
            className="w-full h-12 text-base font-semibold"
          >
            Tạo đội thi mới & Đăng ký
          </Button>
        </Link>
      </div>
    </div>
  )
}
