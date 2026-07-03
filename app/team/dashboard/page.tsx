'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

type TeamMember = {
  user_id: string
  role: string
  created_at: string
  profiles?: {
    full_name: string | null
    email: string | null
    phone: string | null
    organization: string | null
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

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isLeader, setIsLeader] = useState(false)

  // Invite by UID form
  const [inviteUid, setInviteUid] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

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

    // Fetch all members
    const { data: membersData } = await supabase
      .from('team_members')
      .select('user_id, role, created_at, profiles(full_name, email, phone, organization)')
      .eq('team_id', memberRecord.team_id)

    if (membersData) {
      setMembers(membersData as unknown as TeamMember[])
    }

    // If leader, fetch requests & invites
    if (memberRecord.role === 'leader') {
      const { data: requests } = await supabase
        .from('team_join_requests')
        .select('id, requester_id, message, status, created_at, profiles:requester_id(full_name, email, phone)')
        .eq('team_id', memberRecord.team_id)
        .eq('status', 'pending')

      if (requests) {
        setJoinRequests(requests as unknown as JoinRequest[])
      }

      const { data: teamInvites } = await supabase
        .from('team_invites')
        .select('id, invited_uid, status, created_at')
        .eq('team_id', memberRecord.team_id)
        .eq('status', 'pending')

      if (teamInvites) {
        setInvites(teamInvites as unknown as Invite[])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTeamData()
  }, [router, supabase])

  // Handle invitation submission
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team || !inviteUid.trim()) return

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
      setInviteMessage('❌ Không tìm thấy đấu thủ với UID này.')
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
      setInviteMessage('❌ Đấu thủ này đã tham gia một liên minh khác.')
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
      setInviteMessage(`❌ Lỗi: ${inviteError.message}`)
    } else {
      setInviteMessage('✅ Gửi lời mời thành công!')
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
    if (!team) return
    setActionLoading(requestId)
    setErrorMessage('')

    if (action === 'accept') {
      // Check if team is already full
      if (members.length >= team.max_members) {
        setErrorMessage('❌ Liên minh đã đạt giới hạn số lượng thành viên tối đa.')
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
        setErrorMessage(`❌ Lỗi thêm thành viên: ${memberError.message}`)
        setActionLoading(null)
        return
      }

      // Update request status
      await supabase
        .from('team_join_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString(), responded_by: user.id })
        .eq('id', requestId)
    } else {
      // Reject
      await supabase
        .from('team_join_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString(), responded_by: user.id })
        .eq('id', requestId)
    }

    // Reload all data
    await loadTeamData()
    setActionLoading(null)
  }

  // Handle leaving team
  const handleLeaveTeam = async () => {
    if (!team || !user) return
    if (isLeader) {
      setErrorMessage('❌ Chỉ huy (Leader) không thể rời đội. Vui lòng chuyển quyền hoặc giải tán đội trước (ở bản cập nhật sau).')
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
      setErrorMessage(`❌ Rời đội thất bại: ${error.message}`)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (loading) return <Loading text="BOOTING TEAM INTERFACE" />
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
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          ← QUAY LẠI PILOT CONSOLE
        </Link>

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#1e2d5a] pb-6 gap-4">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              <span>👥</span> BẢNG ĐIỀU KHIỂN LIÊN MINH: <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.2)]">{team.name}</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              ALLIANCE DASHBOARD // COMBAT STATUS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/submissions"
              className="tech-btn-accent px-5 py-2 rounded-lg text-xs font-bold tracking-widest font-orbitron uppercase text-black"
            >
              📝 NỘP BÀI DỰ THI
            </Link>
            {!isLeader && (
              <button
                onClick={handleLeaveTeam}
                className="px-4 py-2 border border-red-500/30 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer transition"
              >
                🚪 RỜI ĐỘI
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Team Details & Members */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Team info */}
            <div className="tech-panel p-6 border-cyan-500/15 relative">
              <span className="text-[10px] font-orbitron font-bold text-cyan-500/30 tracking-widest absolute top-2 right-4">
                SECTOR // PROFILE
              </span>
              <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
                <span>📋</span> THÔNG TIN LIÊN MINH
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold block mb-1">Cuộc thi tham dự:</span>
                  <span className="text-slate-200 font-bold">{team.competitions?.title || 'Đang cập nhật...'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold block mb-1">Mô tả đội hình:</span>
                  <p className="text-slate-350 text-sm leading-relaxed">{team.description || 'Không có mô tả chi tiết cho chiến đội này.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1e2d5a]/40">
                  <div>
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold block">Sức chứa tối đa:</span>
                    <span className="text-slate-200 font-bold">{team.max_members} thành viên</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold block">Trạng thái tuyển quân:</span>
                    <span className={`font-bold ${team.is_open ? 'text-cyan-400' : 'text-red-450'}`}>
                      {team.is_open ? 'ĐANG MỞ ĐĂNG KÝ MỚI' : 'ĐÃ ĐÓNG TUYỂN DỤNG'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="tech-panel p-6 border-cyan-500/15 relative">
              <span className="text-[10px] font-orbitron font-bold text-cyan-500/30 tracking-widest absolute top-2 right-4">
                SECTOR // ROSTER
              </span>
              <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-1.5">
                <span>👥</span> THÀNH VIÊN LIÊN MINH ({members.length} / {team.max_members})
              </h2>
              <div className="space-y-4">
                {members.map((member) => (
                  <div 
                    key={member.user_id} 
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#0a1128]/50 border border-[#1e2d5a]/50 rounded-xl gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{member.profiles?.full_name || 'Vô danh'}</span>
                        {member.role === 'leader' && (
                          <span className="bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold font-orbitron uppercase">
                            Chỉ huy
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        Email: {member.profiles?.email || 'N/A'} • SĐT: {member.profiles?.phone || 'Chưa cập nhật'}
                      </div>
                      {member.profiles?.organization && (
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Đơn vị: {member.profiles.organization}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-orbitron font-semibold">
                      JOINED: {new Date(member.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Leader Controls (Invites & Requests) */}
          <div className="space-y-8">
            
            {/* Invite by UID Form */}
            {isLeader && (
              <div className="tech-panel p-6 border-cyan-500/15 relative">
                <span className="text-[10px] font-orbitron font-bold text-cyan-500/30 tracking-widest absolute top-2 right-4">
                  CONTROL // DISPATCH
                </span>
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
                  <span>✉</span> MỜI THÀNH VIÊN BẰNG UID
                </h2>
                
                {inviteMessage && (
                  <div className="text-xs font-semibold p-2.5 rounded bg-[#131e3d] border border-cyan-500/30 text-cyan-400 mb-4">
                    {inviteMessage}
                  </div>
                )}

                <form onSubmit={handleSendInvite} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">
                      NHẬP MÃ ĐẤU THỦ UID (8 KÝ TỰ)
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
                    className="w-full py-2 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer text-xs font-orbitron"
                  >
                    {inviteLoading ? '⏳ ĐANG GỬI...' : '⚡ GỬI LỜI MỜI'}
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
                          <span className="text-slate-500 text-[10px] font-orbitron">⌛ PENDING</span>
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
                <span className="text-[10px] font-orbitron font-bold text-cyan-500/30 tracking-widest absolute top-2 right-4">
                  CONTROL // APPROVALS
                </span>
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
                  <span>📥</span> ĐƠN XIN GIA NHẬP ({joinRequests.length})
                </h2>
                
                {joinRequests.length === 0 ? (
                  <p className="text-slate-500 text-xs font-medium text-center py-4">Chưa có đơn xin gia nhập nào.</p>
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
                            <p className="text-slate-350 text-[11px] leading-relaxed mt-2 bg-[#050814] p-2 rounded border border-[#1e2d5a]/30">
                              💬 {req.message}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={() => handleRequestAction(req.id, req.requester_id, 'accept')}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-400 text-[10px] font-bold uppercase rounded transition cursor-pointer"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, req.requester_id, 'reject')}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1 bg-red-950/20 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 text-[10px] font-bold uppercase rounded transition cursor-pointer"
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
                <span className="text-[10px] font-orbitron font-bold text-cyan-500/30 tracking-widest absolute top-2 right-4">
                  STATUS // INFO
                </span>
                <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
                  <span>🛡</span> QUYỀN TRUY CẬP
                </h2>
                <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                  <p>• Bạn hiện đang truy cập với vai trò **Thành viên**.</p>
                  <p>• Chỉ có **Chỉ huy (Leader)** mới có quyền mời thành viên hoặc duyệt các yêu cầu xin gia nhập.</p>
                  <p>• Bạn có thể nộp bài dự thi cho liên minh hoặc lựa chọn rời liên minh nếu muốn.</p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
