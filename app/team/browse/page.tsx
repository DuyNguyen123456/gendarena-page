'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import {
  sendTeamJoinRequest,
  fetchBrowseTeams,
  type BrowseTeam,
  type TeamMemberProfile,
  type TeamMemberDetail,
} from '@/services/teams'
import { fetchTeamingContestants } from '@/services/profile'
import type { TeamingContestant } from '@/types/profile'
import { createNotification } from '@/services/notifications'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  Globe,
  GraduationCap,
  MessageCircle,
  ShieldAlert,
  Eye,
  Lock,
  X,
} from 'lucide-react'

function profileToContestant(p: any): TeamingContestant {
  const fields = p?.public_fields || {}
  return {
    id: p.id,
    uid: p.uid ?? null,
    full_name: p.full_name ?? null,
    avatar_url: p.avatar_url ?? null,
    university: fields.university !== false ? (p.university ?? null) : null,
    faculty: fields.faculty !== false ? (p.faculty ?? null) : null,
    major: fields.major !== false ? (p.major ?? null) : null,
    achievements: fields.achievements !== false ? (p.achievements ?? null) : null,
    phone: fields.phone !== false ? (p.phone ?? null) : null,
    email: fields.email !== false ? (p.email ?? null) : null,
    facebook_url: fields.facebook_url !== false ? (p.facebook_url ?? null) : null,
    public_fields: p.public_fields ?? null,
    created_at: p.created_at ?? null,
  }
}

function BrowseTeamsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'contestants' ? 'contestants' : 'teams'

  const [activeTab, setActiveTab] = useState<'teams' | 'contestants'>(initialTab)
  const [teams, setTeams] = useState<BrowseTeam[]>([])
  const [selectedTeamForView, setSelectedTeamForView] = useState<BrowseTeam | null>(null)
  const [myRequests, setMyRequests] = useState<Record<string, string>>({}) // team_id -> status
  const [userHasTeam, setUserHasTeam] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // teamId currently requesting
  const [message, setMessage] = useState<{
    text: string
    type: 'success' | 'error' | 'warning'
    isIncomplete?: boolean
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Contestants teaming state
  const [contestants, setContestants] = useState<TeamingContestant[]>([])
  const [contestantsLoading, setContestantsLoading] = useState(false)
  const [contestantsError, setContestantsError] = useState<string | null>(null)
  const [isRequesterIncomplete, setIsRequesterIncomplete] = useState(false)
  const [contestantSearchQuery, setContestantSearchQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedContestant, setSelectedContestant] = useState<TeamingContestant | null>(null)
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamingContestant | null>(null)

  // Leader invite management on browse page
  const [leaderTeam, setLeaderTeam] = useState<{
    id: string
    name: string
    max_members: number
    member_count: number
  } | null>(null)
  const [sentInvites, setSentInvites] = useState<{ id: string; invited_uid: string; status: string }[]>([])
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null)

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

      // 1. Check if user already has a team (member or leader) and get user role
      const [{ data: memberRecord }, { data: leaderRecord }, { data: currentUserProfile }] = await Promise.all([
        supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('teams').select('id, name, max_members, team_members(id)').eq('leader_id', user.id).maybeSingle(),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ])

      const hasTeam = Boolean(memberRecord || leaderRecord)
      setUserHasTeam(hasTeam)
      setUserRole(currentUserProfile?.role ?? null)

      if (leaderRecord) {
        setLeaderTeam({
          id: leaderRecord.id,
          name: leaderRecord.name,
          max_members: leaderRecord.max_members,
          member_count: ((leaderRecord.team_members as any[]) || []).length,
        })
        const { data: teamInvites } = await supabase
          .from('team_invites')
          .select('id, invited_uid, status')
          .eq('team_id', leaderRecord.id)
          .eq('status', 'pending')
        if (teamInvites) {
          setSentInvites(teamInvites)
        }
      }

      // 2. Fetch pending requests of the user
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

      // 3. Fetch open teams via secure API route (đảm bảo phân tách luồng Tester và Thí sinh)
      const teamsRes = await fetchBrowseTeams(user.id)
      if (!teamsRes.ok) {
        console.error('Fetch teams error:', teamsRes.error)
        setFetchError(teamsRes.error || 'Không thể tải danh sách đội thi. Vui lòng thử lại sau.')
      } else {
        setTeams(teamsRes.teams)
      }

      // 4. Fetch Teaming Contestants
      setContestantsLoading(true)
      const contestantsRes = await fetchTeamingContestants(user.id)
      if (!contestantsRes.ok) {
        if (contestantsRes.isIncomplete) {
          setIsRequesterIncomplete(true)
        } else {
          setContestantsError(contestantsRes.error)
        }
      } else {
        setContestants(contestantsRes.contestants)
      }
      setContestantsLoading(false)

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

    setMyRequests((prev) => ({ ...prev, [teamId]: 'pending' }))
    setMessage({
      text: 'Gửi yêu cầu gia nhập đội thành công! Đang chờ trưởng đội phê duyệt.',
      type: 'success',
    })
    setActionLoading(null)
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev))
    }, 2000)
  }

  // Leader Action: Direct invite contestant
  const handleInviteContestant = async (contestant: TeamingContestant) => {
    if (!leaderTeam || !user) return
    if (!contestant.uid) {
      setMessage({ text: 'Thí sinh này chưa được cấp mã định danh UID.', type: 'error' })
      return
    }
    if (leaderTeam.member_count >= leaderTeam.max_members) {
      setMessage({ text: 'Đội thi của bạn đã đạt số lượng thành viên tối đa.', type: 'error' })
      return
    }

    const formattedUid = contestant.uid.trim().toUpperCase()
    setInviteActionLoading(contestant.id)
    setMessage(null)

    try {
      const { data: inserted, error: inviteErr } = await supabase
        .from('team_invites')
        .insert({
          team_id: leaderTeam.id,
          invited_uid: formattedUid,
          invited_by: user.id,
          status: 'pending',
        })
        .select('id, invited_uid, status')
        .single()

      if (inviteErr) {
        setMessage({ text: `Gửi lời mời thất bại: ${inviteErr.message}`, type: 'error' })
      } else {
        if (inserted) {
          setSentInvites((prev) => [...prev, inserted])
        }
        setMessage({
          text: `Đã gửi lời mời tham gia đội "${leaderTeam.name}" tới ${contestant.full_name || 'thí sinh'}!`,
          type: 'success',
        })

        // Chỉ gửi thông báo nếu người mời không phải là tài khoản Tester để cách ly luồng dữ liệu
        if (userRole !== 'tester') {
          try {
            await createNotification({
              userId: contestant.id,
              title: 'Lời mời tham gia đội thi',
              message: `Đội "${leaderTeam.name}" đã gửi lời mời bạn tham gia đội thi.`,
              type: 'team_invite',
              link: '/dashboard',
            })
          } catch (nErr) {
            console.warn('Failed to send team invite notification:', nErr)
          }
        }
      }
    } catch (err: any) {
      setMessage({ text: `Lỗi: ${err?.message || 'Không thể gửi lời mời'}`, type: 'error' })
    } finally {
      setInviteActionLoading(null)
    }
  }

  // Leader Action: Cancel / revoke invite (calls secure backend endpoint)
  const handleCancelInviteByUid = async (contestantUid: string, inviteId?: string) => {
    if (!user || !leaderTeam) return
    setInviteActionLoading(contestantUid)
    setMessage(null)

    try {
      const res = await fetch('/api/teams/invites/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId,
          teamId: leaderTeam.id,
          invitedUid: contestantUid,
          userId: user.id,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setSentInvites((prev) =>
          prev.filter((i) => i.invited_uid.toUpperCase() !== contestantUid.toUpperCase())
        )
        setMessage({ text: 'Đã thu hồi lời mời thành công.', type: 'success' })
      } else {
        setMessage({ text: data.error || 'Thu hồi lời mời thất bại.', type: 'error' })
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Lỗi khi thu hồi lời mời.', type: 'error' })
    } finally {
      setInviteActionLoading(null)
    }
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

  const filteredContestants = useMemo(() => {
    if (!contestantSearchQuery.trim()) return contestants
    const q = contestantSearchQuery.toLowerCase()
    return contestants.filter(
      (c) =>
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.university && c.university.toLowerCase().includes(q)) ||
        (c.faculty && c.faculty.toLowerCase().includes(q)) ||
        (c.major && c.major.toLowerCase().includes(q)) ||
        (c.achievements && c.achievements.toLowerCase().includes(q))
    )
  }, [contestants, contestantSearchQuery])

  if (loading) return <Loading variant="browse" text="Đang tải danh sách đội thi & thí sinh..." />

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      {/* Hero Header */}
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
                Khám phá &amp; Ghép đội thi
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Tìm kiếm đội thi đang tuyển quân hoặc kết nối với các thí sinh tự do để cùng thành lập đội mới
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
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-surface-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 border ${
              activeTab === 'teams'
                ? 'bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan shadow-glow-sm'
                : 'bg-surface-raised/50 border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border/80'
            }`}
          >
            <Users className="size-4" />
            <span>Đội thi đang mở tuyển</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'teams'
                  ? 'bg-brand-cyan text-brand-navy'
                  : 'bg-surface-overlay text-text-tertiary'
              }`}
            >
              {teams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contestants')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 border ${
              activeTab === 'contestants'
                ? 'bg-brand-gold/10 border-brand-gold/40 text-brand-gold shadow-glow-sm'
                : 'bg-surface-raised/50 border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border/80'
            }`}
          >
            <Sparkles className="size-4 text-brand-gold" />
            <span>Thí sinh tìm đồng đội</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'contestants'
                  ? 'bg-brand-gold text-brand-navy'
                  : 'bg-surface-overlay text-text-tertiary'
              }`}
            >
              {contestants.length}
            </span>
          </button>
        </div>

        {/* Global Message Banner */}
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
                  Đi đến Bảng điều khiển để cập nhật hồ sơ
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 1: TEAMS BROWSE VIEW */}
        {/* ================================================================ */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
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

            {/* Teams Grid */}
            {filteredTeams.length === 0 ? (
              <Card className="text-center py-16">
                <Users className="size-12 text-text-tertiary mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-semibold text-text-primary">
                  {searchQuery ? 'Không tìm thấy đội thi phù hợp' : 'Hiện chưa có đội nào đang mở tuyển'}
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? 'Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang Tab Thí sinh để tự tìm đồng đội ghép nhóm mới.'
                    : 'Bạn có thể tự khởi tạo một đội thi hoặc kết nối với các thí sinh tự do khác.'}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Link href="/team/create">
                    <Button variant="primary" size="md" leftIcon={<Plus className="size-4" />}>
                      Tạo đội mới ngay
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setActiveTab('contestants')}
                    leftIcon={<Sparkles className="size-4 text-brand-gold" />}
                  >
                    Xem thí sinh tìm đội
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => {
                  const currentMembers = team.members?.length || 0
                  const isUserInThisTeam = user?.id
                    ? team.members?.some((m) => m.user_id === user.id) || team.leader_id === user.id
                    : false
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

                      {/* Actions */}
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
                              leftIcon={<Plus className="size-3.5" />}
                            >
                              Gia nhập
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: CONTESTANTS TEAMING VIEW */}
        {/* ================================================================ */}
        {activeTab === 'contestants' && (
          <div className="space-y-6">
            {/* Condition Check 1: Incomplete Profile Warning */}
            {isRequesterIncomplete ? (
              <Card className="p-6 sm:p-8 border-semantic-warning/30 bg-semantic-warning/5 text-center space-y-4">
                <div className="size-12 rounded-full bg-semantic-warning/15 text-semantic-warning flex items-center justify-center mx-auto">
                  <ShieldAlert className="size-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-display text-lg font-semibold text-text-primary">
                    Yêu cầu hoàn thiện hồ sơ cá nhân
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Để đảm bảo tính minh bạch và uy tín khi ghép đội, bạn cần cập nhật đầy đủ các thông tin cá nhân cơ bản (Họ tên, Ngày sinh, SĐT, Email, Trường học, Khoa, Ngành) trước khi xem thông tin các thí sinh khác.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/dashboard">
                    <Button variant="primary" size="md">
                      Đi đến Bảng điều khiển để hoàn thiện hồ sơ
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : contestantsError ? (
              <div className="p-4 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-center gap-2.5">
                <AlertCircle className="size-4 shrink-0" />
                <span>{contestantsError}</span>
              </div>
            ) : (
              <>
                {/* Search Bar & Contestant Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                  <div className="w-full sm:max-w-md">
                    <Input
                      type="text"
                      placeholder="Tìm theo tên, trường, ngành học hoặc từ khóa thành tích..."
                      value={contestantSearchQuery}
                      onChange={(e) => setContestantSearchQuery(e.target.value)}
                      leftIcon={<Search className="size-4" />}
                    />
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs text-text-tertiary font-medium">
                      Hiển thị{' '}
                      <span className="text-brand-gold font-semibold">
                        {filteredContestants.length}
                      </span>{' '}
                      thí sinh đang tìm đồng đội
                    </span>
                    <Link href="/dashboard">
                      <Button variant="ghost" size="sm" className="text-xs text-brand-cyan">
                        Cài đặt công khai của bạn
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Contestants Grid */}
                {contestantsLoading ? (
                  <div className="py-12 text-center text-xs text-text-tertiary flex items-center justify-center gap-2">
                    <Sparkles className="size-4 animate-spin text-brand-gold" />
                    <span>Đang tải danh sách thí sinh...</span>
                  </div>
                ) : filteredContestants.length === 0 ? (
                  <Card className="text-center py-16 space-y-4">
                    <div className="size-14 rounded-full bg-surface-overlay flex items-center justify-center mx-auto text-text-tertiary">
                      <Users className="size-7 opacity-60" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-semibold text-text-primary">
                        {contestantSearchQuery
                          ? 'Không tìm thấy thí sinh phù hợp'
                          : 'Chưa có thí sinh nào công khai hồ sơ tìm đội'}
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {contestantSearchQuery
                          ? 'Hãy thử tìm với từ khóa khác như trường học, chuyên ngành hoặc kỹ năng.'
                          : 'Hãy là người tiên phong! Mở Bảng điều khiển và bật tính năng "Công khai hồ sơ để tìm bạn ghép đội" để các thí sinh khác có thể chủ động liên hệ với bạn.'}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link href="/dashboard">
                        <Button variant="secondary" size="md" leftIcon={<Globe className="size-4 text-brand-cyan" />}>
                          Bật công khai hồ sơ của bạn
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {filteredContestants.map((contestant) => {
                      const isInvited = sentInvites.some(
                        (inv) => inv.invited_uid?.toUpperCase() === (contestant.uid || '').toUpperCase()
                      )

                      return (
                        <div
                          key={contestant.id}
                          onClick={() => setSelectedContestant(contestant)}
                          className="group relative p-3 sm:p-3.5 rounded-xl border border-surface-border bg-surface-raised/70 hover:bg-surface-raised hover:border-brand-cyan/50 hover:shadow-lg hover:shadow-brand-cyan/5 transition-all duration-200 cursor-pointer flex flex-col items-center text-center space-y-2"
                        >
                          {/* Status / Invited Badge */}
                          {isInvited && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Đã mời
                            </span>
                          )}

                          {/* Avatar */}
                          <div className="relative pt-1">
                            <UserAvatar
                              src={contestant.avatar_url}
                              name={contestant.full_name}
                              size="lg"
                              ringBrand
                              className="size-13 sm:size-14 transition-transform duration-200 group-hover:scale-105"
                            />
                            <span
                              className="absolute bottom-0 right-0 size-2.5 rounded-full bg-semantic-success border-2 border-surface-raised"
                              title="Đang tìm đồng đội"
                            />
                          </div>

                          {/* Name & Education */}
                          <div className="w-full space-y-0.5 min-w-0">
                            <h4 className="font-display font-semibold text-xs sm:text-sm text-text-primary group-hover:text-brand-cyan transition-colors truncate">
                              {contestant.full_name || 'Thí sinh GenD'}
                            </h4>

                            <p className="text-[11px] text-text-secondary line-clamp-1 flex items-center justify-center gap-1">
                              <GraduationCap className="size-3 text-brand-cyan shrink-0" />
                              <span className="truncate">{contestant.university || 'Thí sinh tự do'}</span>
                            </p>

                            {(contestant.faculty || contestant.major) && (
                              <p className="text-[10px] text-text-tertiary line-clamp-1 flex items-center justify-center gap-1">
                                <BookOpen className="size-2.5 text-brand-gold shrink-0" />
                                <span className="truncate">
                                  {contestant.major || contestant.faculty}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Action hint footer */}
                          <div className="pt-1.5 w-full border-t border-surface-border/50 flex items-center justify-center">
                            <span className="text-[10px] text-text-tertiary group-hover:text-brand-cyan transition-colors font-medium">
                              Xem chi tiết &rarr;
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.main>

      {/* Team Details Modal (from Tab 1) - Supports Side-by-Side Dual Panel Layout */}
      <Dialog
        open={Boolean(selectedTeamForView)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTeamForView(null)
            setSelectedTeamMember(null)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={`transition-all duration-300 border-none bg-transparent shadow-none p-0 max-h-[92vh] ${
            selectedTeamMember
              ? 'max-w-5xl xl:max-w-6xl'
              : 'max-w-2xl'
          }`}
        >
          {selectedTeamForView && (
            <div
              className={`w-full transition-all duration-300 ${
                selectedTeamMember
                  ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch max-h-[90vh] lg:h-[82vh] lg:max-h-[740px]'
                  : 'max-w-2xl mx-auto'
              }`}
            >
              {/* Left Panel: Team Info */}
              <div
                className={`w-full bg-surface-overlay border border-surface-border rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col transition-all duration-300 ${
                  selectedTeamMember
                    ? 'h-[75vh] sm:h-[80vh] lg:h-full overflow-hidden'
                    : 'max-h-[88vh] space-y-5'
                }`}
              >
                {/* Header: Competition Badge, Member count, Close X, Team Name & Description */}
                <DialogHeader className="space-y-3 text-left shrink-0 pb-3 border-b border-surface-border">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="brand" size="sm">
                        <Trophy className="size-3 mr-1" />
                        {selectedTeamForView.competitions?.title || 'Đấu trường'}
                      </Badge>
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-raised border border-surface-border text-xs font-mono text-brand-cyan">
                        <Users className="size-3" />
                        <span>
                          {selectedTeamForView.members.length}/{selectedTeamForView.max_members} thành viên
                        </span>
                      </div>
                    </div>

                    {/* Close Entire Modal Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeamForView(null)
                        setSelectedTeamMember(null)
                      }}
                      className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition cursor-pointer"
                      title="Đóng cửa sổ"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div>
                    <DialogTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                      {selectedTeamForView.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-1 line-clamp-2">
                      {selectedTeamForView.description || 'Chưa có mô tả chi tiết cho đội thi này.'}
                    </DialogDescription>
                  </div>
                </DialogHeader>

                {/* Scrollable Body: Leader & Members list */}
                <div className={`space-y-4 pr-1.5 ${selectedTeamMember ? 'flex-1 overflow-y-auto py-3' : 'py-2 max-h-[50vh] overflow-y-auto'}`}>
                  {/* Section 1: Team Leader Block */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                        <Crown className="size-3.5 text-brand-cyan" />
                        Trưởng đội thi
                      </h4>
                      {selectedTeamMember && (
                        <span className="text-[11px] text-text-tertiary">
                          Nhấp để xem hồ sơ
                        </span>
                      )}
                    </div>

                    {(() => {
                      const leaderProfile = (selectedTeamForView.leader as any)
                      const isPublic = Boolean(leaderProfile?.is_profile_public)
                      const isSelected = selectedTeamMember?.id === leaderProfile?.id

                      return (
                        <div
                          onClick={() => {
                            if (isPublic && leaderProfile) {
                              setSelectedTeamMember(
                                isSelected ? null : profileToContestant(leaderProfile)
                              )
                            } else {
                              setMessage({
                                text: 'Trưởng nhóm này hiện đang cài đặt hồ sơ ở chế độ riêng tư.',
                                type: 'warning',
                              })
                            }
                          }}
                          className={`p-3 sm:p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-brand-cyan bg-brand-cyan/15 ring-2 ring-brand-cyan/50 shadow-md cursor-pointer'
                              : isPublic
                              ? 'border-brand-cyan/30 bg-brand-cyan/5 hover:bg-brand-cyan/10 hover:border-brand-cyan/60 cursor-pointer shadow-sm group'
                              : 'border-surface-border bg-surface-raised/40 hover:bg-surface-raised/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <UserAvatar
                              src={selectedTeamForView.leader?.avatar_url}
                              name={selectedTeamForView.leader?.full_name}
                              size="md"
                              ringBrand
                            />
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-semibold text-xs sm:text-sm transition-colors truncate ${
                                    isSelected
                                      ? 'text-brand-cyan font-bold'
                                      : isPublic
                                      ? 'text-text-primary group-hover:text-brand-cyan'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  {selectedTeamForView.leader?.full_name || 'Vô danh'}
                                </span>
                                <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                                  Trưởng nhóm
                                </Badge>
                                {isPublic ? (
                                  <span className={`inline-flex items-center gap-1 text-[10px] border px-1.5 py-0.5 rounded font-medium ${
                                    isSelected
                                      ? 'bg-brand-cyan text-brand-dark border-brand-cyan font-bold'
                                      : 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/30'
                                  }`}>
                                    <Eye className="size-2.5" />
                                    <span>{isSelected ? 'Đang xem' : 'Xem hồ sơ'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-text-tertiary bg-surface-overlay border border-surface-border px-1.5 py-0.5 rounded">
                                    <Lock className="size-2.5" />
                                    <span>Riêng tư</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-text-secondary truncate">
                                {selectedTeamForView.leader?.university || 'Chưa cập nhật trường học'}
                              </p>
                            </div>
                          </div>

                          {isPublic && (
                            <div className="shrink-0 hidden sm:flex items-center text-xs text-brand-cyan font-medium gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <span>{isSelected ? 'Đang xem' : 'Chi tiết'}</span>
                              <ExternalLink className="size-3" />
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Section 2: Current Team Members List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                        <Users className="size-3.5 text-text-tertiary" />
                        Danh sách thành viên ({selectedTeamForView.members.length})
                      </h4>
                      <span className="text-xs text-text-tertiary font-mono">
                        Còn trống{' '}
                        {Math.max(
                          0,
                          selectedTeamForView.max_members - selectedTeamForView.members.length
                        )}{' '}
                        vị trí
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
                          const memberProfile = (member.profile || (isLeader ? selectedTeamForView.leader : null)) as any
                          const memberName =
                            memberProfile?.full_name ||
                            (isLeader ? selectedTeamForView.leader?.full_name : null) ||
                            `Thành viên ${index + 1}`
                          const memberAvatar =
                            memberProfile?.avatar_url ||
                            (isLeader ? selectedTeamForView.leader?.avatar_url : null)

                          const isPublic = Boolean(memberProfile?.is_profile_public)
                          const isSelected = selectedTeamMember?.id === member.user_id

                          return (
                            <div
                              key={member.id || member.user_id || index}
                              onClick={() => {
                                if (isPublic && memberProfile) {
                                  setSelectedTeamMember(
                                    isSelected ? null : profileToContestant(memberProfile)
                                  )
                                } else {
                                  setMessage({
                                    text: 'Thành viên này hiện đang cài đặt hồ sơ ở chế độ riêng tư.',
                                    type: 'warning',
                                  })
                                }
                              }}
                              className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition ${
                                isSelected
                                  ? 'bg-brand-cyan/15 ring-2 ring-inset ring-brand-cyan/60 cursor-pointer'
                                  : isPublic
                                  ? 'hover:bg-surface-raised/90 cursor-pointer group'
                                  : 'hover:bg-surface-raised/50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <UserAvatar
                                  src={memberAvatar}
                                  name={memberName}
                                  size="md"
                                  ringBrand={isLeader}
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-xs sm:text-sm font-medium truncate transition-colors ${
                                        isSelected
                                          ? 'text-brand-cyan font-bold'
                                          : isPublic
                                          ? 'text-text-primary group-hover:text-brand-cyan'
                                          : 'text-text-primary'
                                      }`}
                                    >
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
                                    {isPublic ? (
                                      <span className={`inline-flex items-center gap-1 text-[10px] border px-1.5 py-0.5 rounded font-medium ${
                                        isSelected
                                          ? 'bg-brand-cyan text-brand-dark border-brand-cyan font-bold'
                                          : 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/30'
                                      }`}>
                                        <Eye className="size-2.5" />
                                        <span>{isSelected ? 'Đang xem' : 'Xem hồ sơ'}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-text-tertiary bg-surface-overlay border border-surface-border px-1.5 py-0.5 rounded">
                                        <Lock className="size-2.5" />
                                        <span>Riêng tư</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-text-secondary truncate">
                                    {memberProfile?.university ||
                                      (isLeader ? selectedTeamForView.leader?.university : null) ||
                                      'Chưa cập nhật trường học'}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isPublic && (
                                  <span className={`text-[11px] font-medium hidden sm:inline ${
                                    isSelected
                                      ? 'text-brand-cyan'
                                      : 'text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity'
                                  }`}>
                                    {isSelected ? 'Đang xem' : 'Chi tiết →'}
                                  </span>
                                )}
                                {member.joined_at && (
                                  <div className="text-[10px] text-text-disabled hidden sm:flex items-center gap-1 font-mono">
                                    <Clock className="size-3" />
                                    <span>{new Date(member.joined_at).toLocaleDateString('vi-VN')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Modal Footer Actions */}
                <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-surface-border shrink-0">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setSelectedTeamForView(null)
                      setSelectedTeamMember(null)
                    }}
                    className="w-full sm:w-auto text-xs"
                  >
                    Đóng
                  </Button>

                  <div className="w-full sm:w-auto">
                    {userHasTeam ? (
                      selectedTeamForView.members?.some((m) => m.user_id === user?.id) ||
                      selectedTeamForView.leader_id === user?.id ? (
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
              </div>

              {/* Right Panel: Selected Member Details (Displays side-by-side, perfectly balanced) */}
              {selectedTeamMember && (
                <div className="w-full bg-surface-overlay border border-brand-cyan/40 shadow-2xl rounded-2xl p-5 sm:p-6 flex flex-col h-[75vh] sm:h-[80vh] lg:h-full overflow-hidden animate-in fade-in-0 slide-in-from-right-4 duration-300">
                  {/* Member Panel Header */}
                  <div className="shrink-0 pb-3 border-b border-surface-border space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-brand-cyan font-medium">
                        <span className="size-2 rounded-full bg-brand-cyan animate-pulse" />
                        <span>Hồ sơ thành viên đội {selectedTeamForView.name}</span>
                      </div>

                      {/* Close Right Panel Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTeamMember(null)}
                        className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition cursor-pointer"
                        title="Đóng xem thành viên (quay lại xem nhóm)"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Member Profile Main Row */}
                    <div className="flex items-start gap-3.5">
                      <UserAvatar
                        src={selectedTeamMember.avatar_url}
                        name={selectedTeamMember.full_name}
                        size="xl"
                        ringBrand={selectedTeamForView.leader_id === selectedTeamMember.id}
                        className="size-14 sm:size-16 shrink-0"
                      />
                      <div className="min-w-0 space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-base sm:text-lg font-bold text-text-primary truncate">
                            {selectedTeamMember.full_name || 'Thí sinh GenD'}
                          </h3>
                          <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                            {selectedTeamForView.leader_id === selectedTeamMember.id
                              ? 'Trưởng nhóm'
                              : 'Thành viên'}
                          </Badge>
                        </div>

                        {selectedTeamMember.uid && (
                          <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono">
                            <span>Mã UID:</span>
                            <span className="font-bold text-brand-cyan">{selectedTeamMember.uid}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedTeamMember.uid!, 'modal_uid')}
                              className="hover:text-text-primary p-0.5 cursor-pointer transition"
                              title="Sao chép UID"
                            >
                              {copiedKey === 'modal_uid' ? (
                                <Check className="size-3 text-semantic-success" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Member Content */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1.5 custom-scrollbar">
                    {/* Education Info */}
                    <div className="p-3.5 rounded-xl bg-surface-raised/80 border border-surface-border space-y-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                        <School className="size-3.5 text-brand-cyan" />
                        Thông tin đào tạo
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-start gap-2 text-text-secondary">
                          <GraduationCap className="size-3.5 text-brand-cyan shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-text-tertiary mr-1.5">Trường:</span>
                            <span className="text-text-primary font-medium">
                              {selectedTeamMember.university || 'Chưa cập nhật'}
                            </span>
                          </div>
                        </div>
                        {(selectedTeamMember.faculty || selectedTeamMember.major) && (
                          <div className="flex items-start gap-2 text-text-secondary">
                            <BookOpen className="size-3.5 text-brand-gold shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 leading-relaxed">
                              <span className="text-text-tertiary mr-1.5">Chuyên ngành:</span>
                              <span className="text-text-primary">
                                {[selectedTeamMember.faculty, selectedTeamMember.major].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Achievements Info */}
                    {selectedTeamMember.achievements && (
                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                          <Trophy className="size-3.5 text-brand-gold" />
                          Thành tích &amp; Kỹ năng
                        </h4>
                        <div className="p-3 rounded-xl bg-surface-raised/60 border border-surface-border text-xs text-text-secondary leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {selectedTeamMember.achievements}
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                        <Phone className="size-3.5 text-brand-cyan" />
                        Thông tin liên hệ
                      </h4>

                      {selectedTeamMember.phone || selectedTeamMember.facebook_url || selectedTeamMember.email ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedTeamMember.phone && (
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedTeamMember.phone!, 'modal_phone')}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                                copiedKey === 'modal_phone'
                                  ? 'bg-semantic-success/15 border-semantic-success/40 text-semantic-success'
                                  : 'bg-surface-raised border-surface-border text-text-primary hover:border-brand-cyan/50'
                              }`}
                              title="Sao chép số điện thoại"
                            >
                              {copiedKey === 'modal_phone' ? (
                                <>
                                  <Check className="size-3.5 text-semantic-success" />
                                  <span>Đã chép số</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="size-3.5 text-brand-cyan" />
                                  <span>{selectedTeamMember.phone}</span>
                                  <Copy className="size-3 opacity-60 ml-0.5" />
                                </>
                              )}
                            </button>
                          )}

                          {selectedTeamMember.facebook_url && (
                            <a
                              href={selectedTeamMember.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan text-xs font-medium flex items-center gap-1.5 transition"
                            >
                              <MessageCircle className="size-3.5" />
                              <span>Facebook Profile</span>
                              <ExternalLink className="size-3 opacity-60 ml-0.5" />
                            </a>
                          )}

                          {selectedTeamMember.email && (
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedTeamMember.email!, 'modal_email')}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                                copiedKey === 'modal_email'
                                  ? 'bg-semantic-success/15 border-semantic-success/40 text-semantic-success'
                                  : 'bg-surface-raised border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border/80'
                              }`}
                              title="Sao chép Email"
                            >
                              {copiedKey === 'modal_email' ? (
                                <>
                                  <Check className="size-3.5 text-semantic-success" />
                                  <span>Đã chép Email</span>
                                </>
                              ) : (
                                <>
                                  <Mail className="size-3.5 text-text-tertiary" />
                                  <span>{selectedTeamMember.email}</span>
                                  <Copy className="size-3 opacity-60 ml-0.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-text-disabled italic p-2 rounded-lg bg-surface-raised/40 border border-surface-border/50">
                          Thành viên này hiện không công khai thông tin liên hệ trực tiếp.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Member Panel Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-surface-border shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedTeamMember(null)}
                      className="text-xs px-3"
                    >
                      ← Thu gọn hồ sơ
                    </Button>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/25 font-medium">
                      Hồ sơ công khai
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contestant Details Modal (from Tab 2) */}
      <Dialog
        open={Boolean(selectedContestant)}
        onOpenChange={(open) => {
          if (!open) setSelectedContestant(null)
        }}
      >
        <DialogContent size="lg" className="max-w-lg p-6 space-y-4">
          {selectedContestant && (
            <>
              {/* Header: Avatar, Name, UID, Status */}
              <DialogHeader className="space-y-3 text-left">
                {(() => {
                  const isViewingTeamMember = Boolean(
                    selectedTeamForView &&
                      (selectedTeamForView.leader_id === selectedContestant.id ||
                        selectedTeamForView.members.some((m) => m.user_id === selectedContestant.id))
                  )
                  const isTeamLeader = selectedTeamForView?.leader_id === selectedContestant.id

                  return (
                    <div className="flex items-start gap-3.5">
                      <UserAvatar
                        src={selectedContestant.avatar_url}
                        name={selectedContestant.full_name}
                        size="xl"
                        ringBrand={isTeamLeader}
                        className="size-16 shrink-0"
                      />
                      <div className="min-w-0 space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <DialogTitle className="font-display text-lg sm:text-xl font-bold text-text-primary truncate">
                            {selectedContestant.full_name || 'Thí sinh GenD'}
                          </DialogTitle>
                          {isViewingTeamMember ? (
                            <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                              {isTeamLeader ? 'Trưởng nhóm' : 'Thành viên'}
                            </Badge>
                          ) : (
                            <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                              Tự do
                            </Badge>
                          )}
                        </div>

                        {selectedContestant.uid && (
                          <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono">
                            <span>Mã UID:</span>
                            <span className="font-bold text-brand-cyan">{selectedContestant.uid}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedContestant.uid!, 'modal_uid')}
                              className="hover:text-text-primary p-0.5 cursor-pointer transition"
                              title="Sao chép UID"
                            >
                              {copiedKey === 'modal_uid' ? (
                                <Check className="size-3 text-semantic-success" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[11px] font-medium">
                          {isViewingTeamMember ? (
                            <>
                              <span className="size-2 rounded-full bg-brand-cyan" />
                              <span className="text-text-secondary truncate">
                                Thành viên đội {selectedTeamForView?.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="size-2 rounded-full bg-semantic-success animate-pulse" />
                              <span className="text-semantic-success">Đang mở hồ sơ tìm đồng đội</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </DialogHeader>

              {/* Education Information */}
              <div className="p-3.5 rounded-xl bg-surface-overlay/80 border border-surface-border space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                  <School className="size-3.5 text-brand-cyan" />
                  Thông tin đào tạo
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-text-secondary">
                    <GraduationCap className="size-3.5 text-brand-cyan shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-text-tertiary mr-1.5">Trường:</span>
                      <span className="text-text-primary font-medium">{selectedContestant.university || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  {(selectedContestant.faculty || selectedContestant.major) && (
                    <div className="flex items-start gap-2 text-text-secondary">
                      <BookOpen className="size-3.5 text-brand-gold shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 leading-relaxed">
                        <span className="text-text-tertiary mr-1.5">Chuyên ngành:</span>
                        <span className="text-text-primary">
                          {[selectedContestant.faculty, selectedContestant.major].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Achievements / Skills Bio */}
              {selectedContestant.achievements && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                    <Trophy className="size-3.5 text-brand-gold" />
                    Thành tích &amp; Kỹ năng
                  </h4>
                  <div className="p-3 rounded-xl bg-surface-overlay/60 border border-surface-border text-xs text-text-secondary leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {selectedContestant.achievements}
                  </div>
                </div>
              )}

              {/* Contact info section */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                  <Phone className="size-3.5 text-brand-cyan" />
                  Thông tin liên hệ
                </h4>

                {selectedContestant.phone || selectedContestant.facebook_url || selectedContestant.email ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedContestant.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedContestant.phone!, 'modal_phone')}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                          copiedKey === 'modal_phone'
                            ? 'bg-semantic-success/15 border-semantic-success/40 text-semantic-success'
                            : 'bg-surface-overlay border-surface-border text-text-primary hover:border-brand-cyan/50'
                        }`}
                        title="Sao chép số điện thoại"
                      >
                        {copiedKey === 'modal_phone' ? (
                          <>
                            <Check className="size-3.5 text-semantic-success" />
                            <span>Đã chép số</span>
                          </>
                        ) : (
                          <>
                            <Phone className="size-3.5 text-brand-cyan" />
                            <span>{selectedContestant.phone}</span>
                            <Copy className="size-3 opacity-60 ml-0.5" />
                          </>
                        )}
                      </button>
                    )}

                    {selectedContestant.facebook_url && (
                      <a
                        href={selectedContestant.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <MessageCircle className="size-3.5" />
                        <span>Facebook Profile</span>
                        <ExternalLink className="size-3 opacity-60 ml-0.5" />
                      </a>
                    )}

                    {selectedContestant.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedContestant.email!, 'modal_email')}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                          copiedKey === 'modal_email'
                            ? 'bg-semantic-success/15 border-semantic-success/40 text-semantic-success'
                            : 'bg-surface-overlay border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border/80'
                        }`}
                        title="Sao chép Email"
                      >
                        {copiedKey === 'modal_email' ? (
                          <>
                            <Check className="size-3.5 text-semantic-success" />
                            <span>Đã chép Email</span>
                          </>
                        ) : (
                          <>
                            <Mail className="size-3.5 text-text-tertiary" />
                            <span>{selectedContestant.email}</span>
                            <Copy className="size-3 opacity-60 ml-0.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-disabled italic p-2 rounded-lg bg-surface-overlay/40 border border-surface-border/50">
                    Thí sinh này hiện không công khai số điện thoại, email hay facebook.
                  </p>
                )}
              </div>

              {/* Modal Footer */}
              <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-surface-border">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setSelectedContestant(null)}
                  className="text-xs px-4"
                >
                  Đóng
                </Button>

                {(() => {
                  const isViewingTeamMember = Boolean(
                    selectedTeamForView &&
                      (selectedTeamForView.leader_id === selectedContestant.id ||
                        selectedTeamForView.members.some((m) => m.user_id === selectedContestant.id))
                  )

                  if (isViewingTeamMember) {
                    return (
                      <span className="text-xs px-3 py-1.5 rounded-lg bg-surface-overlay text-text-secondary border border-surface-border font-medium">
                        Thành viên đội thi
                      </span>
                    )
                  }

                  if (!leaderTeam) return null

                  const isInvited = sentInvites.some(
                    (inv) =>
                      inv.invited_uid?.toUpperCase() ===
                      (selectedContestant.uid || '').toUpperCase()
                  )
                  const matchingInvite = sentInvites.find(
                    (inv) =>
                      inv.invited_uid?.toUpperCase() ===
                      (selectedContestant.uid || '').toUpperCase()
                  )

                  if (isInvited) {
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium shrink-0">
                          Đã gửi lời mời
                        </span>
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={
                            inviteActionLoading === selectedContestant.id ||
                            inviteActionLoading === selectedContestant.uid
                          }
                          isLoading={
                            inviteActionLoading === selectedContestant.id ||
                            inviteActionLoading === selectedContestant.uid
                          }
                          onClick={() =>
                            handleCancelInviteByUid(
                              selectedContestant.uid!,
                              matchingInvite?.id
                            )
                          }
                          className="text-xs text-semantic-danger hover:bg-semantic-danger/10 border-semantic-danger/30"
                        >
                          Thu hồi
                        </Button>
                      </div>
                    )
                  }

                  return (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={
                        leaderTeam.member_count >= leaderTeam.max_members ||
                        inviteActionLoading === selectedContestant.id
                      }
                      isLoading={inviteActionLoading === selectedContestant.id}
                      onClick={() => handleInviteContestant(selectedContestant)}
                      className="text-xs px-5 shadow-sm"
                      leftIcon={<Plus className="size-4" />}
                    >
                      Mời vào đội
                    </Button>
                  )
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BrowseTeamsPage() {
  return (
    <Suspense fallback={<Loading variant="browse" text="Đang tải danh sách đội thi & thí sinh..." />}>
      <BrowseTeamsContent />
    </Suspense>
  )
}
