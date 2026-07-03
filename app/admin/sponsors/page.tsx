'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'

type Sponsor = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  tier: 'platinum' | 'gold' | 'silver' | 'partner'
  display_order: number
  is_active: boolean
}

const EMPTY_FORM: Omit<Sponsor, 'id'> = {
  name: '',
  logo_url: '',
  website_url: '',
  tier: 'partner',
  display_order: 0,
  is_active: true,
}

const TIERS: Sponsor['tier'][] = ['platinum', 'gold', 'silver', 'partner']
const TIER_LABELS: Record<Sponsor['tier'], string> = {
  platinum: '💎 Platinum',
  gold: '🥇 Gold',
  silver: '🥈 Silver',
  partner: '🤝 Partner',
}
const TIER_COLORS: Record<Sponsor['tier'], string> = {
  platinum: 'text-slate-300 bg-slate-800/30 border-slate-400/30',
  gold: 'text-amber-400 bg-amber-950/30 border-amber-500/30',
  silver: 'text-slate-400 bg-slate-800/20 border-slate-500/30',
  partner: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/20',
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Sponsor, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const loadSponsors = async () => {
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true })
    if (data) setSponsors(data as Sponsor[])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
      if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
      await loadSponsors()
    }
    init()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Vui lòng nhập tên nhà tài trợ.'); return }
    if (!form.logo_url.trim()) { setError('Vui lòng nhập URL logo.'); return }
    setSaving(true)
    setError('')

    if (editId) {
      const { error: updateError } = await supabase.from('sponsors').update(form).eq('id', editId)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase.from('sponsors').insert(form)
      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
    await loadSponsors()
  }

  const handleEdit = (s: Sponsor) => {
    const { id, ...rest } = s
    setEditId(id)
    setForm(rest)
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa nhà tài trợ "${name}"?`)) return
    await supabase.from('sponsors').delete().eq('id', id)
    await loadSponsors()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  if (loading) return <Loading text="LOADING SPONSORS DATABASE" />

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
              🤝 QUẢN LÝ NHÀ TÀI TRỢ & ĐỐI TÁC
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              SPONSORS PANEL // ADMIN CONTROL
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
              {editId ? '✏️ CHỈNH SỬA NHÀ TÀI TRỢ' : '➕ THÊM NHÀ TÀI TRỢ MỚI'}
            </h2>
            {error && <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Tên nhà tài trợ *</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} required
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Hạng (Tier)</label>
                <select value={form.tier} onChange={e => setField('tier', e.target.value as Sponsor['tier'])}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition">
                  {TIERS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">URL Logo *</label>
                <input value={form.logo_url} onChange={e => setField('logo_url', e.target.value)} required
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">URL Website</label>
                <input value={form.website_url ?? ''} onChange={e => setField('website_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-1.5">Thứ tự hiển thị</label>
                <input type="number" value={form.display_order} onChange={e => setField('display_order', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white focus:outline-none focus:border-cyan-400 transition" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 relative"></div>
                  <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Đang hoạt động</span>
                </label>
              </div>
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

        {/* Sponsors List */}
        <div className="space-y-4">
          {sponsors.length === 0 ? (
            <div className="tech-panel p-12 text-center border-cyan-500/10">
              <p className="text-slate-500 text-sm font-semibold">Chưa có nhà tài trợ nào được thêm vào hệ thống.</p>
            </div>
          ) : (
            sponsors.map((s) => (
              <div key={s.id} className="tech-panel border-cyan-500/15 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  {/* Logo preview */}
                  <div className="w-20 h-12 rounded-lg border border-[#1e2d5a] bg-[#0a1025] flex items-center justify-center shrink-0 overflow-hidden px-2">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="max-h-8 max-w-full object-contain filter brightness-75" />
                    ) : (
                      <span className="text-slate-500 text-[10px]">NO LOGO</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {s.name}
                      <span className={`text-[10px] font-orbitron font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[s.tier]}`}>
                        {TIER_LABELS[s.tier]}
                      </span>
                      {!s.is_active && <span className="text-[10px] text-slate-500 font-orbitron border border-slate-600/30 px-1.5 py-0.5 rounded">ẨN</span>}
                    </div>
                    {s.website_url && (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500/60 hover:text-cyan-400 transition">{s.website_url}</a>
                    )}
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
