'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import { getPostLoginPath } from '@/lib/auth/routing'
import { updateProfile, uploadAvatar, validateFacebookUrl, validatePhone } from '@/services/profile'

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
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ phone: '', facebook_url: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)

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
      setProfileForm({
        phone: profileData.phone ?? '',
        facebook_url: profileData.facebook_url ?? '',
      })
      
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
        setMessage('❌ Bạn đã là thành viên của một liên minh khác.')
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
          setMessage('❌ Đội bóng này đã đạt số lượng tối đa.')
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
        setMessage(`❌ Lỗi thêm thành viên: ${memberError.message}`)
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
        setMessage(`❌ Thao tác thất bại: ${error.message}`)
      } else {
        setMessage('✅ Đã từ chối lời mời gia nhập.')
        // Reload invites
        setInvites(prev => prev.filter(inv => inv.id !== invite.id))
      }
    }
    setActionLoading(null)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    const fbErr = validateFacebookUrl(profileForm.facebook_url)
    if (fbErr) { setMessage('❌ ' + fbErr); return }
    const phoneErr = validatePhone(profileForm.phone)
    if (phoneErr) { setMessage('❌ ' + phoneErr); return }

    setProfileSaving(true)
    setMessage('')

    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      const upload = await uploadAvatar(user.id, avatarFile)
      if (!upload.ok) {
        setMessage('❌ ' + upload.error)
        setProfileSaving(false)
        return
      }
      avatarUrl = upload.url
    }

    const result = await updateProfile(user.id, {
      phone: profileForm.phone.trim() || null,
      facebook_url: profileForm.facebook_url.trim() || null,
      avatar_url: avatarUrl,
    })

    if (!result.ok) {
      setMessage('❌ ' + result.error)
    } else {
      setMessage('✅ Đã cập nhật hồ sơ!')
      setEditingProfile(false)
      setAvatarFile(null)
      await loadDashboardData()
    }
    setProfileSaving(false)
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
              <span className="text-cyan-400 animate-pulse">⚙️</span> BẢNG ĐIỀU KHIỂN ĐẤU THỦ
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
            <span className="w-2 h-2 rounded-full bg-emerald-405 animate-ping" />
            HỆ THỐNG HOẠT ĐỘNG
          </div>
        </div>

        {/* Duplicate Team Warning Banner */}
        {duplicateTeams.length > 1 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-5 mb-8 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <h2 className="font-orbitron text-sm font-bold text-amber-400 uppercase tracking-wider">Phát hiện bạn đang ở nhiều đội cùng lúc</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Hệ thống phát hiện bạn đang là thành viên của {duplicateTeams.length} đội. Vui lòng chọn 1 đội để giữ lại. Các đội khác sẽ bị xóa khỏi danh sách thành viên của bạn.
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
                    className="px-4 py-2 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer disabled:opacity-50 font-orbitron"
                  >
                    {resolvingTeam === m.team_id ? '⏳ Đang xử lý...' : 'GIỮ ĐỘI NÀY'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-8 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        {/* Profile Card */}
        <div className="tech-panel p-6 mb-8 relative cyber-corners border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
              <span>📋</span> THÔNG TIN HỒ SƠ
            </h2>
            <div className="flex items-center gap-3">
              {profile?.uid && (
                <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg px-4 py-2 flex items-center gap-3">
                  <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">UID:</span>
                  <span className="font-mono text-sm font-black text-white bg-slate-950 px-2.5 py-1 rounded border border-cyan-400/40 select-all">{profile.uid}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setEditingProfile((v) => !v)}
                className="text-xs font-orbitron border border-cyan-500/30 text-cyan-400 px-3 py-2 rounded-lg hover:bg-cyan-950/30"
              >
                {editingProfile ? 'Huỷ' : '✏️ Cập nhật'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-6 mb-6">
            <div className="shrink-0 w-20 h-20 rounded-full border-2 border-cyan-500/30 bg-[#131e3d] overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-slate-500">👤</span>
              )}
            </div>
            {profile?.facebook_url && !editingProfile && (
              <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline mt-2">
                Facebook →
              </a>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Số điện thoại</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="09xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Facebook URL</label>
                  <input
                    value={profileForm.facebook_url}
                    onChange={(e) => setProfileForm((p) => ({ ...p, facebook_url: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Avatar (JPEG/PNG/WebP, max 2MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  className="text-xs text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="tech-btn-accent px-6 py-2 rounded-lg text-xs font-bold uppercase text-black disabled:opacity-50"
              >
                {profileSaving ? 'Đang lưu...' : '💾 Lưu hồ sơ'}
              </button>
            </form>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold">
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Họ và tên:</span>
              <span className="text-white">{profile?.full_name}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Địa chỉ Email:</span>
              <span className="text-white">{profile?.email}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Số điện thoại:</span>
              <span className="text-white">{profile?.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Facebook:</span>
              <span className="text-white truncate max-w-[200px]">{profile?.facebook_url || 'Chưa cập nhật'}</span>
            </div>
            <div className="bg-[#131e3d]/40 border border-[#1e2d5a]/60 px-4 py-3 rounded-lg flex items-center justify-between md:col-span-2">
              <span className="text-slate-400 text-xs tracking-wider uppercase">Đơn vị công tác:</span>
              <span className="text-white">{profile?.organization || 'Chưa cập nhật'}</span>
            </div>
          </div>
          )}
        </div>

        {/* Dynamic CTA Sections for Team Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="tech-panel p-6 border-cyan-500/15 relative flex flex-col justify-between">
            <div>
              <h3 className="font-orbitron text-base font-bold text-white tracking-wider uppercase mb-2">
                ➕ THÀNH LẬP LIÊN MINH MỚI
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Trở thành Chỉ huy, thiết lập chiến đội và kêu gọi những đấu thủ số khác gia nhập liên minh của bạn.
              </p>
            </div>
            <Link
              href="/team/create"
              className="tech-btn-accent font-orbitron inline-block py-3 rounded-lg text-xs font-bold tracking-widest text-center uppercase text-black hover:scale-[1.02] transition"
            >
              TẠO ĐỘI NGAY
            </Link>
          </div>

          <div className="tech-panel p-6 border-cyan-500/15 relative flex flex-col justify-between">
            <div>
              <h3 className="font-orbitron text-base font-bold text-white tracking-wider uppercase mb-2">
                🔎 GIA NHẬP ĐỘI NGŨ CÓ SẴN
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Tìm kiếm các liên minh chiến đấu đang mở đợt tuyển quân và nộp đơn xin gia nhập.
              </p>
            </div>
            <Link
              href="/team/browse"
              className="tech-btn-primary font-orbitron inline-block py-3 rounded-lg text-xs font-bold tracking-widest text-center uppercase text-white hover:scale-[1.02] transition"
            >
              TÌM ĐỘI NGŨ
            </Link>
          </div>
        </div>

        {/* Pending Invitations list */}
        {invites.length > 0 && (
          <div className="tech-panel p-6 mb-8 border-cyan-500/15 relative">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
              <span>📥</span> LỜI MỜI GIA NHẬP ĐANG CHỜ ({invites.length})
            </h2>
            <div className="space-y-4">
              {invites.map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-cyan-950/20 border border-cyan-500/25 rounded-xl gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      Lời mời gia nhập liên minh <span className="text-cyan-400">{invite.teams?.name}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Gửi bởi Chỉ huy: <span className="text-slate-300 font-semibold">{invite.inviter?.full_name || 'Vô danh'}</span> • Ngày mời: {new Date(invite.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex gap-2.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleInviteAction(invite, 'accept')}
                      disabled={actionLoading === invite.id}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-50 cursor-pointer font-orbitron"
                    >
                      {actionLoading === invite.id ? '⌛ ĐANG XỬ LÝ...' : 'ĐỒNG Ý'}
                    </button>
                    <button
                      onClick={() => handleInviteAction(invite, 'reject')}
                      disabled={actionLoading === invite.id}
                      className="px-4 py-2 border border-slate-700 hover:bg-slate-900/60 text-slate-350 text-xs font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-50 cursor-pointer font-orbitron"
                    >
                      TỪ CHỐI
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
            <span>🏆</span> PHÂN KHU ĐẤU TRƯỜNG ARENA
          </h2>
          {competitions.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm font-semibold">Hiện chưa có cuộc thi nào được kích hoạt trên hệ thống.</p>
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
                      className="tech-btn-primary px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest font-orbitron uppercase transition whitespace-nowrap self-end md:self-center"
                    >
                      XEM CHI TIẾT →
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