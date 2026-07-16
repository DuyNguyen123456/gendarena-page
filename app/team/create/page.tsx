'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

type Competition = {
  id: string
  title: string
}

function CreateTeamForm() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompId, setSelectedCompId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(5)
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch competitions
      const { data: comps, error: compsError } = await supabase
        .from('competitions')
        .select('id, title')
        .order('created_at', { ascending: false })

      if (comps) {
        setCompetitions(comps)
        const paramId = searchParams.get('competitionId')
        if (paramId && comps.some(c => c.id === paramId)) {
          setSelectedCompId(paramId)
        } else if (comps.length > 0) {
          setSelectedCompId(comps[0].id)
        }
      }
      setLoading(false)
    }
    init()
  }, [router, searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) {
      setError('Vui lòng nhập tên liên minh / đội.')
      return
    }
    if (!selectedCompId) {
      setError('Vui lòng chọn phân khu đấu trường.')
      return
    }

    setSubmitLoading(true)
    setError('')

    // INSERT teams only. trigger_sync_leader on teams will auto-insert into team_members.
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description.trim(),
        competition_id: selectedCompId,
        leader_id: user.id,
        max_members: maxMembers,
        is_open: isOpen,
      })
      .select()
      .single()

    if (teamError) {
      console.error('Tạo đội thất bại:', teamError)
      setError(`Lỗi: ${teamError.message}`)
      setSubmitLoading(false)
      return
    }

    // Success -> redirect to team dashboard
    router.push('/team/dashboard')
    router.refresh()
  }

  if (loading) return <Loading text="Đang tải dữ liệu..." />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="tech-panel-glow p-8 max-w-lg w-full relative cyber-corners border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
        


        <h2 className="font-orbitron text-2xl font-extrabold text-center text-white mb-1 uppercase tracking-wider">
          👥 THÀNH LẬP LIÊN MINH
        </h2>
        <p className="text-slate-400 text-xs font-medium text-center tracking-widest uppercase mb-8">
          Khởi tạo chiến đội để bắt đầu tham chiến
        </p>

        {error && (
          <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            ❌ HỆ THỐNG BÁO LỖI: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-350 mb-1.5">
              CHỌN CUỘC THI / ĐẤU TRƯỜNG *
            </label>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            >
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id} className="bg-slate-950 text-white">
                  {comp.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-350 mb-1.5">
              TÊN LIÊN MINH / CHIẾN ĐỘI *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cybernetic Innovators"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-650 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-350 mb-1.5">
              MÔ TẢ CHIẾN ĐỘI
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả mục tiêu của đội hoặc các kỹ năng đang tìm kiếm..."
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-650 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-slate-350 mb-1.5">
                SỐ THÀNH VIÊN TỐI ĐA
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-slate-350 mb-1.5">
                TRẠNG THÁI TUYỂN
              </label>
              <div className="flex items-center h-11">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  <span className="ml-3 text-xs font-bold tracking-widest text-slate-300 uppercase">
                    {isOpen ? 'ĐANG MỞ' : 'ĐANG KHÓA'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={submitLoading}
              className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black border border-cyan-400/30 font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.2)] disabled:opacity-50 transition duration-200 cursor-pointer text-sm font-orbitron"
            >
              {submitLoading ? '⏳ ĐANG XỬ LÝ...' : 'TẠO CHIẾN ĐỘI'}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3.5 border border-[#1e2d5a] hover:bg-slate-900/60 text-slate-300 text-sm font-bold uppercase tracking-wider rounded-lg cursor-pointer transition text-center flex items-center justify-center font-orbitron"
            >
              HỦY LỆNH
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CreateTeamPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateTeamForm />
    </Suspense>
  )
}
