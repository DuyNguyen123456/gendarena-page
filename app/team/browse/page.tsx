'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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
  Search,
  Users,
  User as UserIcon,
  Radio,
  Plus,
  Trophy,
  AlertCircle,
} from 'lucide-react'

type Team = {
  id: string
  name: string
  description: string | null
  max_members: number
  is_open: boolean
  leader_id: string
  competition_id: string
  leader?: {
    full_name: string
  } | null
  competitions?: {
    title: string
  } | null
  team_members?: {
    user_id: string
  }[]
}

export default function BrowseTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [myRequests, setMyRequests] = useState<Record<string, string>>({}) // team_id -> status
  const [userHasTeam, setUserHasTeam] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // teamId currently requesting
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Check if user already has a team
      const { data: memberRecord } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberRecord) {
        setUserHasTeam(true)
      }

      // Fetch pending requests of the user
      const { data: requests } = await supabase
        .from('team_join_requests')
        .select('team_id, status')
        .eq('requester_id', user.id)

      if (requests) {
        const reqMap: Record<string, string> = {}
        requests.forEach((r) => {
          reqMap[r.team_id] = r.status
        })
        setMyRequests(reqMap)
      }

      // Fetch open teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, name, description, max_members, is_open, leader_id, competition_id,
          leader:profiles!leader_id(full_name),
          competitions(title),
          team_members(user_id)
        `)
        .eq('is_open', true)

      if (teamsError) {
        console.error('Fetch teams error:', teamsError)
        setFetchError('Không thể tải danh sách đội thi. Vui lòng thử lại sau.')
      } else if (teamsData) {
        // Filter out teams that are already full on client side
        const availableTeams = (teamsData as unknown as Team[]).filter((t) => {
          const count = t.team_members?.length || 0
          return count < t.max_members
        })
        setTeams(availableTeams)
      }

      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  const handleJoinRequest = async (teamId: string) => {
    if (!user) return
    if (userHasTeam) {
      setMessage('Bạn đã là thành viên của một đội thi khác.')
      return
    }

    setActionLoading(teamId)
    setMessage('')

    const { error } = await supabase.from('team_join_requests').insert({
      team_id: teamId,
      requester_id: user.id,
      status: 'pending',
    })

    if (error) {
      console.error('Gửi yêu cầu thất bại:', error)
      setMessage(`Lỗi: ${error.message}`)
      setActionLoading(null)
      return
    }

    // Success
    setMyRequests((prev) => ({ ...prev, [teamId]: 'pending' }))
    setMessage('Gửi yêu cầu gia nhập đội thành công! Đang chờ trưởng đội phê duyệt.')
    setActionLoading(null)
  }

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams
    const q = searchQuery.toLowerCase()
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.competitions?.title && t.competitions.title.toLowerCase().includes(q))
    )
  }, [teams, searchQuery])

  if (loading) return <Loading variant="browse" text="Đang tải danh sách đội thi..." />

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

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:text-brand-cyan-bright font-medium transition mb-4 group"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            <span>Quay lại Bảng điều khiển</span>
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Badge variant="brand" size="sm">
                  GenD Arena 2026
                </Badge>
                <Badge variant={userHasTeam ? 'success' : 'info'} size="sm">
                  {userHasTeam ? 'Đã có đội thi' : 'Đang tìm đội'}
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                Tìm kiếm & Gia nhập đội thi
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Khám phá các đội thi đang mở tuyển quân và tham gia đề án
              </p>
            </div>

            <Link href="/team/create">
              <Button variant="primary" size="md" leftIcon={<Plus className="size-4" />}>
                Tạo đội mới
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.main
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6"
      >
        {/* Search Bar & Stats Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Tìm theo tên đội, cuộc thi hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="size-4" />}
            />
          </div>

          <div className="text-xs text-text-tertiary font-medium self-end sm:self-center">
            Hiển thị <span className="text-text-primary font-semibold">{filteredTeams.length}</span> đội đang mở tuyển
          </div>
        </div>

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-semantic-danger" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Global Message Banner */}
        {message && (
          <div className="p-4 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-sm text-brand-cyan flex items-center gap-2.5">
            <Radio className="size-4 shrink-0 text-brand-cyan" />
            <span>{message}</span>
          </div>
        )}

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <Card className="text-center py-16">
            <Users className="size-12 text-text-tertiary mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-text-primary">
              {searchQuery ? 'Không tìm thấy đội thi phù hợp' : 'Hiện chưa có đội nào đang mở tuyển'}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Hãy thử tìm kiếm với từ khóa khác hoặc tự tạo đội thi mới của riêng bạn.'
                : 'Bạn có thể tự khởi tạo một đội thi và mời các thí sinh khác tham gia.'}
            </p>
            <div className="mt-6">
              <Link href="/team/create">
                <Button variant="primary" size="md" leftIcon={<Plus className="size-4" />}>
                  Tạo đội mới ngay
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              const currentMembers = team.team_members?.length || 0
              const requestStatus = myRequests[team.id]

              return (
                <Card
                  key={team.id}
                  interactive
                  className="p-6 flex flex-col justify-between card-hover-glow space-y-5"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <Badge variant="brand" size="sm" className="mb-2">
                          <Trophy className="size-3 mr-1" />
                          {team.competitions?.title || 'Đấu trường'}
                        </Badge>
                        <h3 className="font-display text-lg font-semibold text-text-primary tracking-tight truncate">
                          {team.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-overlay border border-surface-border text-xs font-mono text-brand-cyan shrink-0">
                        <Users className="size-3.5" />
                        <span>
                          {currentMembers}/{team.max_members}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-text-secondary text-xs leading-relaxed line-clamp-3 min-h-[48px]">
                      {team.description || 'Chưa có mô tả chi tiết cho đội hình này.'}
                    </p>

                    {/* Leader info */}
                    <div className="border-t border-surface-border pt-3 flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">Trưởng đội:</span>
                      <span className="text-text-primary font-semibold flex items-center gap-1.5">
                        <UserIcon className="size-3.5 text-brand-cyan" />
                        {team.leader?.full_name || 'Vô danh'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-surface-border">
                    {userHasTeam ? (
                      <Button variant="secondary" size="sm" disabled className="w-full cursor-not-allowed">
                        Đã có đội thi
                      </Button>
                    ) : requestStatus === 'pending' ? (
                      <Button variant="secondary" size="sm" disabled className="w-full opacity-80 cursor-not-allowed">
                        Đang chờ duyệt...
                      </Button>
                    ) : requestStatus === 'accepted' ? (
                      <Button variant="primary" size="sm" disabled className="w-full">
                        Đã gia nhập
                      </Button>
                    ) : requestStatus === 'rejected' ? (
                      <Button variant="ghost" size="sm" disabled className="w-full text-semantic-danger">
                        Bị từ chối
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleJoinRequest(team.id)}
                        isLoading={actionLoading === team.id}
                        className="w-full"
                      >
                        Xin gia nhập
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </motion.main>
    </div>
  )
}

