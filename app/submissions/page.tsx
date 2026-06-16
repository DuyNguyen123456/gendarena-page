'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Team = {
  id: string
  name: string
  competition_id: string
}

type Submission = {
  id: string
  team_id: string
  competition_id: string
  title: string
  description: string
  pitch_deck_url: string | null
  video_url: string | null
  prototype_url: string | null
  status: string
  submitted_at: string
  teams?: { name: string } | null
}

export default function SubmissionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadSubmissions = useCallback(async (teams: Team[]) => {
    if (teams.length === 0) return
    const teamIds = teams.map((t) => t.id)
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, teams(name)')
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })
    setSubmissions(subs || [])
  }, [supabase])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      type TeamMemberRecord = {
        team_id: string
        teams: Team[] | null
      }

      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name, competition_id)')
        .eq('user_id', user.id) as { data: TeamMemberRecord[] | null }

      const teams = (memberData ?? [])
        .flatMap((m) => m.teams ?? [])
      setMyTeams(teams)
      await loadSubmissions(teams)
      setLoading(false)
    }
    loadData()
  }, [loadSubmissions, router, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const team = myTeams.find(t => t.id === selectedTeam)

    const userId = user?.id
    if (!userId) {
      setMessage('❌ Người dùng chưa đăng nhập')
      setSubmitLoading(false)
      return
    }

    let pitchDeckUrl = ''
    const pitchFile = formData.get('pitchDeck') as File
    if (pitchFile && pitchFile.size > 0) {
      const fileName = `${userId}/${Date.now()}_${pitchFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, pitchFile)

      if (uploadError) {
        setMessage('❌ Upload lỗi: ' + uploadError.message)
        setSubmitLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName)
      pitchDeckUrl = publicUrl
    }

    const { error } = await supabase
      .from('submissions')
      .insert({
        team_id: selectedTeam,
        competition_id: team?.competition_id,
        title: formData.get('title'),
        description: formData.get('description'),
        pitch_deck_url: pitchDeckUrl,
        video_url: formData.get('videoUrl'),
        prototype_url: formData.get('prototypeUrl'),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })

    if (error) {
      setMessage('❌ Lỗi: ' + error.message)
    } else {
      setMessage('✅ Nộp bài thành công!')
      setShowForm(false)
      await loadSubmissions(myTeams)
    }
    setSubmitLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center font-orbitron tracking-widest">
      <p className="animate-pulse">⏳ LOADING SYSTEMS...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">

        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors uppercase mb-8"
        >
          ← QUAY LẠI PILOT CONSOLE
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              📝 HỒ SƠ BẢN VẼ DỰ ÁN
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              BLUEPRINT DOSSIERS // PROJECT ARCHIVES
            </p>
          </div>
          {myTeams.length > 0 && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="tech-btn-accent font-orbitron px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase cursor-pointer"
            >
              {showForm ? '✕ ĐÓNG FORM' : '+ NỘP BẢN VẼ MỚI'}
            </button>
          )}
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        {myTeams.length === 0 && (
          <div className="tech-panel p-8 text-center relative cyber-corners border-amber-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] text-white">
            <div className="text-5xl mb-4 inline-block bg-amber-950/20 border border-amber-800/30 p-4 rounded-full text-amber-450">👥</div>
            <h3 className="font-orbitron text-lg font-bold mb-2 uppercase tracking-wider text-amber-450">CHƯA GIA NHẬP LIÊN MINH</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Bạn cần phải thành lập hoặc gia nhập một đội thi (Liên minh) trước khi có thể nộp bản vẽ kỹ thuật lên hệ thống.
            </p>
            <Link href="/dashboard" className="tech-btn-accent font-orbitron inline-block px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase text-black">
              XEM CÁC CUỘC THI
            </Link>
          </div>
        )}

        {showForm && (
          <div className="tech-panel p-6 mb-8 border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-5 flex items-center gap-2">
              <span>📤</span> KHAI BÁO THÔNG TIN DỰ ÁN
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-350 mb-1.5">Chọn Liên Minh Nộp Bài *</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                >
                  <option value="" className="bg-[#050814]">-- Chọn đội --</option>
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id} className="bg-[#050814]">{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-355 mb-1.5">Tên bản thiết kế dự án *</label>
                <input 
                  name="title" 
                  required 
                  placeholder="VD: Cybernetic Excavator - Robot xúc tự động"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-355 mb-1.5">Mô tả giải pháp kĩ thuật *</label>
                <textarea 
                  name="description" 
                  required 
                  rows={4} 
                  placeholder="Mô tả chi tiết ý tưởng, thuật toán điều khiển, thông số cơ khí, vấn đề giải quyết..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-355 mb-1.5">📄 Bản vẽ thiết kế Pitch Deck (PDF, PPTX) *</label>
                <input 
                  name="pitchDeck" 
                  type="file" 
                  accept=".pdf,.pptx,.ppt"
                  className="w-full px-4 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-400 transition file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-400 hover:file:bg-cyan-900" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-355 mb-1.5">🎥 Link Video Thuyết Trình Mô Phỏng</label>
                <input 
                  name="videoUrl" 
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition" 
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-355 mb-1.5">🔗 Link Mã Nguồn / Bản Demo / Prototype</label>
                <input 
                  name="prototypeUrl" 
                  placeholder="https://github.com/... hoặc https://..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition" 
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="submit" 
                  disabled={submitLoading}
                  className="tech-btn-accent font-orbitron px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer text-black"
                >
                  {submitLoading ? '⏳ ĐANG TẢI LÊN...' : '📤 PHÁT HÀNH BẢN VẼ'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-[#1e2d5a] bg-transparent hover:bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer transition"
                >
                  HUỶ
                </button>
              </div>

            </form>
          </div>
        )}

        {submissions.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
              <span>📋</span> DANH SÁCH BẢN THIẾT KẾ ĐÃ PHÁT HÀNH
            </h2>
            {submissions.map((sub) => (
              <div key={sub.id} className="tech-panel-glow border-cyan-500/15 p-6 rounded-xl relative hover:border-cyan-400/30 transition">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2.5 flex-1">
                    <h3 className="font-orbitron text-lg font-bold text-white tracking-wide uppercase">{sub.title}</h3>
                    <div className="text-xs text-slate-400 font-semibold tracking-wider bg-[#131e3d]/60 border border-[#1e2d5a]/60 px-3 py-1 rounded inline-block">
                      LIÊN MINH: {sub.teams?.name}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{sub.description}</p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs font-bold tracking-wider font-orbitron uppercase">
                      {sub.pitch_deck_url && (
                        <a 
                          href={sub.pitch_deck_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                        >
                          📄 PITCH DECK
                        </a>
                      )}
                      {sub.video_url && (
                        <a 
                          href={sub.video_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                        >
                          🎥 VIDEO DEMO
                        </a>
                      )}
                      {sub.prototype_url && (
                        <a 
                          href={sub.prototype_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-[#131e3d] border border-[#1e2d5a] hover:border-cyan-400 text-cyan-400 hover:text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                        >
                          🔗 PROTOTYPE
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-450 px-3 py-1 rounded-full text-xs font-extrabold tracking-widest font-orbitron uppercase flex items-center gap-1.5 self-start whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse" />
                    SUBMITTED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}