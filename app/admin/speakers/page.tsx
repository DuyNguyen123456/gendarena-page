'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

type Speaker = {
  id: string
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  avatar_url: string | null
  linkedin_url: string | null
  display_order: number
  category: 'speaker' | 'judge' | 'mentor'
  is_featured: boolean
}

const EMPTY_FORM: Omit<Speaker, 'id'> = {
  name: '',
  title: '',
  organization: '',
  bio: '',
  avatar_url: '',
  linkedin_url: '',
  display_order: 0,
  category: 'speaker',
  is_featured: true,
}

const CATEGORIES: Speaker['category'][] = ['speaker', 'judge', 'mentor']
const CATEGORY_LABELS: Record<Speaker['category'], string> = {
  speaker: 'Diễn giả',
  judge: 'Giám khảo',
  mentor: 'Cố vấn',
}

export default function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Speaker, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const loadSpeakers = async () => {
    const { data } = await supabase
      .from('speakers')
      .select('*')
      .order('display_order', { ascending: true })
    if (data) setSpeakers(data as Speaker[])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
      if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
      await loadSpeakers()
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Vui lòng nhập tên.'); return }
    setSaving(true)
    setError('')

    if (editId) {
      const { error: updateError } = await supabase.from('speakers').update(form).eq('id', editId)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase.from('speakers').insert(form)
      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
    await loadSpeakers()
  }

  const handleEdit = (s: Speaker) => {
    const { id, ...rest } = s
    setEditId(id)
    setForm(rest)
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa diễn giả "${name}"?`)) return
    await supabase.from('speakers').delete().eq('id', id)
    await loadSpeakers()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  if (loading) return <Loading text="LOADING SPEAKER DATABASE" />

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4 relative scanline-container">
      <div className="absolute top-10 left-10 w-80 h-80 bg-[#112E81]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-red-400 hover:text-red-300 uppercase mb-8 transition">
          ← QUAY LẠI CONTROL CENTER
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl font-extrabold tracking-wider text-white uppercase">
              🎤 QUẢN LÝ DIỄN GIẢ & GIÁM KHẢO
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              SPEAKERS PANEL // ADMIN CONTROL
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="tech-btn-accent px-5 py-2.5 rounded-lg text-xs font-bold tracking-widest font-orbitron uppercase text-black cursor-pointer"
            >
              + THÊM MỚI
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="tech-panel p-6 mb-8 border-cyan-500/20">
            <h2 className="font-orbitron text-sm font-bold text-cyan-400 tracking-widest uppercase mb-5">
              {editId ? '✏️ CHỈNH SỬA DIỄN GIẢ' : '➕ THÊM DIỄN GIẢ MỚI'}
            </h2>
            {error && <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Họ và tên *</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} required
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition" />
              </div>
              {/* Category */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Vai trò</label>
                <select value={form.category} onChange={e => setField('category', e.target.value as Speaker['category'])}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Chức danh</label>
                <input value={form.title ?? ''} onChange={e => setField('title', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition" />
              </div>
              {/* Organization */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Tổ chức / Công ty</label>
                <input value={form.organization ?? ''} onChange={e => setField('organization', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition" />
              </div>
              {/* Avatar URL */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">URL Ảnh đại diện</label>
                <input value={form.avatar_url ?? ''} onChange={e => setField('avatar_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition" />
              </div>
              {/* LinkedIn */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">URL LinkedIn</label>
                <input value={form.linkedin_url ?? ''} onChange={e => setField('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition" />
              </div>
              {/* Display Order */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Thứ tự hiển thị</label>
                <input type="number" value={form.display_order} onChange={e => setField('display_order', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition" />
              </div>
              {/* Featured toggle */}
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_featured} onChange={e => setField('is_featured', e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 relative"></div>
                  <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Hiển thị trên trang chủ</span>
                </label>
              </div>
              {/* Bio */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Giới thiệu ngắn</label>
                <textarea value={form.bio ?? ''} onChange={e => setField('bio', e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition resize-none" />
              </div>
              {/* Actions */}
              <div className="md:col-span-2 flex gap-4 pt-2">
                <button type="submit" disabled={saving}
                  className="tech-btn-accent px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider font-orbitron uppercase text-black cursor-pointer disabled:opacity-50">
                  {saving ? '⏳ ĐANG LƯU...' : editId ? '✅ CẬP NHẬT' : '✅ THÊM MỚI'}
                </button>
                <button type="button" onClick={handleCancel}
                  className="px-6 py-2.5 border border-[#1e2d5a] hover:bg-slate-900/60 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition">
                  HỦY
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Speakers List */}
        <div className="space-y-4">
          {speakers.length === 0 ? (
            <div className="tech-panel p-12 text-center border-cyan-500/10">
              <p className="text-slate-500 text-sm font-semibold">Chưa có diễn giả nào được thêm vào hệ thống.</p>
            </div>
          ) : (
            speakers.map((s) => (
              <div key={s.id} className="tech-panel border-cyan-500/15 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar preview */}
                  <div className="w-12 h-12 rounded-full border border-[#1e2d5a] bg-[#0a1025] flex items-center justify-center shrink-0 overflow-hidden">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-orbitron text-base font-bold text-cyan-400">{s.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {s.name}
                      <span className={`text-[10px] font-orbitron font-bold px-1.5 py-0.5 rounded border ${
                        s.category === 'judge' ? 'text-amber-400 bg-amber-950/30 border-amber-500/30' :
                        s.category === 'mentor' ? 'text-purple-400 bg-purple-950/30 border-purple-500/30' :
                        'text-cyan-400 bg-cyan-950/30 border-cyan-500/30'
                      }`}>
                        {CATEGORY_LABELS[s.category]}
                      </span>
                      {!s.is_featured && <span className="text-[10px] text-slate-500 font-orbitron border border-slate-600/30 px-1.5 py-0.5 rounded">ẨN</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{s.title}{s.organization ? ` • ${s.organization}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(s)}
                    className="px-3 py-1.5 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-500 hover:text-black text-cyan-400 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition">
                    SỬA
                  </button>
                  <button onClick={() => handleDelete(s.id, s.name)}
                    className="px-3 py-1.5 border border-red-500/30 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition">
                    XÓA
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
