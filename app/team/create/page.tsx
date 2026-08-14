'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Users,
  Trophy,
  FileText,
  AlertTriangle,
} from 'lucide-react'

type Competition = {
  id: string
  title: string
}

function CreateTeamForm() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompId, setSelectedCompId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(5)
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch competitions
      const { data: comps } = await supabase
        .from('competitions')
        .select('id, title')
        .order('created_at', { ascending: false })

      if (comps) {
        setCompetitions(comps)
        const paramId = searchParams.get('competitionId')
        if (paramId && comps.some((c) => c.id === paramId)) {
          setSelectedCompId(paramId)
        } else if (comps.length > 0) {
          setSelectedCompId(comps[0].id)
        }
      }
      setLoading(false)
    }
    init()
  }, [router, searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) {
      setError('Vui lòng nhập tên liên minh / đội.')
      return
    }
    if (!selectedCompId) {
      setError('Vui lòng chọn phân khu đấu trường.')
      return
    }

    setSubmitLoading(true)
    setError('')

    // INSERT teams only. trigger_sync_leader on teams will auto-insert into team_members.
    const { error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description.trim(),
        competition_id: selectedCompId,
        leader_id: user.id,
        max_members: maxMembers,
        is_open: isOpen,
      })
      .select()
      .single()

    if (teamError) {
      console.error('Tạo đội thất bại:', teamError)
      setError(`Lỗi: ${teamError.message}`)
      setSubmitLoading(false)
      return
    }

    // Success -> redirect to team dashboard
    router.push('/team/dashboard')
    router.refresh()
  }

  if (loading) return <Loading text="Đang tải thông tin thành lập đội..." />

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      {/* Hero Header với Subtle Background */}
      <div className="relative overflow-hidden border-b border-surface-border bg-surface-raised/40">
        <DotGridBackground />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <motion.div
            className="absolute -top-20 left-1/2 -translate-x-1/2 size-[450px] rounded-full bg-brand-cyan/8 blur-3xl"
            animate={prefersReducedMotion ? {} : { x: ['-3%', '3%', '-3%'] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan-bright font-medium transition mb-4 group"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            <span>Quay lại Bảng điều khiển</span>
          </Link>

          <div>
            <Badge variant="brand" size="sm" className="mb-2">
              GenD Arena 2026
            </Badge>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
              Thành lập đội thi mới
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Khởi tạo liên minh thi đấu của riêng bạn để bắt đầu tham chiến và chiêu mộ thành viên
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <motion.main
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12"
      >
        <Card className="p-6 sm:p-8 shadow-elevation-2">
          {error && (
            <div className="p-3.5 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-start gap-2.5 mb-6">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-semantic-danger" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Cuộc thi / Đấu trường tham dự <span className="text-semantic-danger">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-text-primary focus:outline-none focus:border-brand-cyan text-sm transition"
                >
                  {competitions.map((comp) => (
                    <option key={comp.id} value={comp.id} className="bg-surface-raised text-text-primary">
                      {comp.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Tên đội thi / Liên minh <span className="text-semantic-danger">*</span>
              </label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cybernetic Innovators"
                leftIcon={<Users className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Mô tả đội hình & Mục tiêu
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Mô tả mục tiêu của đội hoặc các kỹ năng/vị trí đang tìm kiếm..."
                className="w-full px-4 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-cyan text-sm transition resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Số lượng thành viên tối đa
                </label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(parseInt(e.target.value) || 5)}
                  leftIcon={<Users className="size-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Trạng thái tuyển quân
                </label>
                <div className="flex items-center h-10 px-3.5 bg-surface-overlay border border-surface-border rounded-lg justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    {isOpen ? 'Đang mở tuyển quân' : 'Tạm khóa tuyển quân'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={(e) => setIsOpen(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-raised border border-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary after:border-surface-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-cyan peer-checked:after:bg-surface-base"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-surface-border">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={submitLoading}
                className="flex-1"
              >
                Thành lập đội thi
              </Button>
              <Link href="/dashboard" className="sm:w-auto">
                <Button variant="ghost" size="lg" className="w-full">
                  Hủy bỏ
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </motion.main>
    </div>
  )
}

export default function CreateTeamPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateTeamForm />
    </Suspense>
  )
}

