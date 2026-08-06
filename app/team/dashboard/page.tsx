'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import {
  ArrowLeft,
  Users,
  ClipboardPen,
  LogOut,
  AlertTriangle,
  ClipboardList,
  Mail,
  Loader2,
  Clock,
  Inbox,
  MessageSquare,
  Shield,
  X,
  Phone,
  Building2,
  ExternalLink,
  User as UserIcon,
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

  // Invite by UID form
  const [inviteUid, setInviteUid] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

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
    const profileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {}
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
      setErrorMessage(`Lỗi tải danh sách thành viên: ${membersError.message} (code: ${membersError.code})`)
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
    const profileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null; organization: string | null; avatar_url: string | null; facebook_url: string | null }> = {}
    profilesData?.forEach((p) => {
      profileMap[p.id] = { full_name: p.full_name, email: p.email, phone: p.phone, organization: p.organization, avatar_url: (p as Record<string, unknown>).avatar_url as string | null ?? null, facebook_url: (p as Record<string, unknown>).facebook_url as string | null ?? null }
    })

    const merged = membersData.map((m) => ({
      ...m,
      profiles: profileMap[m.user_id] ?? null,
    }))

    setMembers(merged as unknown as TeamMember[])

    // Check for duplicate memberships among roster members
    if (merged.length > 0) {
      const userIds = merged.map(m => m.user_id)
      const { data: dupCheck } = await supabase
        .from('team_members')
        .select('user_id')
        .in('user_id', userIds)

      // Group by user_id and find any appearing more than once
      const countMap: Record<string, number> = {}
      dupCheck?.forEach(r => { countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1 })
      const dupeIds = Object.keys(countMap).filter(uid => countMap[uid] > 1)

      if (dupeIds.length > 0) {
        setDupeMembers(merged
          .filter(m => dupeIds.includes(m.user_id))
          .map(m => ({ user_id: m.user_id, full_name: m.profiles?.full_name ?? null }))
        )
      } else {
        setDupeMembers([])
      }
    }
  }

  const loadTeamData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
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
      .select('id, name, description, max_members, is_open, leader_id, competition_id, competitions(title)')
      .eq('id', memberRecord.team_id)
      .single()

    if (teamError || !teamData) {
      console.error('Fetch team details error:', teamError)
      router.push('/dashboard')
      return
    }

    setTeam(teamData as unknown as Team)

    // Fetch all members (uses fetchMembers helper — consistent with handleRequestAction)
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
    const { error: inviteError } = await supabase
      .from('team_invites')
      .insert({
        team_id: team.id,
        invited_uid: formattedUid,
        invited_by: user.id,
        status: 'pending'
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
  const handleRequestAction = async (requestId: string, requesterId: string, action: 'accept' | 'reject') => {
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
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: requesterId,
          role: 'member'
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
        .update({ status: 'accepted', responded_at: new Date().toISOString(), responded_by: user.id })
        .eq('id', requestId)

      if (acceptErr) {
        console.error('Accept update request error:', acceptErr)
      }
    } else {
      // Reject — update status
      const { error: rejectErr } = await supabase
        .from('team_join_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString(), responded_by: user.id })
        .eq('id', requestId)

      if (rejectErr) {
        console.error('Reject update request error:', rejectErr)
      }
    }

    // Targeted re-fetch: only refresh members list and pending join requests
    // (avoids full page re-init which can silently fail on FK join errors)
    await Promise.all([
      fetchMembers(team.id),
      fetchJoinRequests(team.id),
    ])
    setActionLoading(null)
  }

  // Handle leaving team
  const handleLeaveTeam = async () => {
    if (!team || !user) return
    if (isLeader) {
      setErrorMessage('Chỉ huy (Leader) không thể rời đội. Vui lòng chuyển quyền hoặc giải tán đội trước (ở bản cập nhật sau).')
      return
    }

    const confirmLeave = confirm('Bạn có chắc chắn muốn rời khỏi liên minh này?')
    if (!confirmLeave) return

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

  if (loading) return <Loading text="Đang tải..." />
  if (!team) return null

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Navigation back */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs font-orbitron font-bold tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Dashboard</span>
        </Link>

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#1e2d5a] pb-6 gap-4">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Quản lý đội: <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.2)]">{team.name}</span></span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/submissions"
              className="tech-btn-accent px-5 py-2 rounded-lg text-xs font-bold tracking-wider font-orbitron text-black flex items-center gap-1.5"
            >
              <ClipboardPen className="w-4 h-4" />
              <span>Nộp bài dự thi</span>
            </Link>
            {!isLeader && (
              <button
                onClick={handleLeaveTeam}
                className="px-4 py-2 border border-red-500/30 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-semibold tracking-wider rounded-lg cursor-pointer transition flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Rời đội</span>
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Duplicate Member Warning Banner (Leader only) */}
        {isLeader && dupeMembers.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-5 mb-6 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-orbitron text-sm font-bold text-amber-400 tracking-wider">Cảnh báo: Thành viên thuộc nhiều đội</h2>
                <p className="text-slate-400 text-xs mt-1 mb-2">
                  Các thành viên sau đang có trong nhiều đội cùng lúc. Hãy yêu cầu họ vào trang cá nhân để chọn đội giữ lại.
                </p>
                <ul className="space-y-1">
                  {dupeMembers.map(dm => (
                    <li key={dm.user_id} className="text-xs text-amber-300 font-semibold">• {dm.full_name ?? dm.user_id}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Team Details & Members */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Team info */}
            <div className="tech-panel p-6 border-cyan-500/15 relative">
              <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                <span>Thông tin đội</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-slate-500 text-xs tracking-wider font-semibold block mb-1">Cuộc thi tham dự:</span>
                  <span className="text-slate-200 font-bold">{team.competitions?.title || 'Đang cập nhật...'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs tracking-wider font-semibold block mb-1">Mô tả đội hình:</span>
                  <p className="text-slate-350 text-sm leading-relaxed">{team.description || 'Không có mô tả chi tiết cho đội này.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1e2d5a]/40">
                  <div>
                    <span className="text-slate-500 text-xs tracking-wider font-semibold block">Sức chứa tối đa:</span>
                    <span className="text-slate-200 font-bold">{team.max_members} thành viên</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs tracking-wider font-semibold block">Trạng thái tuyển quân:</span>
                    <span className={`font-bold ${team.is_open ? 'text-cyan-400' : 'text-red-450'}`}>
                      {team.is_open ? 'Đang mở đăng ký' : 'Đã đóng tuyển'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

              {/* Members List */}
              <div className="tech-panel p-6 border-cyan-500/15 relative">
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Danh sách thành viên ({members.length} / {team.max_members})</span>
                </h2>
                <div className="space-y-3">
                  {members.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#0a1128]/50 border border-[#1e2d5a]/50 rounded-xl gap-3 text-left hover:border-cyan-500/40 hover:bg-[#0a1128]/80 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-full border border-cyan-500/20 bg-[#131e3d] overflow-hidden flex items-center justify-center">
                          {member.profiles?.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm group-hover:text-cyan-300 transition">{member.profiles?.full_name || 'Vô danh'}</span>
                            {member.role === 'leader' && (
                              <span className="bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold font-orbitron">
                                Chỉ huy
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5">{member.profiles?.organization || member.profiles?.email || ''}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600 font-orbitron font-semibold shrink-0">
                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

          </div>

          {/* Right Column: Leader Controls (Invites & Requests) */}
          <div className="space-y-8">
            
            {/* Invite by UID Form */}
            {isLeader && (
              <div className="tech-panel p-6 border-cyan-500/15 relative">
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Mời thành viên bằng UID</span>
                </h2>
                
                {inviteMessage && (
                  <div className="text-xs font-semibold p-2.5 rounded bg-[#131e3d] border border-cyan-500/30 text-cyan-400 mb-4">
                    {inviteMessage}
                  </div>
                )}

                <form onSubmit={handleSendInvite} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                      Mã UID (8 ký tự)
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteUid}
                      onChange={(e) => setInviteUid(e.target.value)}
                      placeholder="VD: A1B2C3D4"
                      maxLength={8}
                      className="w-full px-4 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-650 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition font-mono uppercase text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full py-2 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold tracking-wider rounded-lg transition duration-200 cursor-pointer text-xs font-orbitron flex items-center justify-center gap-1.5"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      'Gửi lời mời'
                    )}
                  </button>
                </form>

                {/* Active invites pending */}
                {invites.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#1e2d5a]/45">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block mb-3">Lời mời đang chờ:</span>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {invites.map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center bg-[#070c1e] border border-[#1e2d5a]/30 p-2.5 rounded-lg text-xs">
                          <span className="font-mono text-cyan-400 uppercase">{inv.invited_uid}</span>
                          <span className="text-slate-500 text-[10px] font-orbitron flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Đang chờ</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Join Requests Pending */}
            {isLeader && (
              <div className="tech-panel p-6 border-cyan-500/15 relative">
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-cyan-400" />
                  <span>Yêu cầu gia nhập</span>
                  {joinRequests.length > 0 && (
                    <span className="relative flex h-2 w-2 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                  {joinRequests.length > 0 && (
                    <span className="ml-1 bg-red-950/60 border border-red-500/40 text-red-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-orbitron">
                      {joinRequests.length}
                    </span>
                  )}
                </h2>
                
                {joinRequests.length === 0 ? (
                  <p className="text-slate-500 text-xs font-medium text-center py-4">Chưa có yêu cầu gia nhập nào.</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {joinRequests.map((req) => (
                      <div 
                        key={req.id} 
                        className="bg-[#0a1128]/40 border border-[#1e2d5a]/40 p-4 rounded-xl space-y-3"
                      >
                        <div>
                          <div className="font-bold text-white text-xs">{req.profiles?.full_name || 'Vô danh'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Email: {req.profiles?.email || 'N/A'}</div>
                          {req.message && (
                            <p className="text-slate-350 text-[11px] leading-relaxed mt-2 bg-[#050814] p-2 rounded border border-[#1e2d5a]/30 flex items-start gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{req.message}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={() => handleRequestAction(req.id, req.requester_id, 'accept')}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-400 text-[10px] font-bold rounded transition cursor-pointer"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, req.requester_id, 'reject')}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1 bg-red-950/20 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 text-[10px] font-bold rounded transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status overview for members */}
            {!isLeader && (
              <div className="tech-panel p-6 border-cyan-500/15 relative">
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Quyền truy cập</span>
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bạn đang ở vai trò Thành viên. Chỉ có Trưởng đội (Leader) mới có quyền gửi lời mời hoặc duyệt yêu cầu xin gia nhập đội.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Member Detail Modal */}
        {selectedMember && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedMember(null)}
          >
            <div
              className="tech-panel-glow max-w-sm w-full p-6 rounded-2xl space-y-5 border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.08)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/60 border border-[#1e2d5a] text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Avatar + name */}
              <div className="flex items-center gap-4 pr-6">
                <div className="shrink-0 w-16 h-16 rounded-full border-2 border-cyan-500/40 bg-[#131e3d] overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                  {selectedMember.profiles?.avatar_url ? (
                    <img src={selectedMember.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-white text-base leading-tight">
                    {selectedMember.profiles?.full_name || <span className="text-slate-500 italic">Vô danh</span>}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-orbitron ${
                      selectedMember.role === 'leader'
                        ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-400'
                        : 'bg-slate-900/60 border border-slate-700/40 text-slate-400'
                    }`}
                  >
                    {selectedMember.role === 'leader' ? 'Chỉ huy' : 'Thành viên'}
                  </span>
                </div>
              </div>

              {/* Detail rows */}
              <div className="space-y-3 border-t border-[#1e2d5a] pt-4">
                {selectedMember.profiles?.organization && (
                  <div className="flex items-start gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{selectedMember.profiles.organization}</span>
                  </div>
                )}
                {selectedMember.profiles?.email && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300 break-all">{selectedMember.profiles.email}</span>
                  </div>
                )}
                {selectedMember.profiles?.phone && (
                  <div className="flex items-start gap-3 text-sm">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{selectedMember.profiles.phone}</span>
                  </div>
                )}
                {selectedMember.profiles?.facebook_url && (
                  <div className="flex items-start gap-3 text-sm">
                    <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <a
                      href={selectedMember.profiles.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 transition break-all"
                    >
                      Facebook →
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t border-[#1e2d5a]/40">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Tham gia: {new Date(selectedMember.joined_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
