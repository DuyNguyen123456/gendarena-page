'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

type Competition = {
  id: string
  title: string
  description: string
  rules?: string | null
  prizes?: string | null
  status: string
  registration_start?: string | null
  registration_end?: string | null
  submission_start?: string | null
  submission_end?: string | null
  max_team_size?: number | null
  created_at?: string | null
}

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadCompetitions = useCallback(async () => {
    const { data } = await supabase
      .from('competitions').select('*').order('created_at', { ascending: false })
    setCompetitions(data || [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string }>()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await loadCompetitions()
      setLoading(false)
    }
    init()
  }, [router, supabase, loadCompetitions])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const payload = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      rules: formData.get('rules') as string,
      prizes: formData.get('prizes') as string,
      status: formData.get('status') as string,
      registration_start: (formData.get('registration_start') as string) || null,
      registration_end: (formData.get('registration_end') as string) || null,
      submission_start: (formData.get('submission_start') as string) || null,
      submission_end: (formData.get('submission_end') as string) || null,
      max_team_size: parseInt(formData.get('max_team_size') as string) || 5,
    }

    const { error } = editingId
      ? await supabase.from('competitions').update(payload as never).eq('id', editingId)
      : await supabase.from('competitions').insert(payload as never)

    if (error) {
      setMessage('❌ Lỗi: ' + error.message)
    } else {
      setMessage(editingId ? '✅ Cập nhật thành công!' : '✅ Tạo cuộc thi thành công!')
      setShowForm(false)
      setEditingId(null)
      await loadCompetitions()
    }
    setSubmitLoading(false)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xoá cuộc thi "${title}"? Hành động này không thể hoàn tác.`)) return
    const { error } = await supabase.from('competitions').delete().eq('id', id)
    if (error) setMessage('❌ Lỗi: ' + error.message)
    else { setMessage('✅ Đã xoá'); await loadCompetitions() }
  }

  const handleEdit = (comp: Competition) => {
    setEditingId(comp.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editingComp = competitions.find(c => c.id === editingId)

  const formatDateTimeLocal = (iso?: string | null) => {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 16)
  }

  if (loading) return <Loading text="LOADING COMPETITION DATABASE" />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors uppercase mb-8"
        >
          ← QUAY LẠI PANEL ADMIN
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              🏆 QUẢN LÝ PHÂN KHU ĐẤU TRƯỜNG
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              ARENA CONFIGURATION PANEL // SECURE ACCESS
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null) }}
              className="tech-btn-accent font-orbitron px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase cursor-pointer"
            >
              + THIẾT LẬP ĐẤU TRƯỜNG MỚI
            </button>
          )}
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        {showForm && (
          <div className="tech-panel p-6 mb-8 border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-6 flex items-center gap-2">
              <span>{editingId ? '✏️' : '➕'}</span> {editingId ? 'HIỆU CHỈNH THÔNG SỐ ĐẤU TRƯỜNG' : 'THIẾT LẬP THÔNG SỐ ĐẤU TRƯỜNG MỚI'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Tên đấu trường / cuộc thi *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingComp?.title || ''}
                  placeholder="VD: GenD Arena Robot Championship"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Mô tả ngắn gọn *</label>
                <textarea
                  name="description"
                  required
                  rows={2}
                  defaultValue={editingComp?.description || ''}
                  placeholder="Mô tả tóm tắt nội dung thi đấu..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Thể lệ thi đấu chi tiết</label>
                  <textarea
                    name="rules"
                    rows={5}
                    defaultValue={editingComp?.rules || ''}
                    placeholder="Các quy định và luật chơi trên sàn đấu..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Cơ cấu giải thưởng</label>
                  <textarea
                    name="prizes"
                    rows={5}
                    defaultValue={editingComp?.prizes || ''}
                    placeholder="Danh sách phần thưởng cho các thứ hạng..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Trạng thái hệ thống</label>
                  <select
                    name="status"
                    defaultValue={editingComp?.status || 'upcoming'}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  >
                    <option value="upcoming" className="bg-[#050814]">Sắp diễn ra (UPCOMING)</option>
                    <option value="registration" className="bg-[#050814]">Mở đăng ký (REGISTRATION)</option>
                    <option value="submission" className="bg-[#050814]">Đang nộp bài (SUBMISSION)</option>
                    <option value="judging" className="bg-[#050814]">Đang chấm điểm (JUDGING)</option>
                    <option value="completed" className="bg-[#050814]">Đã kết thúc (COMPLETED)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Số thành viên tối đa / liên minh</label>
                  <input
                    name="max_team_size"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={editingComp?.max_team_size || 5}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Mở cổng đăng ký</label>
                  <input
                    name="registration_start"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(editingComp?.registration_start)}
                    className="w-full px-4 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Đóng cổng đăng ký</label>
                  <input
                    name="registration_end"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(editingComp?.registration_end)}
                    className="w-full px-4 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Bắt đầu nộp bài dự thi</label>
                  <input
                    name="submission_start"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(editingComp?.submission_start)}
                    className="w-full px-4 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">Thời hạn nộp bài cuối cùng</label>
                  <input
                    name="submission_end"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(editingComp?.submission_end)}
                    className="w-full px-4 py-2 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="tech-btn-accent font-orbitron px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer text-black"
                >
                  {submitLoading ? '⏳ ĐANG LƯU THÔNG SỐ...' : (editingId ? '💾 LƯU THAY ĐỔI' : '➕ TẠO PHÂN KHU')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null) }}
                  className="px-6 py-2.5 border border-[#1e2d5a] bg-transparent hover:bg-slate-900/60 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer transition"
                >
                  HUỶ
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-orbitron text-sm font-bold tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-1.5">
            <span>📋</span> DANH SÁCH CÁC PHÂN KHU ĐẤU TRƯỜNG HÀNH TRÌNH
          </h2>
          {competitions.length === 0 ? (
            <div className="tech-panel p-8 text-center relative border-cyan-500/20 text-slate-400 text-sm font-semibold">
              Chưa cấu hình đấu trường nào. Click nút bên trên để tạo.
            </div>
          ) : (
            competitions.map((comp) => (
              <div key={comp.id} className="tech-panel-glow border-cyan-500/15 p-5 rounded-xl relative hover:border-cyan-400/40 transition duration-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-orbitron text-lg font-bold text-white tracking-wide uppercase">{comp.title}</h3>
                      <span className="bg-[#131e3d] border border-[#1e2d5a] text-cyan-400 px-2.5 py-0.5 rounded-full text-xs font-bold font-orbitron uppercase">
                        {comp.status?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">{comp.description}</p>
                  </div>
                  <div className="flex gap-2.5 self-end sm:self-center">
                    <button
                      onClick={() => handleEdit(comp)}
                      className="px-4 py-2 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-500 hover:text-black text-cyan-400 text-xs font-bold tracking-wider uppercase rounded-lg cursor-pointer transition"
                    >
                      ✏️ SỬA
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id, comp.title)}
                      className="px-4 py-2 border border-red-500/30 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-bold tracking-wider uppercase rounded-lg cursor-pointer transition"
                    >
                      🗑️ XOÁ
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}