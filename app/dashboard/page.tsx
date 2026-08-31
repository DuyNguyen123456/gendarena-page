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
import { ensureProfileExists, getProfile, dobToUiFormat } from '@/services/profile'
import { createNotification, checkAndSendIncompleteProfileReminder } from '@/services/notifications'
import PaymentModal from '@/components/team/PaymentModal'
import { calculateExpectedFee, type TeamPaymentStatus } from '@/types/payment'
import {
  User as UserIcon,
  Plus,
  Search,
  Inbox,
  Trophy,
  Pencil,
  AlertTriangle,
  Radio,
  Users,
  ClipboardPen,
  LogOut,
  Mail,
  Clock,
  Shield,
  Phone,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Share2,
  BadgeCheck,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { isProfileComplete } from '@/lib/profile-utils'

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
  status?: TeamPaymentStatus
  payment_amount?: number
  payment_receipt_url?: string | null
  payment_submitted_at?: string | null
  payment_verified_at?: string | null
  payment_rejected_reason?: string | null
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
    university?: string | null
    faculty?: string | null
    major?: string | null
    dob?: string | null
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
  invited_by?: string
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

type DashboardStatus = 'loading' | 'ready' | 'error' | 'unauthenticated'

function createSyntheticProfile(
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null }
): ProfileData {
  const meta = authUser.user_metadata || {}
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name:
      meta.full_name ||
      meta.fullName ||
      meta.name ||
      authUser.email?.split('@')[0] ||
      'Thí sinh',
    role: (meta.role as any) || 'participant',
    university: meta.university || '',
    faculty: meta.faculty || '',
    major: meta.major || '',
    phone: meta.phone || '',
    dob: dobToUiFormat(meta.dob || ''),
    organization: meta.organization || '',
    uid: meta.uid || null,
    facebook_url: meta.facebook_url || null,
    avatar_url: meta.avatar_url || null,
  }
}

function DashboardContent() {
  const [status, setStatus] = useState<DashboardStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string | null; user_metadata?: Record<string, any> | null } | null>(null)
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

  // Modals & Dialogs
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameError, setRenameError] = useState('')

  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
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
  const fetchMembers = useCallback(async (teamId: string, leaderId?: string) => {
    try {
      const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, role, joined_at')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true })

      const rawMembers = membersData ? [...membersData] : []

      // If leaderId is provided and not in team_members list, add leader
      if (leaderId && !rawMembers.some((m) => m.user_id === leaderId)) {
        rawMembers.unshift({
          user_id: leaderId,
          role: 'leader',
          joined_at: new Date().toISOString(),
        })
      }

      if (rawMembers.length === 0) {
        setMembers([])
        return
      }

      const userIds = rawMembers.map((m) => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, organization, university, faculty, major, dob, avatar_url, facebook_url')
        .in('id', userIds)

      const profileMap: Record<
        string,
        {
          full_name: string | null
          email: string | null
          phone: string | null
          organization: string | null
          university?: string | null
          faculty?: string | null
          major?: string | null
          dob?: string | null
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
          university: ((p as Record<string, unknown>).university as string | null) ?? null,
          faculty: ((p as Record<string, unknown>).faculty as string | null) ?? null,
          major: ((p as Record<string, unknown>).major as string | null) ?? null,
          dob: ((p as Record<string, unknown>).dob as string | null) ?? null,
          avatar_url: ((p as Record<string, unknown>).avatar_url as string | null) ?? null,
          facebook_url: ((p as Record<string, unknown>).facebook_url as string | null) ?? null,
        }
      })

      const merged = rawMembers.map((m) => ({
        ...m,
        profiles: profileMap[m.user_id] ?? null,
      }))

      setMembers(merged as unknown as TeamMember[])
    } catch (err) {
      console.error('[Dashboard] Error fetching team members:', err)
    }
  }, [supabase])

  // Load Dashboard Data with Auto-Heal & Synthetic Fallback
  const loadDashboardData = useCallback(async () => {
    let currentAuthUser: any = null
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      currentAuthUser = authUser

      if (!authUser) {
        setStatus('unauthenticated')
        router.push('/login')
        return
      }

      setUser(authUser)

      // 1. Fetch Profile an toàn qua ensureProfileExists
      let userProfile: ProfileData | null = null
      try {
        const ensured = await ensureProfileExists(authUser)
        if (ensured.ok && ensured.data) {
          userProfile = ensured.data as unknown as ProfileData
        } else {
          const fetched = await getProfile(authUser.id)
          if (fetched) {
            userProfile = fetched as unknown as ProfileData
          }
        }
      } catch (profileErr) {
        console.error('[Dashboard] Error during ensureProfileExists/getProfile:', profileErr)
      }

      // 2. Nếu DB/RLS không trả về profile -> Tự động dùng Synthetic Fallback Profile từ Auth Metadata
      if (!userProfile) {
        console.warn('[Dashboard] Falling back to synthetic profile from Auth Metadata')
        userProfile = createSyntheticProfile(authUser)
      }

      // Role-based redirect
      if (userProfile.role && userProfile.role !== 'participant') {
        router.push(getPostLoginPath(userProfile.role))
        return
      }

      setProfile(userProfile)

      // Kiểm tra gửi thông báo nhắc nhở cập nhật đủ thông tin cá nhân (nếu chưa hoàn thiện)
      if (userProfile && !isProfileComplete(userProfile)) {
        checkAndSendIncompleteProfileReminder(authUser.id, false).catch((e) =>
          console.warn('[Dashboard] checkAndSendIncompleteProfileReminder error:', e)
        )
      }

      // 3. Load thông tin đội thi (hỗ trợ cả leader_id trong bảng teams và membership trong team_members)
      try {
        const [
          { data: allMemberships, error: memberErr },
          { data: leaderTeams, error: leaderErr },
        ] = await Promise.all([
          supabase
            .from('team_members')
            .select('team_id, role, joined_at')
            .eq('user_id', authUser.id),
          supabase
            .from('teams')
            .select('id, name')
            .eq('leader_id', authUser.id),
        ])

        if (memberErr) console.warn('[Dashboard] team_members fetch warning:', memberErr)
        if (leaderErr) console.warn('[Dashboard] leader teams fetch warning:', leaderErr)

        let targetTeamId: string | null = null
        let userIsLeader = false

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
        } else {
          setDuplicateTeams([])

          if (allMemberships && allMemberships.length === 1) {
            targetTeamId = allMemberships[0].team_id
            userIsLeader = allMemberships[0].role === 'leader'
          } else if (leaderTeams && leaderTeams.length > 0) {
            // User là Leader của đội trong bảng teams nhưng chưa có row trong team_members
            targetTeamId = leaderTeams[0].id
            userIsLeader = true
          }

          if (targetTeamId) {
            let teamRecord: any = null

            // Thử query đầy đủ các cột payment
            const { data: fullTeam, error: fullErr } = await supabase
              .from('teams')
              .select('id, name, description, max_members, is_open, leader_id, competition_id, status, payment_amount, payment_receipt_url, payment_submitted_at, payment_verified_at, payment_rejected_reason, competitions(title)')
              .eq('id', targetTeamId)
              .maybeSingle()

            if (fullErr || !fullTeam) {
              // Fallback query base columns nếu migration cột payment chưa chạy
              const { data: baseTeam } = await supabase
                .from('teams')
                .select('id, name, description, max_members, is_open, leader_id, competition_id, competitions(title)')
                .eq('id', targetTeamId)
                .maybeSingle()

              if (baseTeam) {
                teamRecord = {
                  ...baseTeam,
                  status: 'draft',
                }
              }
            } else {
              teamRecord = {
                ...fullTeam,
                status: fullTeam.status || 'draft',
              }
            }

            if (teamRecord) {
              if (teamRecord.leader_id === authUser.id) {
                userIsLeader = true
              }
              setIsLeader(userIsLeader)
              setMyTeam(teamRecord as unknown as Team)
              setRenameValue(teamRecord.name)
              await fetchMembers(teamRecord.id, teamRecord.leader_id)

              if (userIsLeader) {
                // Fetch join requests
                const { data: reqs } = await supabase
                  .from('team_join_requests')
                  .select('id, requester_id, message, status, created_at')
                  .eq('team_id', teamRecord.id)
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
                  .eq('team_id', teamRecord.id)
                  .eq('status', 'pending')
                  .order('created_at', { ascending: false })

                setSentInvites((invitesData ?? []) as unknown as SentInvite[])
              }
            } else {
              setMyTeam(null)
            }
          } else {
            // User has NO team
            setMyTeam(null)
            setDuplicateTeams([])

            // Fetch received team invitations
            if (userProfile.uid) {
              const { data: receivedData } = await supabase
                .from('team_invites')
                .select(`
                  id, team_id, invited_by, status, created_at,
                  teams(name),
                  inviter:invited_by(full_name)
                `)
                .eq('invited_uid', userProfile.uid)
                .eq('status', 'pending')

              setReceivedInvites((receivedData ?? []) as unknown as ReceivedInvite[])
            }
          }
        }
      } catch (teamErr) {
        console.error('[Dashboard] Error loading team data:', teamErr)
      }

      // 4. Load competitions an toàn
      try {
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
      } catch (compErr) {
        console.error('[Dashboard] Error loading competitions:', compErr)
      }

      // Chuyển sang Ready state
      setStatus('ready')
    } catch (err: any) {
      console.error('[Dashboard Load Error]:', err)
      if (currentAuthUser) {
        setProfile(createSyntheticProfile(currentAuthUser))
        setStatus('ready')
      } else {
        setStatus('error')
        setErrorMessage(err?.message || 'Đã xảy ra lỗi khi tải dữ liệu bảng điều khiển.')
      }
    }
  }, [supabase, router, searchParams, fetchMembers, createCompId])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Profile Update Handler with instant UI sync
  const handleProfileUpdated = (updated: ProfileData) => {
    setProfile(updated)
    if (user) {
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === user.id
            ? {
                ...m,
                profiles: {
                  ...m.profiles,
                  full_name: updated.full_name,
                  phone: updated.phone,
                  organization: updated.organization,
                  facebook_url: updated.facebook_url,
                  avatar_url: updated.avatar_url,
                  email: updated.email ?? m.profiles?.email ?? null,
                },
              }
            : m
        )
      )
    }
    setGlobalMessage({ text: 'Đã lưu thay đổi hồ sơ cá nhân.', type: 'success' })
  }

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

      // Send notification to inviter (try/catch non-blocking)
      try {
        if (invite.invited_by) {
          await createNotification({
            userId: invite.invited_by,
            title: 'Lời mời đã được chấp nhận',
            message: `${profile?.full_name || 'Một đấu thủ'} đã đồng ý gia nhập đội thi.`,
            type: 'team_invite',
            link: '/dashboard',
          })
        }
      } catch (notifErr) {
        console.warn('Failed to send invite accepted notification:', notifErr)
      }

      await loadDashboardData()
    } else {
      await supabase.from('team_invites').update({ status: 'rejected' }).eq('id', invite.id)
      setReceivedInvites((prev) => prev.filter((i) => i.id !== invite.id))
      setGlobalMessage({ text: 'Đã từ chối lời mời.', type: 'success' })

      // Send notification to inviter (try/catch non-blocking)
      try {
        if (invite.invited_by) {
          await createNotification({
            userId: invite.invited_by,
            title: 'Lời mời bị từ chối',
            message: `${profile?.full_name || 'Một đấu thủ'} đã từ chối lời mời gia nhập đội.`,
            type: 'team_invite',
            link: '/dashboard',
          })
        }
      } catch (notifErr) {
        console.warn('Failed to send invite rejected notification:', notifErr)
      }
    }
    setActionLoading(null)
  }

  // Create Team (No-team user)
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Enforce profile completion gate
    if (!profile || !isProfileComplete(profile)) {
      setCreateError('Vui lòng hoàn thiện hồ sơ cá nhân trước khi thành lập đội thi.')
      setShowProfileModal(true)
      return
    }

    if (!createName.trim()) {
      setCreateError('Vui lòng nhập tên đội thi.')
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

  // Leader Only: Rename Team (Persists after refresh and updates immediately)
  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myTeam || !isLeader || !renameValue.trim()) return

    const newName = renameValue.trim()
    setRenameLoading(true)
    setRenameError('')

    const { data, error } = await supabase
      .from('teams')
      .update({ name: newName })
      .eq('id', myTeam.id)
      .select()

    if (error) {
      setRenameError(`Lỗi đổi tên: ${error.message}`)
      setRenameLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setRenameError('Không thể cập nhật tên đội (không tìm thấy hoặc không có quyền).')
      setRenameLoading(false)
      return
    }

    setMyTeam((prev) => (prev ? { ...prev, name: newName } : null))
    setRenameValue(newName)
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
      setInviteMessage('Đấu thủ này đã tham gia một đội thi khác.')
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

      // Send notification to invited user (try/catch non-blocking)
      try {
        await createNotification({
          userId: targetProfile.id,
          title: 'Lời mời tham gia đội thi',
          message: `Đội "${myTeam.name}" đã gửi lời mời bạn tham gia đội thi.`,
          type: 'team_invite',
          link: '/dashboard',
        })
      } catch (notifErr) {
        console.warn('Failed to send team invite notification:', notifErr)
      }
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

      // Send notification to requester (try/catch non-blocking)
      try {
        await createNotification({
          userId: requesterId,
          title: 'Kết quả yêu cầu gia nhập',
          message: `Yêu cầu gia nhập đội "${myTeam.name}" của bạn đã được chấp nhận!`,
          type: 'team_request',
          link: '/dashboard',
        })
      } catch (notifErr) {
        console.warn('Failed to send join request accepted notification:', notifErr)
      }
    } else {
      await supabase.from('team_join_requests').update({ status: 'rejected' }).eq('id', requestId)
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      setGlobalMessage({ text: 'Đã từ chối yêu cầu.', type: 'success' })

      // Send notification to requester (try/catch non-blocking)
      try {
        await createNotification({
          userId: requesterId,
          title: 'Kết quả yêu cầu gia nhập',
          message: `Yêu cầu gia nhập đội "${myTeam.name}" của bạn đã bị từ chối.`,
          type: 'team_request',
          link: '/team/browse',
        })
      } catch (notifErr) {
        console.warn('Failed to send join request rejected notification:', notifErr)
      }
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
      if (selectedMember?.user_id === kickTarget.user_id) {
        setSelectedMember(null)
      }
      setGlobalMessage({ text: 'Đã gỡ thành viên khỏi đội thi.', type: 'success' })
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

  // 1. Loading State (First fetch)
  if (status === 'loading') {
    return <Loading variant="dashboard" text="Đang tải thông tin hồ sơ..." />
  }

  // 2. Error State (Fetch failed / auto-heal failed)
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 sm:p-8 text-center space-y-5 border-semantic-danger/30 bg-surface-raised">
          <div className="size-12 rounded-full bg-semantic-danger/10 text-semantic-danger mx-auto flex items-center justify-center">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Không thể tải thông tin hồ sơ
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {errorMessage || 'Đã xảy ra lỗi khi tải hoặc khởi tạo dữ liệu hồ sơ. Vui lòng thử lại.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => loadDashboardData()}
              className="w-full sm:w-auto text-xs"
            >
              Thử lại
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={async () => {
                if (user) {
                  await ensureProfileExists(user)
                  await loadDashboardData()
                }
              }}
              className="w-full sm:w-auto text-xs"
            >
              Tạo hồ sơ mặc định
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 3. Ready State
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

            {/* Always visible Profile button for participants */}
            {profile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowProfileModal(true)}
                leftIcon={
                  isProfileComplete(profile) ? (
                    <BadgeCheck className="size-3.5 text-brand-cyan" />
                  ) : (
                    <Pencil className="size-3.5 text-semantic-warning" />
                  )
                }
                className="w-full sm:w-auto shrink-0 justify-center text-xs gap-1.5"
              >
                <span>Hồ sơ cá nhân ({profile.full_name || 'Tôi'})</span>
                {isProfileComplete(profile) ? (
                  <span className="text-[10px] text-brand-cyan font-medium hidden sm:inline">
                    · Đã xác thực
                  </span>
                ) : (
                  <span className="text-[10px] text-semantic-warning font-medium hidden sm:inline">
                    · Chưa hoàn thiện
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-2.5 flex-wrap">
                  {myTeam ? (
                    <>
                      <span>Đội thi: <span className="text-brand-cyan">{myTeam.name}</span></span>
                    </>
                  ) : (
                    <>
                      <span>Xin chào, {profile?.full_name || 'Đấu thủ'}!</span>
                      {isProfileComplete(profile) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/30 px-2.5 py-1 rounded-full" title="Đã xác thực hồ sơ">
                          <BadgeCheck className="size-3.5 text-brand-cyan" />
                          <span>Đã xác thực hồ sơ</span>
                        </span>
                      )}
                    </>
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
                  : 'Cập nhật hồ sơ cá nhân và khởi tạo hoặc tham gia đội thi để sẵn sàng bước vào đấu trường'}
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

      {/* Incomplete Profile Alert Banner */}
      {profile && !isProfileComplete(profile) && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
          <div className="p-4 sm:p-5 rounded-xl border border-semantic-warning/40 bg-semantic-warning/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-semantic-warning shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-text-primary">
                  Hoàn thiện hồ sơ để tiếp tục
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Bạn cần cập nhật đủ thông tin bắt buộc trước khi tạo đội hoặc xin gia nhập đội.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowProfileModal(true)}
              className="shrink-0 w-full sm:w-auto justify-center text-xs"
              leftIcon={<Pencil className="size-3.5" />}
            >
              Cập nhật hồ sơ ngay
            </Button>
          </div>
        </div>
      )}

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
              className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
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
                  Phát hiện tài khoản thuộc nhiều đội thi
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Theo quy chế GenD Arena 2026, mỗi thí sinh chỉ được tham gia duy nhất 1 đội thi.
                  Vui lòng chọn đội thi bạn muốn giữ lại:
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
                    Lời mời gia nhập đội thi ({receivedInvites.length})
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
                          Đội thi: <span className="text-brand-cyan">{invite.teams?.name || 'Chưa đặt tên'}</span>
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
                    onProfileUpdated={handleProfileUpdated}
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
                      Khởi tạo đội thi mới
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

                  {!isProfileComplete(profile) && (
                    <div className="p-3.5 rounded-xl bg-semantic-warning/10 border border-semantic-warning/30 text-xs text-semantic-warning flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="size-4 shrink-0 text-semantic-warning" />
                        <span className="truncate">Hồ sơ chưa hoàn thiện. Cần cập nhật để tạo đội.</span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowProfileModal(true)}
                        className="text-xs h-7 px-2.5 shrink-0"
                      >
                        Cập nhật
                      </Button>
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
                        Tên đội thi <span className="text-semantic-danger">*</span>
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
                        placeholder="Mục tiêu hoặc chuyên môn thế mạnh của đội..."
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
                        disabled={!isProfileComplete(profile)}
                        leftIcon={<Plus className="size-4" />}
                        className="w-full"
                        title={!isProfileComplete(profile) ? 'Vui lòng hoàn thiện hồ sơ trước khi tạo đội' : undefined}
                      >
                        Thành lập đội thi
                      </Button>
                    </div>
                  </form>

                  {/* Divider & Browse Link */}
                  <div className="pt-4 border-t border-surface-border text-center space-y-3">
                    <p className="text-xs text-text-tertiary">
                      Hoặc bạn muốn tìm đội thi đang mở tuyển thành viên?
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
            {/* PAYMENT & VERIFICATION STATUS BANNER */}
            {myTeam.status === 'verified' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-brand-cyan text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
                    <BadgeCheck className="size-6" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-text-primary">
                        Đội thi đã được xác thực (Verified)
                      </h3>
                      <Badge variant="brand" size="sm">Đã nộp lệ phí</Badge>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Đội đã hoàn tất lệ phí dự thi ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(myTeam.payment_amount || 0)}) và sẵn sàng nộp bài thi.
                    </p>
                  </div>
                </div>
                <Link href="/submissions">
                  <Button variant="primary" size="sm" leftIcon={<ClipboardPen className="size-4" />} className="text-xs shrink-0">
                    Vào phòng nộp bài
                  </Button>
                </Link>
              </div>
            ) : myTeam.status === 'locked_pending_payment' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="size-6 animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-amber-300">
                        Đã nộp biên lai - Đang chờ BTC đối soát
                      </h3>
                      <Badge variant="warning" size="sm">Chờ duyệt</Badge>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Biên lai chuyển khoản đã được ghi nhận. Danh sách thành viên ({members.length} người) đã được chốt và bảo vệ.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-amber-400/90 font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  BTC sẽ phê duyệt trong 24h
                </div>
              </div>
            ) : myTeam.status === 'payment_rejected' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/50 border border-rose-800/90 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-rose-300">
                        Lệ phí dự thi bị từ chối
                      </h3>
                      <Badge variant="danger" size="sm">Cần nộp lại</Badge>
                    </div>
                    <p className="text-xs text-rose-200">
                      <strong>Lý do từ BTC: </strong>{myTeam.payment_rejected_reason || 'Biên lai chuyển khoản không hợp lệ.'}
                    </p>
                  </div>
                </div>
                {isLeader && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPaymentModal(true)}
                    leftIcon={<CreditCard className="size-4" />}
                    className="text-xs shrink-0"
                  >
                    Nộp lại biên lai mới
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-brand-cyan/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center shrink-0">
                    <CreditCard className="size-6" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-text-primary">
                        Lệ phí dự thi &amp; Chốt danh sách đội
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-text-secondary border border-slate-700">
                        Chưa đóng lệ phí
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {members.length === 0
                        ? 'Cần có tối thiểu 1 thành viên để chốt đội và đóng lệ phí.'
                        : `Đội hiện có ${members.length} thành viên (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            calculateExpectedFee(members.length)
                          )}). Trưởng đội hãy chuyển khoản và gửi biên lai để nhận Huy hiệu Verified.`}
                    </p>
                  </div>
                </div>
                {isLeader ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={members.length < 1}
                    leftIcon={<CreditCard className="size-4" />}
                    className="text-xs shrink-0"
                    title={members.length < 1 ? 'Cần tối thiểu 1 thành viên để nộp lệ phí' : undefined}
                  >
                    Thanh toán lệ phí dự thi
                  </Button>
                ) : (
                  <span className="text-xs text-text-tertiary italic">
                    Chờ Trưởng nhóm thanh toán lệ phí
                  </span>
                )}
              </div>
            )}

            {/* Overview Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Quân số đội thi</p>
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
                    <span className="text-[11px] text-text-tertiary">Nhấp vào thẻ để xem chi tiết</span>
                  </div>

                  <div className="space-y-3">
                    {members.map((member) => {
                      const isMemberLeader = member.role === 'leader'
                      const isCurrentUser = member.user_id === user?.id
                      return (
                        <div
                          key={member.user_id}
                          onClick={() => setSelectedMember(member)}
                          className="p-4 bg-surface-raised border border-surface-border rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:border-brand-cyan/40 hover:bg-surface-overlay/60 transition group"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedMember(member)
                            }
                          }}
                          aria-label={`Xem chi tiết thành viên ${member.profiles?.full_name || 'chưa đặt tên'}`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Avatar */}
                            <div className="size-10 rounded-full border border-surface-border group-hover:border-brand-cyan/40 transition overflow-hidden bg-surface-overlay flex items-center justify-center shrink-0">
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
                                <p className="font-semibold text-sm text-text-primary group-hover:text-brand-cyan transition truncate">
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
                              onClick={(e) => {
                                e.stopPropagation()
                                setKickTarget(member)
                              }}
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
                                    className="text-text-tertiary hover:text-semantic-danger text-[11px] cursor-pointer"
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
                      Bạn đang là thành viên chính thức của đội thi. Trưởng nhóm sẽ quản lý việc chiêu mộ và điều phối bài nộp đề án dự thi.
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
                  handleProfileUpdated(updated)
                  setShowProfileModal(false)
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
            <DialogTitle>Đổi tên đội thi</DialogTitle>
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

      {/* DIALOG 3: MEMBER DETAIL MODAL (RESTORED) */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-md p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>Chi tiết thành viên</DialogTitle>
            <DialogDescription>
              Thông tin định danh và phương thức liên hệ của thành viên trong đội thi
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-5 pt-2">
              {/* Avatar + Full Name + Role */}
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full border-2 border-brand-cyan/40 bg-surface-overlay overflow-hidden flex items-center justify-center shrink-0">
                  {selectedMember.profiles?.avatar_url ? (
                    <img
                      src={selectedMember.profiles.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-xl font-bold text-brand-cyan select-none">
                      {(selectedMember.profiles?.full_name || selectedMember.profiles?.email || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-display font-semibold text-base sm:text-lg text-text-primary truncate">
                    {selectedMember.profiles?.full_name || 'Thành viên chưa đặt tên'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={selectedMember.role === 'leader' ? 'brand' : 'default'}
                      size="sm"
                    >
                      {selectedMember.role === 'leader' ? (
                        <>
                          <Shield className="size-3 mr-1" />
                          Trưởng nhóm
                        </>
                      ) : (
                        'Thành viên'
                      )}
                    </Badge>
                    {selectedMember.user_id === user?.id && (
                      <span className="text-[10px] bg-surface-base border border-surface-border text-text-tertiary px-1.5 py-0.5 rounded font-mono">
                        Tôi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Info Fields */}
              <div className="space-y-3 pt-3 border-t border-surface-border text-sm">
                {/* Organization & School */}
                <div className="flex items-start gap-3">
                  <GraduationCap className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-text-tertiary">Trường học / Khoa - Ngành</p>
                    <p className="text-text-primary text-xs font-medium">
                      {selectedMember.profiles?.university ? (
                        <>
                          {selectedMember.profiles.university}
                          {selectedMember.profiles.faculty ? ` · ${selectedMember.profiles.faculty}` : ''}
                          {selectedMember.profiles.major ? ` (${selectedMember.profiles.major})` : ''}
                        </>
                      ) : selectedMember.profiles?.organization ? (
                        selectedMember.profiles.organization
                      ) : (
                        <span className="text-text-disabled italic">Chưa cập nhật</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-text-tertiary">Email liên hệ</p>
                    <p className="text-text-primary text-xs font-medium truncate">
                      {selectedMember.profiles?.email || (
                        <span className="text-text-disabled italic">Ẩn</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-text-tertiary">Số điện thoại</p>
                    <p className="text-text-primary text-xs font-medium">
                      {selectedMember.profiles?.phone || (
                        <span className="text-text-disabled italic">Chưa cập nhật</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Facebook URL */}
                <div className="flex items-start gap-3">
                  <ExternalLink className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-text-tertiary">Trang Facebook cá nhân</p>
                    {selectedMember.profiles?.facebook_url ? (
                      <a
                        href={selectedMember.profiles.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-cyan hover:text-brand-cyan-bright transition underline truncate block"
                      >
                        {selectedMember.profiles.facebook_url}
                      </a>
                    ) : (
                      <p className="text-xs text-text-disabled italic">Chưa cập nhật</p>
                    )}
                  </div>
                </div>

                {/* Joined date */}
                <div className="flex items-center gap-3 pt-2 border-t border-surface-border/60 text-xs text-text-tertiary">
                  <Clock className="size-3.5 text-text-disabled shrink-0" />
                  <span>
                    Tham gia đội: {new Date(selectedMember.joined_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Close button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedMember(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: KICK MEMBER CONFIRMATION */}
      <Dialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận gỡ thành viên</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn gỡ {kickTarget?.profiles?.full_name || 'thành viên này'} khỏi đội thi?
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

      {/* DIALOG 5: LEAVE TEAM CONFIRMATION (MEMBER) */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận rời đội thi</DialogTitle>
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

      {/* DIALOG 6: DISBAND TEAM CONFIRMATION (LEADER) */}
      <Dialog open={showDisbandDialog} onOpenChange={setShowDisbandDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận giải tán đội thi</DialogTitle>
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

      {/* DIALOG 7: PAYMENT MODAL (LEADER & TEAM FEE VERIFICATION) */}
      {myTeam && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          team={myTeam}
          membersCount={members.length}
          onSuccess={() => {
            setGlobalMessage({
              text: 'Đã gửi biên lai lệ phí thành công! Đang chờ Ban tổ chức đối soát.',
              type: 'success',
            })
            loadDashboardData()
          }}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading variant="dashboard" text="Đang tải dữ liệu bảng điều khiển..." />}>
      <DashboardContent />
    </Suspense>
  )
}