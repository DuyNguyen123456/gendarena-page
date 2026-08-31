'use client'

import { useEffect, useState, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import {
  sendTeamJoinRequest,
  type BrowseTeam,
  type TeamMemberProfile,
  type TeamMemberDetail,
} from '@/services/teams'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Search,
  Users,
  User as UserIcon,
  Radio,
  Plus,
  Trophy,
  AlertCircle,
  AlertTriangle,
  Crown,
  School,
  BookOpen,
  Info,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

export default function BrowseTeamsPage() {
  const [teams, setTeams] = useState<BrowseTeam[]>([])
  const [selectedTeamForView, setSelectedTeamForView] = useState<BrowseTeam | null>(null)
  const [myRequests, setMyRequests] = useState<Record<string, string>>({}) // team_id -> status
  const [userHasTeam, setUserHasTeam] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // teamId currently requesting
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning'; isIncomplete?: boolean } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<User | null>(null)

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

      // Check if user already has a team (member or leader)
      const [{ data: memberRecord }, { data: leaderRecord }] = await Promise.all([
        supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('teams').select('id').eq('leader_id', user.id).maybeSingle(),
      ])

      const hasTeam = Boolean(memberRecord || leaderRecord)
      setUserHasTeam(hasTeam)

      // Fetch pending requests of the user (only active pending requests block new requests)
      const { data: requests } = await supabase
        .from('team_join_requests')
        .select('team_id, status')
        .eq('requester_id', user.id)

      if (requests) {
        const reqMap: Record<string, string> = {}
        requests.forEach((r) => {
          if (r.status === 'pending') {
            reqMap[r.team_id] = 'pending'
          }
        })
        setMyRequests(reqMap)
      }

      // Fetch open teams with members & leader
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, name, description, max_members, is_open, leader_id, competition_id,
          leader:profiles!leader_id(id, full_name, university, faculty, major, avatar_url),
          competitions(title),
          team_members(id, role, user_id, joined_at)
        `)
        .eq('is_open', true)

      if (teamsError) {
        console.error('Fetch teams error:', teamsError)
        setFetchError('Không thể tải danh sách đội thi. Vui lòng thử lại sau.')
      } else if (teamsData) {
        // Collect all member user IDs across all teams to fetch full profile metadata
        const allUserIds = Array.from(
          new Set(
            teamsData.flatMap((t: any) => [
              t.leader_id,
              ...(t.team_members || []).map((m: any) => m.user_id),
            ])
          )
        )

        const profileMap: Record<string, TeamMemberProfile> = {}
        if (allUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, university, faculty, major, avatar_url')
            .in('id', allUserIds)

          profilesData?.forEach((p) => {
            profileMap[p.id] = p
          })
        }

        const processedTeams: BrowseTeam[] = teamsData.map((t: any) => {
          const members: TeamMemberDetail[] = (t.team_members || []).map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            profile: profileMap[m.user_id] ?? null,
          }))

          return {
            ...t,
            leader: (t.leader as unknown as TeamMemberProfile) ?? profileMap[t.leader_id] ?? null,
            members,
          }
        })

        // Filter out teams that are already full on client side
        const availableTeams = processedTeams.filter((t) => t.members.length < t.max_members)
        setTeams(availableTeams)
      }

      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  const handleJoinRequest = async (teamId: string) => {
    if (!user) return
    if (userHasTeam) {
      setMessage({ text: 'Bạn đã là thành viên của một đội thi khác.', type: 'error' })
      return
    }

    setActionLoading(teamId)
    setMessage(null)

    const result = await sendTeamJoinRequest(teamId, user)

    if (!result.ok) {
      setMessage({
        text: result.error,
        type: result.isIncomplete ? 'warning' : 'error',
        isIncomplete: result.isIncomplete,
      })
      setActionLoading(null)
      return
    }

    // Success
    setMyRequests((prev) => ({ ...prev, [teamId]: 'pending' }))
    setMessage({
      text: 'Gửi yêu cầu gia nhập đội thành công! Đang chờ trưởng đội phê duyệt.',
      type: 'success',
    })
    setActionLoading(null)
  }

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams
    const q = searchQuery.toLowerCase()
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.competitions?.title && t.competitions.title.toLowerCase().includes(q)) ||
        (t.leader?.full_name && t.leader.full_name.toLowerCase().includes(q)) ||
        (t.leader?.university && t.leader.university.toLowerCase().includes(q))
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
                Khám phá các đội thi đang mở tuyển quân, xem thông tin thành viên và gửi yêu cầu gia nhập
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
              placeholder="Tìm theo tên đội, trưởng đội, trường hoặc cuộc thi..."
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

        {/* Global Message Banner with Incomplete Profile CTA */}
        {message && (
          <div
            className={`p-4 rounded-lg border text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              message.type === 'error'
                ? 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
                : message.type === 'warning'
                ? 'bg-semantic-warning/10 border-semantic-warning/30 text-semantic-warning'
                : 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === 'error' ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : message.type === 'warning' ? (
                <AlertTriangle className="size-4 shrink-0" />
              ) : (
                <Radio className="size-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            {message.isIncomplete && (
              <Link href="/dashboard">
                <Button variant="secondary" size="sm" className="shrink-0 text-xs">
                  Đi đến Dashboard để cập nhật hồ sơ
                </Button>
              </Link>
            )}
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
              const currentMembers = team.members?.length || 0
              const isUserInThisTeam = user?.id ? (team.members?.some((m) => m.user_id === user.id) || team.leader_id === user.id) : false
              const requestStatus = myRequests[team.id]

              return (
                <Card
                  key={team.id}
                  interactive
                  onClick={() => setSelectedTeamForView(team)}
                  className="p-6 flex flex-col justify-between card-hover-glow space-y-5 cursor-pointer group transition duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <Badge variant="brand" size="sm" className="mb-2">
                          <Trophy className="size-3 mr-1" />
                          {team.competitions?.title || 'Đấu trường'}
                        </Badge>
                        <h3 className="font-display text-lg font-semibold text-text-primary tracking-tight truncate group-hover:text-brand-cyan transition">
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
                    <p className="text-text-secondary text-xs leading-relaxed line-clamp-2 min-h-[36px]">
                      {team.description || 'Chưa có mô tả chi tiết cho đội hình này.'}
                    </p>

                    {/* Leader info */}
                    <div className="border-t border-surface-border/70 pt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-tertiary flex items-center gap-1 shrink-0">
                          <Crown className="size-3 text-brand-cyan" />
                          Trưởng đội:
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UserAvatar
                            src={team.leader?.avatar_url}
                            name={team.leader?.full_name}
                            size="sm"
                            ringBrand
                          />
                          <span className="text-text-primary font-semibold truncate max-w-[130px] text-right">
                            {team.leader?.full_name || 'Vô danh'}
                          </span>
                        </div>
                      </div>
                      {team.leader?.university && (
                        <p className="text-[11px] text-text-tertiary truncate text-right">
                          {team.leader.university}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Detail trigger */}
                  <div className="pt-3 border-t border-surface-border/70 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTeamForView(team)
                      }}
                      className="text-xs shrink-0"
                    >
                      Chi tiết
                    </Button>

                    <div className="flex-1">
                      {userHasTeam ? (
                        isUserInThisTeam ? (
                          <Button variant="primary" size="sm" disabled className="w-full text-xs">
                            Đã gia nhập
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" disabled className="w-full cursor-not-allowed text-xs">
                            Đã có đội
                          </Button>
                        )
                      ) : requestStatus === 'pending' ? (
                        <Button variant="secondary" size="sm" disabled className="w-full opacity-80 cursor-not-allowed text-xs">
                          Đang chờ duyệt
                        </Button>
                      ) : currentMembers >= team.max_members ? (
                        <Button variant="secondary" size="sm" disabled className="w-full cursor-not-allowed text-xs">
                          Đã đủ người
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJoinRequest(team.id)
                          }}
                          isLoading={actionLoading === team.id}
                          className="w-full text-xs"
                        >
                          Xin gia nhập
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </motion.main>

      {/* TEAM DETAIL MODAL */}
      <Dialog
        open={!!selectedTeamForView}
        onOpenChange={(open) => !open && setSelectedTeamForView(null)}
      >
        <DialogContent size="lg" className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6">
          {selectedTeamForView && (
            <>
              {/* Modal Header */}
              <DialogHeader className="space-y-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="brand" size="sm">
                    <Trophy className="size-3 mr-1" />
                    {selectedTeamForView.competitions?.title || 'GenD Arena 2026'}
                  </Badge>
                  <Badge variant={selectedTeamForView.is_open ? 'success' : 'default'} size="sm">
                    {selectedTeamForView.is_open ? 'Đang mở tuyển' : 'Đã đóng tuyển'}
                  </Badge>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-mono text-brand-cyan">
                    <Users className="size-3.5" />
                    <span>
                      {selectedTeamForView.members.length}/{selectedTeamForView.max_members} thành viên
                    </span>
                  </div>
                </div>

                <DialogTitle className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  {selectedTeamForView.name}
                </DialogTitle>

                {selectedTeamForView.description && (
                  <DialogDescription className="text-xs sm:text-sm text-text-secondary leading-relaxed bg-surface-raised/60 p-3 rounded-lg border border-surface-border/60">
                    "{selectedTeamForView.description}"
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Section 1: Team Leader Block */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                  <Crown className="size-3.5 text-brand-cyan" />
                  Trưởng đội thi
                </h4>

                <div className="p-4 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <UserAvatar
                      src={selectedTeamForView.leader?.avatar_url}
                      name={selectedTeamForView.leader?.full_name}
                      size="lg"
                      ringBrand
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-text-primary">
                          {selectedTeamForView.leader?.full_name || 'Vô danh'}
                        </span>
                        <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                          Trưởng nhóm
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary flex items-center gap-1.5 truncate">
                        <School className="size-3 text-text-tertiary shrink-0" />
                        <span>{selectedTeamForView.leader?.university || 'Chưa cập nhật trường học'}</span>
                      </p>
                      {(selectedTeamForView.leader?.faculty || selectedTeamForView.leader?.major) && (
                        <p className="text-[11px] text-text-tertiary flex items-center gap-1.5 truncate">
                          <BookOpen className="size-3 text-text-tertiary shrink-0" />
                          <span>
                            {selectedTeamForView.leader.faculty}
                            {selectedTeamForView.leader.faculty && selectedTeamForView.leader.major ? ' · ' : ''}
                            {selectedTeamForView.leader.major}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Current Team Members List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                    <Users className="size-3.5 text-text-tertiary" />
                    Danh sách thành viên ({selectedTeamForView.members.length})
                  </h4>
                  <span className="text-xs text-text-tertiary font-mono">
                    Còn trống {Math.max(0, selectedTeamForView.max_members - selectedTeamForView.members.length)} vị trí
                  </span>
                </div>

                <div className="border border-surface-border rounded-xl divide-y divide-surface-border bg-surface-raised/40 overflow-hidden">
                  {selectedTeamForView.members.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-tertiary">
                      Chưa có dữ liệu thành viên
                    </div>
                  ) : (
                    selectedTeamForView.members.map((member, index) => {
                      const isLeader =
                        member.role === 'leader' || member.user_id === selectedTeamForView.leader_id
                      const memberName =
                        member.profile?.full_name ||
                        (isLeader ? selectedTeamForView.leader?.full_name : null) ||
                        `Thành viên ${index + 1}`
                      const memberAvatar =
                        member.profile?.avatar_url ||
                        (isLeader ? selectedTeamForView.leader?.avatar_url : null)

                      return (
                        <div
                          key={member.id || member.user_id || index}
                          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-surface-raised/80 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              src={memberAvatar}
                              name={memberName}
                              size="md"
                              ringBrand={isLeader}
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-medium text-text-primary truncate">
                                  {memberName}
                                </span>
                                {isLeader ? (
                                  <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                                    Trưởng nhóm
                                  </Badge>
                                ) : (
                                  <Badge variant="default" size="sm" className="text-[10px] px-1.5 py-0">
                                    Thành viên
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-text-secondary truncate">
                                {member.profile?.university ||
                                  (isLeader ? selectedTeamForView.leader?.university : null) ||
                                  'Chưa cập nhật trường học'}
                              </p>
                              {(member.profile?.faculty || member.profile?.major) && (
                                <p className="text-[10px] text-text-tertiary truncate">
                                  {member.profile.faculty}
                                  {member.profile.faculty && member.profile.major ? ' · ' : ''}
                                  {member.profile.major}
                                </p>
                              )}
                            </div>
                          </div>

                          {member.joined_at && (
                            <div className="text-[10px] text-text-disabled shrink-0 hidden sm:flex items-center gap-1 font-mono">
                              <Clock className="size-3" />
                              <span>{new Date(member.joined_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-surface-border">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setSelectedTeamForView(null)}
                  className="w-full sm:w-auto text-xs"
                >
                  Đóng
                </Button>

                <div className="w-full sm:w-auto">
                  {userHasTeam ? (
                    (selectedTeamForView.members?.some((m) => m.user_id === user?.id) || selectedTeamForView.leader_id === user?.id) ? (
                      <Button variant="primary" size="md" disabled className="w-full sm:w-auto text-xs">
                        Đã gia nhập đội
                      </Button>
                    ) : (
                      <Button variant="secondary" size="md" disabled className="w-full sm:w-auto cursor-not-allowed text-xs">
                        Bạn đã có đội thi
                      </Button>
                    )
                  ) : myRequests[selectedTeamForView.id] === 'pending' ? (
                    <Button variant="secondary" size="md" disabled className="w-full sm:w-auto opacity-80 cursor-not-allowed text-xs">
                      Đang chờ duyệt yêu cầu
                    </Button>
                  ) : selectedTeamForView.members.length >= selectedTeamForView.max_members ? (
                    <Button variant="secondary" size="md" disabled className="w-full sm:w-auto cursor-not-allowed text-xs">
                      Đội thi đã đủ số lượng
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleJoinRequest(selectedTeamForView.id)}
                      isLoading={actionLoading === selectedTeamForView.id}
                      className="w-full sm:w-auto text-xs"
                      leftIcon={<Plus className="size-4" />}
                    >
                      Xin gia nhập đội thi này
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

