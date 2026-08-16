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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Users,
  ClipboardPen,
  LogOut,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  Mail,
  Clock,
  Inbox,
  MessageSquare,
  Shield,
  Phone,
  Building2,
  ExternalLink,
  User as UserIcon,
  Radio,
  Trophy,
} from 'lucide-react'

type TeamMember = {
  user_id: string
  role: string
  joined_at: string
  profiles?: {
    full_name: string | null
    email: string | null
    phone: string | null
    organization: string | null
    avatar_url: string | null
    facebook_url: string | null
  } | null
}

type Team = {
  id: string
  name: string
  description: string | null
  max_members: number
  is_open: boolean
  leader_id: string
  competition_id: string
  competitions?: {
    title: string
  } | null
}

type JoinRequest = {
  id: string
  requester_id: string
  message: string | null
  status: string
  created_at: string
  profiles?: {
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
}

type Invite = {
  id: string
  invited_uid: string
  status: string
  created_at: string
}

type MemberDuplicate = {
  user_id: string
  full_name: string | null
}

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isLeader, setIsLeader] = useState(false)
  const [dupeMembers, setDupeMembers] = useState<MemberDuplicate[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  // Invite by UID form
  const [inviteUid, setInviteUid] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  const fetchJoinRequests = async (teamId: string) => {
    // Step 1: fetch pending join requests (no profile join to avoid FK cache issues)
    const { data: requests, error } = await supabase
      .from('team_join_requests')
      .select('id, requester_id, message, status, created_at')
      .eq('team_id', teamId)
      .eq('status', 'pending')

    if (error) {
      console.error('Fetch join requests error:', error)
      setErrorMessage(`Lỗi truy vấn yêu cầu gia nhập: ${error.message}`)
      return
    }

    if (!requests || requests.length === 0) {
      setJoinRequests([])
      return
    }

    // Step 2: fetch profiles for requesters separately
    const requesterIds = requests.map((r) => r.requester_id)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', requesterIds)

    if (profilesError) {
      console.error('Fetch requester profiles error:', profilesError)
    }

    // Step 3: merge profiles into requests
    const profileMap: Record<
      string,
      { full_name: string | null; email: string | null; phone: string | null }
    > = {}
    profilesData?.forEach((p) => {
      profileMap[p.id] = { full_name: p.full_name, email: p.email, phone: p.phone }
    })

    const merged = requests.map((r) => ({
      ...r,
      profiles: profileMap[r.requester_id] ?? null,
    }))

    setJoinRequests(merged as unknown as JoinRequest[])
  }

  const fetchMembers = async (teamId: string) => {
    // Step 1: fetch team members without profile join
    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId)

    if (membersError) {
      console.error('Fetch members error:', membersError)
      setErrorMessage(
        `Lỗi tải danh sách thành viên: ${membersError.message} (code: ${membersError.code})`
      )
      return
    }

    if (!membersData || membersData.length === 0) {
      setMembers([])
      return
    }

    // Step 2: fetch profiles for those members separately
    const userIds = membersData.map((m) => m.user_id)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, organization, avatar_url, facebook_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Fetch member profiles error:', profilesError)
    }

    // Step 3: merge profiles into member records
    const profileMap: Record<
      string,
      {
        full_name: string | null
        email: string | null
        phone: string | null
        organization: string | null
        avatar_url: string | null
        facebook_url: string | null
      }
    > = {}
    profilesData?.forEach((p) => {
      profileMap[p.id] = {
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        organization: p.organization,
        avatar_url: ((p as Record<string, unknown>).avatar_url as string | null) ?? null,
        facebook_url: ((p as Record<string, unknown>).facebook_url as string | null) ?? null,
      }
    })

    const merged = membersData.map((m) => ({
      ...m,
      profiles: profileMap[m.user_id] ?? null,
    }))

    setMembers(merged as unknown as TeamMember[])

    // Check for duplicate memberships among roster members
    if (merged.length > 0) {
      const userIds = merged.map((m) => m.user_id)
      const { data: dupCheck } = await supabase
        .from('team_members')
        .select('user_id')
        .in('user_id', userIds)

      // Group by user_id and find any appearing more than once
      const countMap: Record<string, number> = {}
      dupCheck?.forEach((r) => {
        countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1
      })
      const dupeIds = Object.keys(countMap).filter((uid) => countMap[uid] > 1)

      if (dupeIds.length > 0) {
        setDupeMembers(
          merged
            .filter((m) => dupeIds.includes(m.user_id))
            .map((m) => ({ user_id: m.user_id, full_name: m.profiles?.full_name ?? null }))
        )
      } else {
        setDupeMembers([])
      }
    }
  }

  const loadTeamData = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // Check member record
    const { data: memberRecord } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!memberRecord) {
      // User has no team, send them back to personal dashboard
      router.push('/dashboard')
      return
    }

    setIsLeader(memberRecord.role === 'leader')

    // Fetch team details
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select(
        'id, name, description, max_members, is_open, leader_id, competition_id, competitions(title)'
      )
      .eq('id', memberRecord.team_id)
      .single()

    if (teamError || !teamData) {
      console.error('Fetch team details error:', teamError)
      router.push('/dashboard')
      return
    }

    setTeam(teamData as unknown as Team)

    // Fetch all members
    await fetchMembers(memberRecord.team_id)

    // If leader, fetch requests & invites
    if (memberRecord.role === 'leader') {
      await fetchJoinRequests(memberRecord.team_id)

      const { data: teamInvites, error: invitesError } = await supabase
        .from('team_invites')
        .select('id, invited_uid, status, created_at')
        .eq('team_id', memberRecord.team_id)
        .eq('status', 'pending')

      if (invitesError) {
        console.error('Fetch invites error:', invitesError)
      }

      if (teamInvites) {
        setInvites(teamInvites as unknown as Invite[])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTeamData()
  }, [router, supabase])

  // Realtime subscription for team join requests
  useEffect(() => {
    if (!team || !isLeader) return

    const channel = supabase
      .channel('team-join-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_join_requests',
          filter: `team_id=eq.${team.id}`,
        },
        () => {
          fetchJoinRequests(team.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team?.id, isLeader, supabase])

  // Handle invitation submission
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team || !inviteUid.trim() || !user) return

    setInviteLoading(true)
    setInviteMessage('')

    const formattedUid = inviteUid.trim().toUpperCase()

    // 1. Check if user with this UID exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('uid', formattedUid)
      .maybeSingle()

    if (profileError || !profile) {
      setInviteMessage('Không tìm thấy đấu thủ với UID này.')
      setInviteLoading(false)
      return
    }

    // 2. Check if user is already in a team
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (memberCheck) {
      setInviteMessage('Đấu thủ này đã tham gia một liên minh khác.')
      setInviteLoading(false)
      return
    }

    // 3. Send invite
    const { error: inviteError } = await supabase.from('team_invites').insert({
      team_id: team.id,
      invited_uid: formattedUid,
      invited_by: user.id,
      status: 'pending',
    })

    if (inviteError) {
      console.error('Invite error:', inviteError)
      setInviteMessage(`Lỗi: ${inviteError.message}`)
    } else {
      setInviteMessage('Gửi lời mời thành công!')
      setInviteUid('')
      // Reload invites list
      const { data: teamInvites } = await supabase
        .from('team_invites')
        .select('id, invited_uid, status, created_at')
        .eq('team_id', team.id)
        .eq('status', 'pending')

      if (teamInvites) {
        setInvites(teamInvites as unknown as Invite[])
      }
    }
    setInviteLoading(false)
  }

  // Handle join request actions
  const handleRequestAction = async (
    requestId: string,
    requesterId: string,
    action: 'accept' | 'reject'
  ) => {
    if (!team || !user) return
    setActionLoading(requestId)
    setErrorMessage('')

    if (action === 'accept') {
      // Check if team is already full
      if (members.length >= team.max_members) {
        setErrorMessage('Liên minh đã đạt giới hạn số lượng thành viên tối đa.')
        setActionLoading(null)
        return
      }

      // Add to team_members
      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: requesterId,
        role: 'member',
      })

      if (memberError) {
        console.error('Accept add member error:', memberError)
        setErrorMessage(`Lỗi thêm thành viên: ${memberError.message} — Code: ${memberError.code}`)
        setActionLoading(null)
        return
      }

      // Update request status to accepted
      const { error: acceptErr } = await supabase
        .from('team_join_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', requestId)

      if (acceptErr) {
        console.error('Accept update request error:', acceptErr)
      }
    } else {
      // Reject — update status
      const { error: rejectErr } = await supabase
        .from('team_join_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', requestId)

      if (rejectErr) {
        console.error('Reject update request error:', rejectErr)
      }
    }

    // Targeted re-fetch
    await Promise.all([fetchMembers(team.id), fetchJoinRequests(team.id)])
    setActionLoading(null)
  }

  // Handle leaving team
  const handleLeaveTeam = async () => {
    if (!team || !user) return
    if (isLeader) {
      setErrorMessage(
        'Chỉ huy (Leader) không thể rời đội. Vui lòng giải tán đội hoặc chuyển quyền trước.'
      )
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', team.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Leave team error:', error)
      setErrorMessage(`Rời đội thất bại: ${error.message}`)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (loading) return <Loading text="Đang tải dữ liệu đội thi..." />
  if (!team) {
    return (
      <div className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-xl bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger text-center space-y-4 shadow-elevation-2">
          <div className="flex justify-center">
            <AlertCircle className="size-10 text-semantic-danger" />
          </div>
          <p className="text-sm font-medium">Không thể tải thông tin đội. Vui lòng thử lại.</p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button variant="secondary" size="md">
                Quay lại Bảng điều khiển
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Badge variant="brand" size="sm">
                  {team.competitions?.title || 'GenD Arena 2026'}
                </Badge>
                <Badge variant={team.is_open ? 'success' : 'default'} size="sm">
                  {team.is_open ? 'Đang mở tuyển' : 'Đã đóng tuyển'}
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                Đội thi: <span className="text-brand-cyan">{team.name}</span>
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Không gian quản lý thành viên, xét duyệt đơn gia nhập và điều hướng nộp đề án
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link href="/submissions">
                <Button variant="primary" size="md" leftIcon={<ClipboardPen className="size-4" />}>
                  Nộp bài dự thi
                </Button>
              </Link>
              {!isLeader && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setShowLeaveDialog(true)}
                  leftIcon={<LogOut className="size-4" />}
                  className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger"
                >
                  Rời đội
                </Button>
              )}
            </div>
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
        {errorMessage && (
          <div className="p-4 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-sm text-semantic-danger flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-semantic-danger" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Duplicate Member Warning Banner (Leader only) */}
        {isLeader && dupeMembers.length > 0 && (
          <Card className="bg-semantic-warning/10 border-semantic-warning/40 p-5 shadow-elevation-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-semantic-warning shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-base font-semibold text-semantic-warning">
                  Cảnh báo: Thành viên thuộc nhiều đội
                </h2>
                <p className="text-text-secondary text-xs mt-1 mb-3 leading-relaxed">
                  Các thành viên sau đang xuất hiện trong nhiều đội cùng lúc. Hãy yêu cầu họ vào trang cá nhân để chọn giữ lại 1 đội duy nhất:
                </p>
                <ul className="space-y-1">
                  {dupeMembers.map((dm) => (
                    <li key={dm.user_id} className="text-xs text-semantic-warning font-medium">
                      • {dm.full_name ?? dm.user_id}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Team Details & Members */}
          <div className="lg:col-span-8 space-y-6">
            {/* Team info */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-border">
                <ClipboardList className="size-4 text-brand-cyan" />
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Thông tin chiến đội
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-text-tertiary font-medium block mb-1">
                    Đấu trường tham gia:
                  </span>
                  <span className="text-text-primary font-semibold text-sm">
                    {team.competitions?.title || 'Đang cập nhật...'}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-text-tertiary font-medium block mb-1">
                    Mô tả liên minh:
                  </span>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {team.description || 'Chưa có mô tả chi tiết cho đội hình này.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-surface-border">
                  <div>
                    <span className="text-xs text-text-tertiary font-medium block">
                      Sức chứa tối đa:
                    </span>
                    <span className="text-text-primary font-semibold text-sm">
                      {team.max_members} thành viên
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-text-tertiary font-medium block">
                      Trạng thái tuyển:
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        team.is_open ? 'text-semantic-success' : 'text-semantic-danger'
                      }`}
                    >
                      {team.is_open ? 'Đang mở tuyển quân' : 'Đã đóng tuyển'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Members List */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-brand-cyan" />
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                    Danh sách thành viên ({members.length} / {team.max_members})
                  </h2>
                </div>
                <span className="text-xs text-text-tertiary">Click xem chi tiết</span>
              </div>

              <div className="space-y-3">
                {members.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-surface-overlay border border-surface-border rounded-xl gap-3 text-left hover:border-brand-cyan/40 hover:bg-surface-raised transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 size-10 rounded-full border border-surface-border bg-surface-base overflow-hidden flex items-center justify-center">
                        {member.profiles?.avatar_url ? (
                          <img
                            src={member.profiles.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <UserIcon className="size-5 text-text-tertiary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-primary text-sm group-hover:text-brand-cyan transition">
                            {member.profiles?.full_name || 'Vô danh'}
                          </span>
                          <Badge
                            variant={member.role === 'leader' ? 'brand' : 'default'}
                            size="sm"
                          >
                            {member.role === 'leader' ? 'Chỉ huy' : 'Thành viên'}
                          </Badge>
                        </div>
                        <div className="text-text-tertiary text-xs mt-0.5 truncate max-w-xs">
                          {member.profiles?.organization || member.profiles?.email || ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-text-tertiary font-mono shrink-0">
                      Gia nhập: {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Leader Controls (Invites & Requests) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Invite by UID Form */}
            {isLeader && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-border">
                  <Mail className="size-4 text-brand-cyan" />
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                    Mời thành viên bằng UID
                  </h2>
                </div>

                {inviteMessage && (
                  <div className="text-xs font-medium p-3 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan mb-4">
                    {inviteMessage}
                  </div>
                )}

                <form onSubmit={handleSendInvite} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-secondary">
                      Mã UID đấu thủ (8 ký tự)
                    </label>
                    <Input
                      type="text"
                      required
                      value={inviteUid}
                      onChange={(e) => setInviteUid(e.target.value)}
                      placeholder="VD: A1B2C3D4"
                      maxLength={8}
                      className="font-mono uppercase text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={inviteLoading}
                    className="w-full"
                  >
                    Gửi lời mời
                  </Button>
                </form>

                {/* Active invites pending */}
                {invites.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-surface-border">
                    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider block mb-3">
                      Lời mời đang chờ:
                    </span>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {invites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex justify-between items-center bg-surface-overlay border border-surface-border p-2.5 rounded-lg text-xs"
                        >
                          <span className="font-mono text-brand-cyan uppercase font-semibold">
                            {inv.invited_uid}
                          </span>
                          <span className="text-text-tertiary text-xs flex items-center gap-1">
                            <Clock className="size-3 text-text-tertiary" />
                            <span>Đang chờ</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Join Requests Pending */}
            {isLeader && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <Inbox className="size-4 text-brand-cyan" />
                    <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                      Yêu cầu gia nhập
                    </h2>
                  </div>
                  {joinRequests.length > 0 && (
                    <Badge variant="danger" size="sm">
                      {joinRequests.length} đơn mới
                    </Badge>
                  )}
                </div>

                {joinRequests.length === 0 ? (
                  <p className="text-text-tertiary text-xs text-center py-6">
                    Chưa có yêu cầu gia nhập nào.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-surface-overlay border border-surface-border p-3.5 rounded-xl space-y-3"
                      >
                        <div>
                          <div className="font-semibold text-text-primary text-xs">
                            {req.profiles?.full_name || 'Vô danh'}
                          </div>
                          <div className="text-[11px] text-text-tertiary mt-0.5">
                            Email: {req.profiles?.email || 'N/A'}
                          </div>
                          {req.message && (
                            <p className="text-text-secondary text-xs leading-relaxed mt-2 bg-surface-base p-2 rounded border border-surface-border flex items-start gap-1.5">
                              <MessageSquare className="size-3.5 text-brand-cyan shrink-0 mt-0.5" />
                              <span>{req.message}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleRequestAction(req.id, req.requester_id, 'accept')}
                            isLoading={actionLoading === req.id}
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRequestAction(req.id, req.requester_id, 'reject')}
                            disabled={actionLoading === req.id}
                          >
                            Từ chối
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Status overview for members */}
            {!isLeader && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="size-4 text-brand-cyan" />
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                    Quyền hạn liên minh
                  </h2>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Bạn đang ở vai trò <span className="text-text-primary font-semibold">Thành viên</span>. Chỉ có Trưởng đội (Leader) mới có quyền gửi lời mời hoặc duyệt đơn xin gia nhập liên minh.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Member Detail Modal Dialog */}
        <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Thông tin thành viên</DialogTitle>
              <DialogDescription>Hồ sơ công khai trong liên minh thi đấu</DialogDescription>
            </DialogHeader>

            {selectedMember && (
              <div className="space-y-5 pt-2">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 size-16 rounded-full border border-surface-border bg-surface-overlay overflow-hidden flex items-center justify-center shadow-elevation-1">
                    {selectedMember.profiles?.avatar_url ? (
                      <img
                        src={selectedMember.profiles.avatar_url}
                        alt="Avatar"
                        className="size-full object-cover"
                      />
                    ) : (
                      <UserIcon className="size-8 text-text-tertiary" />
                    )}
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-text-primary">
                      {selectedMember.profiles?.full_name || <span className="italic text-text-tertiary">Vô danh</span>}
                    </p>
                    <Badge
                      variant={selectedMember.role === 'leader' ? 'brand' : 'default'}
                      size="sm"
                      className="mt-1"
                    >
                      {selectedMember.role === 'leader' ? 'Chỉ huy (Leader)' : 'Thành viên (Member)'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 border-t border-surface-border pt-4 text-sm">
                  {selectedMember.profiles?.organization && (
                    <div className="flex items-start gap-2.5 text-text-secondary">
                      <Building2 className="size-4 text-text-tertiary shrink-0 mt-0.5" />
                      <span>{selectedMember.profiles.organization}</span>
                    </div>
                  )}
                  {selectedMember.profiles?.email && (
                    <div className="flex items-start gap-2.5 text-text-secondary">
                      <Mail className="size-4 text-text-tertiary shrink-0 mt-0.5" />
                      <span className="break-all">{selectedMember.profiles.email}</span>
                    </div>
                  )}
                  {selectedMember.profiles?.phone && (
                    <div className="flex items-start gap-2.5 text-text-secondary">
                      <Phone className="size-4 text-text-tertiary shrink-0 mt-0.5" />
                      <span>{selectedMember.profiles.phone}</span>
                    </div>
                  )}
                  {selectedMember.profiles?.facebook_url && (
                    <div className="flex items-start gap-2.5">
                      <ExternalLink className="size-4 text-text-tertiary shrink-0 mt-0.5" />
                      <a
                        href={selectedMember.profiles.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-cyan hover:underline break-all text-xs"
                      >
                        Xem trang Facebook →
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-text-tertiary pt-2 border-t border-surface-border font-mono">
                    <Clock className="size-3.5" />
                    <span>Tham gia: {new Date(selectedMember.joined_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Leave Team Confirm Dialog */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="size-12 rounded-full bg-semantic-danger/10 border border-semantic-danger/30 flex items-center justify-center text-semantic-danger mb-3">
                <AlertTriangle className="size-6" />
              </div>
              <DialogTitle>Xác nhận rời khỏi đội</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn rời khỏi liên minh <span className="font-semibold text-text-primary">{team.name}</span>? Bạn sẽ mất quyền truy cập vào các bài nộp chung của đội.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 justify-end pt-4 border-t border-surface-border">
              <Button variant="secondary" size="md" onClick={() => setShowLeaveDialog(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowLeaveDialog(false)
                  handleLeaveTeam()
                }}
                className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger"
              >
                Xác nhận rời đội
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.main>
    </div>
  )
}

