'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import { getPostLoginPath } from '@/lib/auth/routing'
import {
  Settings,
  AlertTriangle,
  Loader2,
  Radio,
  User as UserIcon,
  Plus,
  Search,
  Inbox,
  Trophy,
  Pencil,
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

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
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
      const teamIds = allMemberships.map(m => m.team_id)
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds)

      const teamsMap: Record<string, string> = {}
      teamsData?.forEach(t => { teamsMap[t.id] = t.name })

      setDuplicateTeams(allMemberships.map(m => ({
        team_id: m.team_id,
        team_name: teamsMap[m.team_id] ?? m.team_id,
        role: m.role,
        joined_at: m.joined_at,
      })))
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
    const toRemove = duplicateTeams.filter(m => m.team_id !== keepTeamId)
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
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          user_id: user.id,
          role: 'member'
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
        setInvites(prev => prev.filter(inv => inv.id !== invite.id))
      }
    }
    setActionLoading(null)
  }


  if (loading) return <Loading text="LOADING TERMINAL PARAMETERS" />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Console Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#1e2d5a] pb-6 gap-4">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              <Settings className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span>Bảng điều khiển</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
            <span className="w-2 h-2 rounded-full bg-emerald-405 animate-ping" />
            Hoạt động
          </div>
        </div>

        {/* Duplicate Team Warning Banner */}
        {duplicateTeams.length > 1 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-5 mb-8 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-orbitron text-sm font-bold text-amber-400 tracking-wider">Phát hiện tài khoản thuộc nhiều đội cùng lúc</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Vui lòng chọn 1 đội để giữ lại. Các đội khác sẽ tự động rời khỏi tài khoản của bạn.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {duplicateTeams.map(m => (
                <div key={m.team_id} className="flex items-center justify-between p-3 bg-[#0a1128]/60 border border-amber-500/20 rounded-lg">
                  <div>
                    <span className="font-bold text-white text-sm">{m.team_name}</span>
                    <span className="ml-2 text-[10px] text-amber-400 font-orbitron uppercase">{m.role}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tham gia: {new Date(m.joined_at).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <button
                    onClick={() => handleKeepTeam(m.team_id)}
                    disabled={resolvingTeam !== null}
                    className="px-4 py-2 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-bold tracking-wider rounded-lg transition cursor-pointer disabled:opacity-50 font-orbitron flex items-center gap-1.5"
                  >
                    {resolvingTeam === m.team_id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      'Giữ đội này'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-8 text-sm font-semibold tracking-wide flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Profile Summary Card */}
        <div className="tech-panel p-6 mb-8 relative cyber-corners border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-cyan-400" />
              <span>Hồ sơ của bạn</span>
            </h2>
            {profile?.uid && (
              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg px-4 py-2 flex items-center gap-3">
                <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">UID:</span>
                <span className="font-mono text-sm font-black text-white bg-slate-950 px-2.5 py-1 rounded border border-cyan-400/40 select-all">{profile.uid}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 mb-5">
            <div className="shrink-0 w-16 h-16 rounded-full border-2 border-cyan-500/30 bg-[#131e3d] overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-slate-500" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-base">{profile?.full_name || <span className="text-slate-500 italic text-sm">Chưa có tên</span>}</p>
              <p className="text-slate-400 text-sm">{profile?.email}</p>
              {profile?.organization && (
                <p className="text-slate-500 text-xs">{profile.organization}</p>
              )}
            </div>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-orbitron font-bold tracking-wider text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-lg hover:bg-cyan-950/30 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Chỉnh sửa hồ sơ</span>
          </Link>
        </div>

        {/* Dynamic CTA Sections for Team Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="tech-panel p-6 border-cyan-500/15 relative flex flex-col justify-between">
            <h3 className="font-orbitron text-base font-bold text-white tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>Tạo đội thi mới</span>
            </h3>
            <Link
              href="/team/create"
              className="tech-btn-accent font-orbitron inline-block py-3 rounded-lg text-xs font-bold tracking-wider text-center text-black hover:scale-[1.02] transition"
            >
              Tạo đội
            </Link>
          </div>

          <div className="tech-panel p-6 border-cyan-500/15 relative flex flex-col justify-between">
            <h3 className="font-orbitron text-base font-bold text-white tracking-wider mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              <span>Gia nhập đội có sẵn</span>
            </h3>
            <Link
              href="/team/browse"
              className="tech-btn-primary font-orbitron inline-block py-3 rounded-lg text-xs font-bold tracking-wider text-center text-white hover:scale-[1.02] transition"
            >
              Tìm đội
            </Link>
          </div>
        </div>

        {/* Pending Invitations list */}
        {invites.length > 0 && (
          <div className="tech-panel p-6 mb-8 border-cyan-500/15 relative">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-cyan-400" />
              <span>Lời mời gia nhập ({invites.length})</span>
            </h2>
            <div className="space-y-4">
              {invites.map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-cyan-950/20 border border-cyan-500/25 rounded-xl gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      Lời mời gia nhập đội <span className="text-cyan-400">{invite.teams?.name}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Người mời: <span className="text-slate-300 font-semibold">{invite.inviter?.full_name || 'Không rõ'}</span> • {new Date(invite.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex gap-2.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleInviteAction(invite, 'accept')}
                      disabled={actionLoading === invite.id}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold tracking-wider rounded-lg transition disabled:opacity-50 cursor-pointer font-orbitron flex items-center gap-1.5"
                    >
                      {actionLoading === invite.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        'Chấp nhận'
                      )}
                    </button>
                    <button
                      onClick={() => handleInviteAction(invite, 'reject')}
                      disabled={actionLoading === invite.id}
                      className="px-4 py-2 border border-slate-700 hover:bg-slate-900/60 text-slate-350 text-xs font-bold tracking-wider rounded-lg transition disabled:opacity-50 cursor-pointer font-orbitron"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Arenas */}
        <div className="tech-panel p-6 border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Danh sách cuộc thi</span>
          </h2>
          {competitions.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm font-semibold">Hiện chưa có cuộc thi nào trên hệ thống.</p>
          ) : (
            <div className="space-y-4">
              {competitions.map((comp) => (
                <div key={comp.id} className="tech-panel-glow border-cyan-500/15 hover:border-cyan-400/40 p-5 rounded-xl transition duration-200">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                      <h3 className="font-orbitron text-lg font-bold text-white tracking-wider uppercase">{comp.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{comp.description}</p>
                      <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-bold text-cyan-400 tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        {comp.status === 'registration' ? 'ĐANG MỞ ĐĂNG KÝ THI' : comp.status?.toUpperCase()}
                      </div>
                    </div>
                    <Link
                      href={`/competitions/${comp.id}`}
                      className="tech-btn-primary px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider font-orbitron transition whitespace-nowrap self-end md:self-center"
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}