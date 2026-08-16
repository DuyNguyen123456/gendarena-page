'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import { getPostLoginPath } from '@/lib/auth/routing'
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
import ProfileEditor, { ProfileData } from '@/components/profile/ProfileEditor'
import {
  User as UserIcon,
  Plus,
  Search,
  Inbox,
  Trophy,
  Pencil,
  AlertTriangle,
  Radio,
  ArrowRight,
  Users,
  ClipboardPen,
  LogOut,
  Mail,
  Clock,
  MessageSquare,
  Shield,
  Phone,
  Building2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react'

type Competition = {
  id: string
  title: string
  description?: string | null
  status?: string | null
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

type SentInvite = {
  id: string
  invited_uid: string
  status: string
  created_at: string
}

type ReceivedInvite = {
  id: string
  team_id: string
  status: string
  created_at: string
  teams?: {
    name: string
  } | null
  inviter?: {
    full_name: string | null
  } | null
}

type DuplicateMembership = {
  team_id: string
  team_name: string
  role: string
  joined_at: string
}

function DashboardContent() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [isLeader, setIsLeader] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<ReceivedInvite[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [duplicateTeams, setDuplicateTeams] = useState<DuplicateMembership[]>([])
  const [resolvingTeam, setResolvingTeam] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals & Dialogs
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameError, setRenameError] = useState('')

  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showDisbandDialog, setShowDisbandDialog] = useState(false)
  const [kickTarget, setKickTarget] = useState<TeamMember | null>(null)

  // Team Create Form state (when no team)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createCompId, setCreateCompId] = useState('')
  const [createMaxMembers, setCreateMaxMembers] = useState(5)
  const [createIsOpen, setCreateIsOpen] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Team Invite by UID (Leader only)
  const [inviteUid, setInviteUid] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // Interactive Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [globalMessage, setGlobalMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  // Fetch Team Members
  const fetchMembers = useCallback(async (teamId: string) => {
    const { data: membersData } = await supabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })

    if (!membersData || membersData.length === 0) {
      setMembers([])
      return
    }

    const userIds = membersData.map((m) => m.user_id)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, organization, avatar_url, facebook_url')
      .in('id', userIds)

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
  }, [supabase])

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)

    // Role-based redirect
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileData?.role && profileData.role !== 'participant') {
      router.push(getPostLoginPath(profileData.role))
      return
    }

    if (profileData) {
      setProfile(profileData as unknown as ProfileData)
    }

    // 1. Check ALL team memberships of this user
    const { data: allMemberships } = await supabase
      .from('team_members')
      .select('team_id, role, joined_at')
      .eq('user_id', authUser.id)

    if (allMemberships && allMemberships.length > 1) {
      // Duplicate membership detected
      const teamIds = allMemberships.map((m) => m.team_id)
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds)

      const teamsMap: Record<string, string> = {}
      teamsData?.forEach((t) => {
        teamsMap[t.id] = t.name
      })

      setDuplicateTeams(
        allMemberships.map((m) => ({
          team_id: m.team_id,
          team_name: teamsMap[m.team_id] ?? m.team_id,
          role: m.role,
          joined_at: m.joined_at,
        }))
      )
      setMyTeam(null)
    } else if (allMemberships && allMemberships.length === 1) {
      // User has exactly 1 team
      setDuplicateTeams([])
      const memberRecord = allMemberships[0]
      const userIsLeader = memberRecord.role === 'leader'
      setIsLeader(userIsLeader)

      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, description, max_members, is_open, leader_id, competition_id, competitions(title)')
        .eq('id', memberRecord.team_id)
        .single()

      if (teamData) {
        setMyTeam(teamData as unknown as Team)
        setRenameValue(teamData.name)
        await fetchMembers(teamData.id)

        if (userIsLeader) {
          // Fetch join requests
          const { data: reqs } = await supabase
            .from('team_join_requests')
            .select('id, requester_id, message, status, created_at')
            .eq('team_id', teamData.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

          if (reqs && reqs.length > 0) {
            const reqUserIds = reqs.map((r) => r.requester_id)
            const { data: reqProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone')
              .in('id', reqUserIds)

            const reqProfileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {}
            reqProfiles?.forEach((p) => {
              reqProfileMap[p.id] = { full_name: p.full_name, email: p.email, phone: p.phone }
            })

            setJoinRequests(
              reqs.map((r) => ({
                ...r,
                profiles: reqProfileMap[r.requester_id] ?? null,
              })) as unknown as JoinRequest[]
            )
          } else {
            setJoinRequests([])
          }

          // Fetch sent invites
          const { data: invitesData } = await supabase
            .from('team_invites')
            .select('id, invited_uid, status, created_at')
            .eq('team_id', teamData.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

          setSentInvites((invitesData ?? []) as unknown as SentInvite[])
        }
      }
    } else {
      // User has NO team
      setMyTeam(null)
      setDuplicateTeams([])

      // Fetch received team invitations
      if (profileData?.uid) {
        const { data: receivedData } = await supabase
          .from('team_invites')
          .select(`
            id, team_id, status, created_at,
            teams(name),
            inviter:invited_by(full_name)
          `)
          .eq('invited_uid', profileData.uid)
          .eq('status', 'pending')

        setReceivedInvites((receivedData ?? []) as unknown as ReceivedInvite[])
      }
    }

    // Fetch active competitions
    const { data: compsData } = await supabase
      .from('competitions')
      .select('id, title, description, status')
      .order('created_at', { ascending: false })

    if (compsData) {
      setCompetitions(compsData as unknown as Competition[])
      const paramCompId = searchParams.get('competitionId')
      if (paramCompId && compsData.some((c) => c.id === paramCompId)) {
        setCreateCompId(paramCompId)
      } else if (compsData.length > 0 && !createCompId) {
        setCreateCompId(compsData[0].id)
      }
    }

    setLoading(false)
  }, [supabase, router, searchParams, fetchMembers, createCompId])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Resolve Duplicate Memberships
  const handleKeepTeam = async (keepTeamId: string) => {
    if (!user) return
    setResolvingTeam(keepTeamId)
    setGlobalMessage(null)

    const toRemove = duplicateTeams.filter((m) => m.team_id !== keepTeamId)
    for (const m of toRemove) {
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', m.team_id)
        .eq('user_id', user.id)
    }

    setResolvingTeam(null)
    await loadDashboardData()
  }

  // Accept / Reject Received Invitation (No-team user)
  const handleReceivedInviteAction = async (invite: ReceivedInvite, action: 'accept' | 'reject') => {
    if (!user || !profile) return
    setActionLoading(invite.id)
    setGlobalMessage(null)

    if (action === 'accept') {
      const { data: teamCheck } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (teamCheck) {
        setGlobalMessage({ text: 'Bạn đã là thành viên của một đội thi khác.', type: 'error' })
        setActionLoading(null)
        return
      }

      const { data: teamData } = await supabase
        .from('teams')
        .select('id, max_members')
        .eq('id', invite.team_id)
        .single()

      if (teamData) {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', invite.team_id)

        if ((count || 0) >= teamData.max_members) {
          setGlobalMessage({ text: 'Đội thi này đã đủ số lượng thành viên tối đa.', type: 'error' })
          setActionLoading(null)
          return
        }
      }

      const { error: joinError } = await supabase.from('team_members').insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: 'member',
      })

      if (joinError) {
        setGlobalMessage({ text: `Gia nhập thất bại: ${joinError.message}`, type: 'error' })
        setActionLoading(null)
        return
      }

      await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)
      setGlobalMessage({ text: 'Gia nhập đội thi thành công!', type: 'success' })
      await loadDashboardData()
    } else {
      await supabase.from('team_invites').update({ status: 'rejected' }).eq('id', invite.id)
      setReceivedInvites((prev) => prev.filter((i) => i.id !== invite.id))
      setGlobalMessage({ text: 'Đã từ chối lời mời.', type: 'success' })
    }
    setActionLoading(null)
  }

  // Create Team (No-team user)
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!createName.trim()) {
      setCreateError('Vui lòng nhập tên đội thi / liên minh.')
      return
    }
    if (!createCompId) {
      setCreateError('Vui lòng chọn cuộc thi tham dự.')
      return
    }

    setCreateLoading(true)
    setCreateError('')

    const { error: teamError } = await supabase.from('teams').insert({
      name: createName.trim(),
      description: createDescription.trim(),
      competition_id: createCompId,
      leader_id: user.id,
      max_members: createMaxMembers,
      is_open: createIsOpen,
    })

    if (teamError) {
      setCreateError(`Tạo đội thất bại: ${teamError.message}`)
      setCreateLoading(false)
      return
    }

    setCreateLoading(false)
    setCreateName('')
    setCreateDescription('')
    setGlobalMessage({ text: 'Thành lập đội thi mới thành công!', type: 'success' })
    await loadDashboardData()
  }

  // Leader Only: Rename Team
  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myTeam || !isLeader || !renameValue.trim()) return

    setRenameLoading(true)
    setRenameError('')

    const { error } = await supabase
      .from('teams')
      .update({ name: renameValue.trim() })
      .eq('id', myTeam.id)

    if (error) {
      setRenameError(`Lỗi đổi tên: ${error.message}`)
      setRenameLoading(false)
      return
    }

    setMyTeam((prev) => (prev ? { ...prev, name: renameValue.trim() } : null))
    setShowRenameDialog(false)
    setRenameLoading(false)
    setGlobalMessage({ text: 'Đổi tên đội thi thành công!', type: 'success' })
  }

  // Leader Only: Toggle Open/Close recruitment
  const handleToggleOpen = async () => {
    if (!myTeam || !isLeader) return
    const nextState = !myTeam.is_open
    const { error } = await supabase
      .from('teams')
      .update({ is_open: nextState })
      .eq('id', myTeam.id)

    if (!error) {
      setMyTeam((prev) => (prev ? { ...prev, is_open: nextState } : null))
      setGlobalMessage({
        text: nextState ? 'Đã mở tuyển thành viên.' : 'Đã đóng tuyển thành viên.',
        type: 'success',
      })
    }
  }

  // Leader Only: Invite by UID
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myTeam || !user || !isLeader || !inviteUid.trim()) return

    setInviteLoading(true)
    setInviteMessage('')

    const formattedUid = inviteUid.trim().toUpperCase()

    // 1. Find profile
    const { data: targetProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('uid', formattedUid)
      .maybeSingle()

    if (profileErr || !targetProfile) {
      setInviteMessage('Không tìm thấy đấu thủ với mã UID này.')
      setInviteLoading(false)
      return
    }

    if (targetProfile.role && targetProfile.role !== 'participant') {
      setInviteMessage('Mã UID này thuộc tài khoản quản trị hoặc giám khảo.')
      setInviteLoading(false)
      return
    }

    // 2. Check if already has team
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', targetProfile.id)
      .maybeSingle()

    if (memberCheck) {
      setInviteMessage('Đấu thủ này đã tham gia một liên minh khác.')
      setInviteLoading(false)
      return
    }

    // 3. Send invite
    const { error: inviteError } = await supabase.from('team_invites').insert({
      team_id: myTeam.id,
      invited_uid: formattedUid,
      invited_by: user.id,
      status: 'pending',
    })

    if (inviteError) {
      setInviteMessage(`Lỗi: ${inviteError.message}`)
    } else {
      setInviteMessage('Gửi lời mời thành công!')
      setInviteUid('')
      const { data: teamInvites } = await supabase
        .from('team_invites')
        .select('id, invited_uid, status, created_at')
        .eq('team_id', myTeam.id)
        .eq('status', 'pending')

      if (teamInvites) setSentInvites(teamInvites as unknown as SentInvite[])
    }
    setInviteLoading(false)
  }

  // Leader Only: Cancel Invite
  const handleCancelInvite = async (inviteId: string) => {
    await supabase.from('team_invites').delete().eq('id', inviteId)
    setSentInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  // Leader Only: Join Request actions
  const handleRequestAction = async (requestId: string, requesterId: string, action: 'accept' | 'reject') => {
    if (!myTeam || !user || !isLeader) return
    setActionLoading(requestId)

    if (action === 'accept') {
      if (members.length >= myTeam.max_members) {
        setGlobalMessage({ text: 'Đội thi đã đạt số lượng tối đa.', type: 'error' })
        setActionLoading(null)
        return
      }

      const { data: check } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', requesterId)
        .maybeSingle()

      if (check) {
        await supabase.from('team_join_requests').update({ status: 'rejected' }).eq('id', requestId)
        setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
        setGlobalMessage({ text: 'Đấu thủ này đã tham gia đội thi khác.', type: 'error' })
        setActionLoading(null)
        return
      }

      const { error: joinError } = await supabase.from('team_members').insert({
        team_id: myTeam.id,
        user_id: requesterId,
        role: 'member',
      })

      if (joinError) {
        setGlobalMessage({ text: `Lỗi: ${joinError.message}`, type: 'error' })
        setActionLoading(null)
        return
      }

      await supabase.from('team_join_requests').update({ status: 'accepted' }).eq('id', requestId)
      await fetchMembers(myTeam.id)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      setGlobalMessage({ text: 'Đã duyệt yêu cầu gia nhập!', type: 'success' })
    } else {
      await supabase.from('team_join_requests').update({ status: 'rejected' }).eq('id', requestId)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      setGlobalMessage({ text: 'Đã từ chối yêu cầu.', type: 'success' })
    }
    setActionLoading(null)
  }

  // Leader Only: Kick Member
  const handleKickMember = async () => {
    if (!kickTarget || !myTeam || !isLeader) return
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', myTeam.id)
      .eq('user_id', kickTarget.user_id)

    if (!error) {
      setMembers((prev) => prev.filter((m) => m.user_id !== kickTarget.user_id))
      setKickTarget(null)
      setGlobalMessage({ text: 'Đã gỡ thành viên khỏi đội.', type: 'success' })
    }
  }

  // Member Only: Leave Team
  const handleLeaveTeam = async () => {
    if (!user || !myTeam || isLeader) return
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', myTeam.id)
      .eq('user_id', user.id)

    if (!error) {
      setShowLeaveDialog(false)
      await loadDashboardData()
      setGlobalMessage({ text: 'Bạn đã rời đội thi.', type: 'success' })
    }
  }

  // Leader Only: Disband Team
  const handleDisbandTeam = async () => {
    if (!user || !myTeam || !isLeader) return
    const { error } = await supabase.from('teams').delete().eq('id', myTeam.id)

    if (!error) {
      setShowDisbandDialog(false)
      await loadDashboardData()
      setGlobalMessage({ text: 'Đã giải tán đội thi.', type: 'success' })
    }
  }

  if (loading) return <Loading text="Đang tải dữ liệu bảng điều khiển..." />

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
          {/* Top Row: Badges & Profile Modal Trigger */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant="brand" size="sm">
                {myTeam?.competitions?.title || 'GenD Arena 2026'}
              </Badge>
              {myTeam ? (
                <Badge variant={myTeam.is_open ? 'success' : 'default'} size="sm">
                  {myTeam.is_open ? 'Đang mở tuyển' : 'Đã đóng tuyển'}
                </Badge>
              ) : (
                <Badge variant="info" size="sm">
                  Thí sinh tự do
                </Badge>
              )}
            </div>

            {/* If user HAS team -> small secondary profile edit button in header */}
            {myTeam && profile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProfileModal(true)}
                leftIcon={<UserIcon className="size-3.5" />}
                className="w-full sm:w-auto shrink-0 justify-center text-xs"
              >
                Hồ sơ cá nhân ({profile.full_name || 'Tôi'})
              </Button>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                  {myTeam ? (
                    <>
                      Đội thi: <span className="text-brand-cyan">{myTeam.name}</span>
                    </>
                  ) : (
                    `Xin chào, ${profile?.full_name || 'Đấu thủ'}!`
                  )}
                </h1>

                {/* Leader Only Team Rename Button */}
                {myTeam && isLeader && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRenameValue(myTeam.name)
                      setRenameError('')
                      setShowRenameDialog(true)
                    }}
                    leftIcon={<Pencil className="size-3.5" />}
                    className="text-xs text-text-tertiary hover:text-brand-cyan px-2.5 py-1 h-7"
                    title="Chỉ Trưởng nhóm mới có quyền đổi tên đội"
                  >
                    Đổi tên
                  </Button>
                )}
              </div>

              <p className="text-sm text-text-secondary">
                {myTeam
                  ? 'Không gian quản lý thành viên, xét duyệt đơn gia nhập và điều hướng nộp đề án dự thi'
                  : 'Cập nhật hồ sơ cá nhân và khởi tạo hoặc tham gia liên minh thi đấu để sẵn sàng bước vào đấu trường'}
              </p>
            </div>

            {/* Quick Actions if has team */}
            {myTeam && (
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto pt-2 md:pt-0">
                <Link href="/submissions" className="w-full sm:w-auto">
                  <Button variant="primary" size="md" leftIcon={<ClipboardPen className="size-4" />} className="w-full justify-center">
                    Nộp bài dự thi
                  </Button>
                </Link>

                {!isLeader ? (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowLeaveDialog(true)}
                    className="text-semantic-danger hover:bg-semantic-danger/10 w-full sm:w-auto justify-center"
                    leftIcon={<LogOut className="size-4" />}
                  >
                    Rời đội
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowDisbandDialog(true)}
                    className="text-semantic-danger hover:bg-semantic-danger/10 w-full sm:w-auto justify-center"
                    leftIcon={<LogOut className="size-4" />}
                  >
                    Giải tán
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Status Message Toast */}
      {globalMessage && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
              globalMessage.type === 'success'
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            <div className="flex items-center gap-2">
              {globalMessage.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span>{globalMessage.text}</span>
            </div>
            <button
              onClick={() => setGlobalMessage(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <motion.main
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8"
      >
        {/* CASE 1: MULTIPLE DUPLICATE TEAMS DETECTED */}
        {duplicateTeams.length > 1 && (
          <Card className="p-6 border-semantic-warning/40 bg-semantic-warning/5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-6 text-semantic-warning shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h3 className="font-display text-base font-semibold text-text-primary">
                  Phát hiện tài khoản thuộc nhiều liên minh
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Theo quy chế GenD Arena 2026, mỗi thí sinh chỉ được tham gia duy nhất 1 liên minh thi đấu.
                  Vui lòng chọn liên minh bạn muốn giữ lại:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {duplicateTeams.map((dt) => (
                <div
                  key={dt.team_id}
                  className="p-4 rounded-xl border border-surface-border bg-surface-raised flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-text-primary truncate">{dt.team_name}</p>
                    <p className="text-xs text-text-tertiary">
                      Vai trò: {dt.role === 'leader' ? 'Trưởng nhóm' : 'Thành viên'}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={resolvingTeam === dt.team_id}
                    onClick={() => handleKeepTeam(dt.team_id)}
                  >
                    Giữ đội này
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CASE 2: PARTICIPANT HAS NO TEAM (UNIFIED ONBOARDING VIEW) */}
        {!myTeam && duplicateTeams.length <= 1 && (
          <div className="space-y-8">
            {/* Received Invitations if any */}
            {receivedInvites.length > 0 && (
              <Card className="p-6 border-brand-cyan/40 bg-brand-cyan/5 space-y-4">
                <div className="flex items-center gap-2">
                  <Inbox className="size-5 text-brand-cyan" />
                  <h3 className="font-display font-semibold text-text-primary text-base">
                    Lời mời gia nhập liên minh ({receivedInvites.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {receivedInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-4 bg-surface-raised border border-surface-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text-primary">
                          Liên minh: <span className="text-brand-cyan">{invite.teams?.name || 'Chưa đặt tên'}</span>
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Người mời: {invite.inviter?.full_name || 'Đội trưởng'} · Nhận lúc: {new Date(invite.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={actionLoading === invite.id}
                          onClick={() => handleReceivedInviteAction(invite, 'accept')}
                        >
                          Chấp nhận
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === invite.id}
                          onClick={() => handleReceivedInviteAction(invite, 'reject')}
                          className="text-semantic-danger hover:bg-semantic-danger/10"
                        >
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 2 Main Sections: Inline Profile Editor + Team Create / Browse */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Personal Profile Inline Editor */}
              <div className="lg:col-span-6 space-y-6">
                {profile ? (
                  <ProfileEditor
                    profile={profile}
                    onProfileUpdated={(updated) => {
                      setProfile(updated)
                      setGlobalMessage({ text: 'Đã cập nhật hồ sơ cá nhân.', type: 'success' })
                    }}
                  />
                ) : (
                  <Card className="p-8 text-center text-text-tertiary">
                    <p className="text-sm">Đang tải thông tin hồ sơ...</p>
                  </Card>
                )}
              </div>

              {/* Right Column: Create Team Section + Browse Link */}
              <div className="lg:col-span-6 space-y-6">
                <Card className="p-6 sm:p-8 space-y-6">
                  <div>
                    <Badge variant="brand" size="sm" className="mb-2">
                      Bước tiếp theo
                    </Badge>
                    <h3 className="font-display text-lg font-semibold text-text-primary">
                      Khởi tạo liên minh thi đấu
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Thành lập đội mới để nhận mã UID chiêu mộ đồng đội hoặc tìm đội có sẵn
                    </p>
                  </div>

                  {createError && (
                    <div className="p-3.5 rounded-xl bg-semantic-danger/10 border border-semantic-danger/30 text-xs text-semantic-danger flex items-start gap-2">
                      <AlertTriangle className="size-4 shrink-0 text-semantic-danger mt-0.5" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    {/* Competition select */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-text-secondary">
                        Cuộc thi tham dự <span className="text-semantic-danger">*</span>
                      </label>
                      <select
                        value={createCompId}
                        onChange={(e) => setCreateCompId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-text-primary focus:outline-none focus:border-brand-cyan text-sm transition"
                      >
                        {competitions.map((comp) => (
                          <option key={comp.id} value={comp.id} className="bg-surface-raised text-text-primary">
                            {comp.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Team name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-text-secondary">
                        Tên đội thi / Liên minh <span className="text-semantic-danger">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="VD: Cybernetic Innovators"
                        leftIcon={<Users className="size-4" />}
                      />
                    </div>

                    {/* Team description */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-text-secondary">
                        Mô tả định hướng / Khẩu hiệu đội
                      </label>
                      <textarea
                        rows={2}
                        value={createDescription}
                        onChange={(e) => setCreateDescription(e.target.value)}
                        placeholder="Mục tiêu hoặc chuyên môn thế mạnh của liên minh..."
                        className="w-full px-4 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand-cyan text-sm transition resize-none"
                      />
                    </div>

                    {/* Max members & is open */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-text-secondary">
                          Số lượng thành viên tối đa
                        </label>
                        <select
                          value={createMaxMembers}
                          onChange={(e) => setCreateMaxMembers(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-text-primary focus:outline-none focus:border-brand-cyan text-sm transition"
                        >
                          <option value={2}>2 thành viên</option>
                          <option value={3}>3 thành viên</option>
                          <option value={4}>4 thành viên</option>
                          <option value={5}>5 thành viên (Tiêu chuẩn)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-text-secondary">
                          Chế độ tuyển quân
                        </label>
                        <button
                          type="button"
                          onClick={() => setCreateIsOpen(!createIsOpen)}
                          className={`w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition flex items-center justify-between ${
                            createIsOpen
                              ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                              : 'bg-surface-overlay border-surface-border text-text-tertiary'
                          }`}
                        >
                          <span>{createIsOpen ? 'Mở nhận đơn' : 'Đóng tuyển'}</span>
                          <span className="text-xs opacity-75">{createIsOpen ? 'Bật' : 'Tắt'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={createLoading}
                        leftIcon={<Plus className="size-4" />}
                        className="w-full"
                      >
                        Thành lập đội thi
                      </Button>
                    </div>
                  </form>

                  {/* Divider & Browse Link */}
                  <div className="pt-4 border-t border-surface-border text-center space-y-3">
                    <p className="text-xs text-text-tertiary">
                      Hoặc bạn muốn tìm liên minh đang mở tuyển thành viên?
                    </p>
                    <Link href="/team/browse" className="inline-block">
                      <Button variant="secondary" size="sm" leftIcon={<Search className="size-3.5" />}>
                        Tìm &amp; Gia nhập đội có sẵn
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* CASE 3: PARTICIPANT HAS TEAM (UNIFIED TEAM MANAGEMENT VIEW) */}
        {myTeam && (
          <div className="space-y-8">
            {/* Overview Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Quân số liên minh</p>
                  <p className="font-display text-lg font-semibold text-text-primary">
                    {members.length} / {myTeam.max_members}
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0">
                  <Trophy className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-tertiary">Phân khu thi đấu</p>
                  <p className="font-display text-sm font-semibold text-text-primary truncate">
                    {myTeam.competitions?.title || 'GenD Arena 2026'}
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center justify-between gap-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center text-text-secondary shrink-0">
                    <Radio className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Tuyển thành viên</p>
                    <p className="font-display text-sm font-semibold text-text-primary">
                      {myTeam.is_open ? 'Đang mở' : 'Đã đóng'}
                    </p>
                  </div>
                </div>
                {isLeader && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleOpen}
                    className="text-xs text-brand-cyan hover:text-brand-cyan-bright px-2"
                  >
                    Đổi
                  </Button>
                )}
              </Card>

              <Card className="p-5 flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center text-text-secondary shrink-0">
                  <UserIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-tertiary">Mã UID của bạn</p>
                  <p className="font-mono text-xs font-semibold text-brand-cyan truncate">
                    {profile?.uid || 'Chưa cấp'}
                  </p>
                </div>
              </Card>
            </div>

            {/* Team Description if present */}
            {myTeam.description && (
              <Card className="p-5 bg-surface-overlay/40 border-surface-border">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                  Mô tả / Khẩu hiệu đội
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">{myTeam.description}</p>
              </Card>
            )}

            {/* Roster & Management Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Team Members Roster */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                    <h3 className="font-display font-semibold text-text-primary text-base flex items-center gap-2">
                      <Users className="size-4 text-brand-cyan" />
                      <span>Danh sách thành viên ({members.length})</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {members.map((member) => {
                      const isMemberLeader = member.role === 'leader'
                      const isCurrentUser = member.user_id === user?.id
                      return (
                        <div
                          key={member.user_id}
                          className="p-4 bg-surface-raised border border-surface-border rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Avatar */}
                            <div className="size-10 rounded-full border border-surface-border overflow-hidden bg-surface-overlay flex items-center justify-center shrink-0">
                              {member.profiles?.avatar_url ? (
                                <img
                                  src={member.profiles.avatar_url}
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-display text-sm font-bold text-brand-cyan select-none">
                                  {(member.profiles?.full_name || member.profiles?.email || 'U').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-text-primary truncate">
                                  {member.profiles?.full_name || 'Thành viên chưa đặt tên'}
                                </p>
                                {isMemberLeader && (
                                  <Badge variant="brand" size="sm">
                                    <Shield className="size-3 mr-1" />
                                    Trưởng nhóm
                                  </Badge>
                                )}
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-surface-overlay text-text-tertiary px-1.5 py-0.5 rounded font-mono">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-tertiary truncate">
                                {member.profiles?.email || 'Email ẩn'}
                              </p>
                              {member.profiles?.organization && (
                                <p className="text-[11px] text-text-disabled truncate">
                                  {member.profiles.organization}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Leader action: Kick member */}
                          {isLeader && !isMemberLeader && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setKickTarget(member)}
                              className="text-semantic-danger hover:bg-semantic-danger/10 text-xs shrink-0"
                            >
                              Gỡ
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>

              {/* Right Column: Recruitment & Requests (Leader Only) */}
              <div className="lg:col-span-5 space-y-6">
                {isLeader ? (
                  <>
                    {/* Invite by UID Card */}
                    <Card className="p-6 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-display font-semibold text-text-primary text-base flex items-center gap-2">
                          <Share2 className="size-4 text-brand-cyan" />
                          <span>Chiêu mộ thành viên bằng UID</span>
                        </h3>
                        <p className="text-xs text-text-secondary">
                          Nhập mã định danh UID của đấu thủ để gửi lời mời trực tiếp
                        </p>
                      </div>

                      {inviteMessage && (
                        <p
                          className={`text-xs font-medium p-2.5 rounded-lg border ${
                            inviteMessage.startsWith('Gửi')
                              ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                              : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
                          }`}
                        >
                          {inviteMessage}
                        </p>
                      )}

                      <form onSubmit={handleSendInvite} className="flex gap-2">
                        <Input
                          type="text"
                          value={inviteUid}
                          onChange={(e) => setInviteUid(e.target.value)}
                          placeholder="Mã UID (VD: GEND-XXXX)"
                          className="flex-1 text-sm font-mono uppercase"
                          required
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="md"
                          isLoading={inviteLoading}
                          className="shrink-0"
                        >
                          Mời
                        </Button>
                      </form>

                      {/* Sent Invites list */}
                      {sentInvites.length > 0 && (
                        <div className="pt-3 border-t border-surface-border space-y-2">
                          <p className="text-xs font-semibold text-text-tertiary">
                            Lời mời đang chờ ({sentInvites.length})
                          </p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {sentInvites.map((inv) => (
                              <div
                                key={inv.id}
                                className="p-2.5 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-between text-xs"
                              >
                                <span className="font-mono text-brand-cyan">{inv.invited_uid}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCancelInvite(inv.id)}
                                  className="text-text-tertiary hover:text-semantic-danger text-[11px]"
                                >
                                  Thu hồi
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Join Requests Card */}
                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-semibold text-text-primary text-base flex items-center gap-2">
                          <Inbox className="size-4 text-brand-cyan" />
                          <span>Đơn xin gia nhập ({joinRequests.length})</span>
                        </h3>
                      </div>

                      {joinRequests.length === 0 ? (
                        <p className="text-xs text-text-tertiary text-center py-4">
                          Chưa có đơn xin gia nhập nào đang chờ duyệt
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {joinRequests.map((req) => (
                            <div
                              key={req.id}
                              className="p-3.5 bg-surface-raised border border-surface-border rounded-xl space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-text-primary">
                                  {req.profiles?.full_name || 'Đấu thủ ẩn danh'}
                                </p>
                                <span className="text-[10px] text-text-tertiary font-mono">
                                  {new Date(req.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              {req.message && (
                                <p className="text-text-secondary italic bg-surface-overlay p-2 rounded">
                                  "{req.message}"
                                </p>
                              )}
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  isLoading={actionLoading === req.id}
                                  onClick={() => handleRequestAction(req.id, req.requester_id, 'accept')}
                                  className="text-xs h-7 px-2.5"
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionLoading === req.id}
                                  onClick={() => handleRequestAction(req.id, req.requester_id, 'reject')}
                                  className="text-xs h-7 px-2.5 text-semantic-danger hover:bg-semantic-danger/10"
                                >
                                  Từ chối
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </>
                ) : (
                  /* Member Info Card */
                  <Card className="p-6 space-y-3">
                    <h3 className="font-display font-semibold text-text-primary text-base">
                      Quyền hạn thành viên
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Bạn đang là thành viên chính thức của liên minh. Trưởng nhóm sẽ quản lý việc chiêu mộ và điều phối bài nộp đề án dự thi.
                    </p>
                    <div className="pt-2">
                      <Link href="/submissions">
                        <Button variant="secondary" size="sm" className="w-full" leftIcon={<ClipboardPen className="size-3.5" />}>
                          Xem tiến độ bài nộp
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.main>

      {/* DIALOG 1: PROFILE EDIT MODAL (HAS-TEAM PARTICIPANT) */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hồ sơ cá nhân</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin định danh và phương thức liên hệ của bạn
            </DialogDescription>
          </DialogHeader>
          {profile && (
            <div className="mt-4">
              <ProfileEditor
                profile={profile}
                isCompact
                onCancel={() => setShowProfileModal(false)}
                onProfileUpdated={(updated) => {
                  setProfile(updated)
                  setShowProfileModal(false)
                  setGlobalMessage({ text: 'Đã lưu thay đổi hồ sơ cá nhân.', type: 'success' })
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: LEADER ONLY RENAME TEAM DIALOG */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Đổi tên liên minh thi đấu</DialogTitle>
            <DialogDescription>
              Tên mới sẽ cập nhật trên toàn hệ thống giải đấu và danh sách bảng xếp hạng
            </DialogDescription>
          </DialogHeader>

          {renameError && (
            <div className="p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-xs text-semantic-danger mt-3">
              {renameError}
            </div>
          )}

          <form onSubmit={handleRenameTeam} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Tên đội thi mới <span className="text-semantic-danger">*</span>
              </label>
              <Input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="VD: Cybernetic Innovators"
                leftIcon={<Users className="size-4" />}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowRenameDialog(false)}
                disabled={renameLoading}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={renameLoading}
              >
                Lưu tên mới
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: KICK MEMBER CONFIRMATION */}
      <Dialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận gỡ thành viên</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn gỡ {kickTarget?.profiles?.full_name || 'thành viên này'} khỏi liên minh?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" size="md" onClick={() => setKickTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleKickMember}
              className="bg-semantic-danger hover:bg-semantic-danger-hover text-white"
            >
              Xác nhận gỡ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: LEAVE TEAM CONFIRMATION (MEMBER) */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận rời liên minh</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn rời khỏi đội thi "{myTeam?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" size="md" onClick={() => setShowLeaveDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleLeaveTeam}
              className="bg-semantic-danger hover:bg-semantic-danger-hover text-white"
            >
              Xác nhận rời
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: DISBAND TEAM CONFIRMATION (LEADER) */}
      <Dialog open={showDisbandDialog} onOpenChange={setShowDisbandDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận giải tán liên minh</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xóa đội thi "{myTeam?.name}" và toàn bộ thành viên sẽ trở thành thí sinh tự do.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" size="md" onClick={() => setShowDisbandDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleDisbandTeam}
              className="bg-semantic-danger hover:bg-semantic-danger-hover text-white"
            >
              Xác nhận giải tán
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading text="Đang tải dữ liệu bảng điều khiển..." />}>
      <DashboardContent />
    </Suspense>
  )
}