'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Loading from '@/components/loading'
import { getPostLoginPath } from '@/lib/auth/routing'
import DotGridBackground from '@/components/dot-grid-background'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  organization: string | null
  uid: string | null
  facebook_url: string | null
  avatar_url: string | null
}

type Competition = {
  id: string
  title: string
  description: string | null
  status: string | null
}

type TeamInvite = {
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

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [duplicateTeams, setDuplicateTeams] = useState<DuplicateMembership[]>([])
  const [resolvingTeam, setResolvingTeam] = useState<string | null>(null)

  // Interactive action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const prefersReducedMotion = useReducedMotion()

  const loadDashboardData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // Role-based redirect (admin/judge should not land on contestant dashboard)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData?.role && profileData.role !== 'participant') {
      router.push(getPostLoginPath(profileData.role))
      return
    }

    // 1. Check ALL team memberships of this user (not just single)
    const { data: allMemberships } = await supabase
      .from('team_members')
      .select('team_id, role, joined_at')
      .eq('user_id', user.id)

    if (allMemberships && allMemberships.length > 1) {
      // Duplicate membership detected — fetch team names
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
      // Don't redirect — let user choose which team to keep
    } else if (allMemberships && allMemberships.length === 1) {
      router.push('/team/dashboard')
      return
    }

    // 2. Fetch profile details (already loaded above for role check)
    if (profileData) {
      setProfile(profileData as unknown as Profile)

      // 3. Fetch active team invitations using user's UID
      if (profileData.uid) {
        const { data: invitesData } = await supabase
          .from('team_invites')
          .select(`
            id, team_id, status, created_at,
            teams(name),
            inviter:invited_by(full_name)
          `)
          .eq('invited_uid', profileData.uid)
          .eq('status', 'pending')

        if (invitesData) {
          setInvites(invitesData as unknown as TeamInvite[])
        }
      }
    }

    // 4. Fetch competitions
    const { data: compsData } = await supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: false })

    if (compsData) {
      setCompetitions(compsData as unknown as Competition[])
    }

    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await loadDashboardData()
    }

    void fetchData()
  }, [router, supabase])

  // Accept or Reject Invitation
  const handleKeepTeam = async (keepTeamId: string) => {
    if (!user) return
    setResolvingTeam(keepTeamId)
    setMessage('')

    // Delete memberships from all OTHER teams
    const toRemove = duplicateTeams.filter((m) => m.team_id !== keepTeamId)
    for (const m of toRemove) {
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', m.team_id)
        .eq('user_id', user.id)
    }

    setResolvingTeam(null)
    router.push('/team/dashboard')
    router.refresh()
  }

  const handleInviteAction = async (invite: TeamInvite, action: 'accept' | 'reject') => {
    if (!user || !profile) return
    setActionLoading(invite.id)
    setMessage('')

    if (action === 'accept') {
      // Double check if user has team
      const { data: teamCheck } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (teamCheck) {
        setMessage('Bạn đã là thành viên của một liên minh khác.')
        setActionLoading(null)
        return
      }

      // Check if the team invite targets still has open space
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, max_members, team_members(user_id)')
        .eq('id', invite.team_id)
        .single()

      if (teamData) {
        const currentCount = teamData.team_members?.length || 0
        if (currentCount >= teamData.max_members) {
          setMessage('Đội bóng này đã đạt số lượng tối đa.')
          setActionLoading(null)
          return
        }
      }

      // 1. Add to team members
      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: 'member',
      })

      if (memberError) {
        console.error('Accept invite member error:', memberError)
        setMessage(`Lỗi thêm thành viên: ${memberError.message}`)
        setActionLoading(null)
        return
      }

      // 2. Update invite status to accepted
      await supabase
        .from('team_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invite.id)

      // Redirect to team dashboard
      router.push('/team/dashboard')
      router.refresh()
      return
    } else {
      // Reject invite
      const { error } = await supabase
        .from('team_invites')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invite.id)

      if (error) {
        setMessage(`Thao tác thất bại: ${error.message}`)
      } else {
        setMessage('Đã từ chối lời mời gia nhập.')
        // Reload invites
        setInvites((prev) => prev.filter((inv) => inv.id !== invite.id))
      }
    }
    setActionLoading(null)
  }

  if (loading) return <Loading text="Đang tải dữ liệu bảng điều khiển..." />

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Badge variant="brand" size="sm">
                  GenD Arena 2026
                </Badge>
                <Badge variant="success" size="sm">
                  <span className="size-1.5 rounded-full bg-semantic-success animate-pulse mr-1.5" />
                  Hoạt động
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
                Xin chào, {profile?.full_name || 'Thí sinh'}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Chào mừng bạn đến với bảng điều khiển đấu trường khởi nghiệp công nghệ
              </p>
            </div>

            {profile?.uid && (
              <div className="bg-surface-raised border border-surface-border rounded-lg px-4 py-2.5 flex items-center gap-3">
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                  UID:
                </span>
                <span className="font-mono text-sm font-semibold text-brand-cyan select-all">
                  {profile.uid}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.main
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8"
      >
        {/* Duplicate Team Warning Banner */}
        {duplicateTeams.length > 1 && (
          <Card className="bg-semantic-warning/10 border-semantic-warning/40 p-5 shadow-elevation-2">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="size-5 text-semantic-warning shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-base font-semibold text-semantic-warning">
                  Phát hiện tài khoản thuộc nhiều đội cùng lúc
                </h2>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                  Vui lòng chọn 1 đội để giữ lại. Các đội khác sẽ tự động rời khỏi tài khoản của bạn.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {duplicateTeams.map((m) => (
                <div
                  key={m.team_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-surface-base border border-surface-border rounded-lg gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary text-sm">{m.team_name}</span>
                      <Badge variant="warning" size="sm">
                        {m.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      Tham gia: {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleKeepTeam(m.team_id)}
                    isLoading={resolvingTeam === m.team_id}
                    disabled={resolvingTeam !== null}
                  >
                    Giữ đội này
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Global Message Banner */}
        {message && (
          <div className="p-4 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-sm text-brand-cyan flex items-center gap-2.5">
            <Radio className="size-4 shrink-0 text-brand-cyan" />
            <span>{message}</span>
          </div>
        )}

        {/* Profile Summary & Team Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Profile Summary Card */}
          <Card className="lg:col-span-4 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-surface-border">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider font-display">
                  Hồ sơ cá nhân
                </span>
                <Badge variant="info" size="sm">
                  Thí sinh
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="shrink-0 size-16 rounded-full border-2 border-surface-border bg-surface-overlay overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="size-8 text-text-tertiary" />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-text-primary font-semibold text-base truncate">
                    {profile?.full_name || <span className="text-text-tertiary italic text-sm">Chưa có tên</span>}
                  </p>
                  <p className="text-text-secondary text-xs truncate">{profile?.email}</p>
                  {profile?.organization && (
                    <p className="text-text-tertiary text-xs truncate">{profile.organization}</p>
                  )}
                </div>
              </div>
            </div>

            <Link href="/profile" className="block w-full mt-4">
              <Button variant="secondary" size="md" className="w-full" leftIcon={<Pencil className="size-4" />}>
                Chỉnh sửa hồ sơ
              </Button>
            </Link>
          </Card>

          {/* Quick Actions Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card interactive className="p-6 flex flex-col justify-between card-hover-glow">
              <div>
                <div className="size-11 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center mb-4">
                  <Plus className="size-6 text-brand-cyan card-icon" />
                </div>
                <h3 className="font-display text-lg font-semibold text-text-primary mb-1.5">
                  Tạo đội thi mới
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  Khởi tạo liên minh thi đấu của riêng bạn, mời đồng đội tham gia và chuẩn bị nộp đề án.
                </p>
              </div>
              <Link href="/team/create" className="block w-full">
                <Button variant="primary" size="md" className="w-full">
                  Tạo đội thi
                </Button>
              </Link>
            </Card>

            <Card interactive className="p-6 flex flex-col justify-between card-hover-glow">
              <div>
                <div className="size-11 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center mb-4">
                  <Search className="size-6 text-brand-cyan card-icon" />
                </div>
                <h3 className="font-display text-lg font-semibold text-text-primary mb-1.5">
                  Gia nhập đội có sẵn
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  Tìm kiếm danh sách các đội đang mở tuyển thành viên và gửi yêu cầu gia nhập liên minh.
                </p>
              </div>
              <Link href="/team/browse" className="block w-full">
                <Button variant="secondary" size="md" className="w-full">
                  Tìm kiếm đội
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* Pending Invitations list */}
        {invites.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Inbox className="size-5 text-brand-cyan" />
              <h2 className="font-display text-lg font-semibold text-text-primary">
                Lời mời gia nhập đội ({invites.length})
              </h2>
            </div>

            <div className="space-y-3.5">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-surface-overlay border border-surface-border rounded-xl gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Lời mời gia nhập đội <span className="text-brand-cyan">{invite.teams?.name}</span>
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Người mời:{' '}
                      <span className="text-text-secondary font-medium">
                        {invite.inviter?.full_name || 'Không rõ'}
                      </span>{' '}
                      • {new Date(invite.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex gap-2.5 shrink-0 self-end sm:self-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInviteAction(invite, 'accept')}
                      isLoading={actionLoading === invite.id}
                      disabled={actionLoading !== null}
                    >
                      Chấp nhận
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleInviteAction(invite, 'reject')}
                      disabled={actionLoading !== null}
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Active Competitions Section */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-brand-cyan" />
              <h2 className="font-display text-xl font-semibold text-text-primary">
                Danh sách cuộc thi
              </h2>
            </div>
          </div>

          {competitions.length === 0 ? (
            <Card className="text-center py-12">
              <Trophy className="size-12 text-text-tertiary mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-text-primary">
                Hiện chưa có cuộc thi nào
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Các cuộc thi mới sẽ sớm được cập nhật trên hệ thống.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {competitions.map((comp) => (
                <Card
                  key={comp.id}
                  interactive
                  className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-hover-glow"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-lg font-semibold text-text-primary">
                        {comp.title}
                      </h3>
                      <Badge variant="brand" size="sm">
                        {comp.status === 'registration'
                          ? 'Đang mở đăng ký'
                          : comp.status?.toUpperCase()}
                      </Badge>
                    </div>
                    {comp.description && (
                      <p className="text-text-secondary text-sm leading-relaxed max-w-3xl">
                        {comp.description}
                      </p>
                    )}
                  </div>
                  <Link href={`/competitions/${comp.id}`} className="shrink-0 self-end md:self-center">
                    <Button variant="secondary" size="md" rightIcon={<ArrowRight className="size-4" />}>
                      Xem chi tiết
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </motion.main>
    </div>
  )
}