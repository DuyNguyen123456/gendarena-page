'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

type Team = {
  id: string
  name: string
  description: string | null
  max_members: number
  is_open: boolean
  leader_id: string
  competition_id: string
  leader?: {
    full_name: string
  } | null
  competitions?: {
    title: string
  } | null
  team_members?: {
    user_id: string
  }[]
}

type JoinRequest = {
  team_id: string
  status: string
}

export default function BrowseTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [myRequests, setMyRequests] = useState<Record<string, string>>({}) // team_id -> status
  const [userHasTeam, setUserHasTeam] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // teamId currently requesting
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<any>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Check if user already has a team
      const { data: memberRecord } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberRecord) {
        setUserHasTeam(true)
      }

      // Fetch pending requests of the user
      const { data: requests } = await supabase
        .from('team_join_requests')
        .select('team_id, status')
        .eq('requester_id', user.id)

      if (requests) {
        const reqMap: Record<string, string> = {}
        requests.forEach(r => {
          reqMap[r.team_id] = r.status
        })
        setMyRequests(reqMap)
      }

      // Fetch open teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, name, description, max_members, is_open, leader_id, competition_id,
          leader:profiles!leader_id(full_name),
          competitions(title),
          team_members(user_id)
        `)
        .eq('is_open', true)

      if (teamsError) {
        console.error('Fetch teams error:', teamsError)
      } else if (teamsData) {
        // Filter out teams that are already full on client side
        const availableTeams = (teamsData as unknown as Team[]).filter(t => {
          const count = t.team_members?.length || 0
          return count < t.max_members
        })
        setTeams(availableTeams)
      }

      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  const handleJoinRequest = async (teamId: string) => {
    if (userHasTeam) {
      setMessage('❌ Bạn đã là thành viên của một đội thi khác.')
      return
    }

    setActionLoading(teamId)
    setMessage('')

    const { error } = await supabase
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        requester_id: user.id,
        status: 'pending'
      })

    if (error) {
      console.error('Gửi yêu cầu thất bại:', error)
      setMessage(`❌ Lỗi: ${error.message}`)
      setActionLoading(null)
      return
    }

    // Success
    setMyRequests(prev => ({ ...prev, [teamId]: 'pending' }))
    setMessage('✅ Gửi yêu cầu gia nhập liên minh thành công! Đang chờ leader duyệt.')
    setActionLoading(null)
  }

  if (loading) return <Loading text="Đang tải dữ liệu..." />

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

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#1e2d5a] pb-6 gap-4">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              <span>🌐</span> LIÊN MINH ĐANG TUYỂN MỘ
            </h1>
          </div>
          {userHasTeam && (
            <div className="flex items-center gap-2 text-xs font-orbitron bg-emerald-950/30 border border-emerald-500/30 px-4 py-2 rounded-lg text-emerald-450 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
              ✓ BẠN ĐÃ CÓ ĐỘI THI
            </div>
          )}
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-8 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="tech-panel p-12 text-center border-cyan-500/10">
            <p className="text-slate-500 text-sm font-semibold tracking-wide">
              Hiện tại không có liên minh nào đang mở tuyển thành viên.
            </p>
            <div className="mt-6">
              <Link
                href="/team/create"
                className="tech-btn-accent px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest font-orbitron uppercase text-black"
              >
                ➕ TỰ TẠO LIÊN MINH MỚI
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => {
              const currentMembers = team.team_members?.length || 0
              const requestStatus = myRequests[team.id]

              return (
                <div 
                  key={team.id} 
                  className="tech-panel-glow border-cyan-500/15 hover:border-cyan-400/40 p-6 rounded-xl flex flex-col justify-between transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-orbitron font-bold text-cyan-500/60 uppercase tracking-widest block mb-1">
                          {team.competitions?.title || 'ĐẤU TRƯỜNG ARENA'}
                        </span>
                        <h3 className="font-orbitron text-lg font-bold text-white tracking-wider uppercase">
                          {team.name}
                        </h3>
                      </div>
                      <span className="text-xs font-orbitron font-bold bg-[#131e3d] border border-[#1e2d5a] px-2.5 py-1 rounded-md text-cyan-400 shrink-0">
                        👥 {currentMembers} / {team.max_members}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 min-h-[48px]">
                      {team.description || 'Không có mô tả chi tiết cho đội hình này.'}
                    </p>

                    {/* Leader info */}
                    <div className="border-t border-[#1e2d5a]/60 pt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Chỉ huy (Leader):</span>
                      <span className="text-slate-200 font-bold">{team.leader?.full_name || 'Vô danh'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-3 border-t border-[#1e2d5a]/40 flex justify-end">
                    {userHasTeam ? (
                      <button
                        disabled
                        className="px-4 py-2 border border-slate-700 bg-slate-900/40 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed font-orbitron"
                      >
                        ĐÃ CÓ ĐỘI THI
                      </button>
                    ) : requestStatus === 'pending' ? (
                      <button
                        disabled
                        className="px-4 py-2 border border-cyan-800/40 bg-cyan-950/20 text-cyan-500/60 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed font-orbitron animate-pulse"
                      >
                        ⌛ ĐANG CHỜ DUYỆT...
                      </button>
                    ) : requestStatus === 'accepted' ? (
                      <button
                        disabled
                        className="px-4 py-2 border border-emerald-550/40 bg-emerald-950/20 text-emerald-450 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed font-orbitron"
                      >
                        ✓ ĐÃ GIA NHẬP
                      </button>
                    ) : requestStatus === 'rejected' ? (
                      <button
                        disabled
                        className="px-4 py-2 border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg cursor-not-allowed font-orbitron"
                      >
                        ❌ BỊ TỪ CHỐI
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinRequest(team.id)}
                        disabled={actionLoading === team.id}
                        className="tech-btn-primary px-4 py-2 rounded-lg text-xs font-bold tracking-widest font-orbitron uppercase transition whitespace-nowrap cursor-pointer text-white hover:scale-105 active:scale-95"
                      >
                        {actionLoading === team.id ? '⏳ ĐANG GỬI...' : '⚡ XIN GIA NHẬP'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
