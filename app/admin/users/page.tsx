'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import { updateProfileExpertise } from '@/services/profile'
import type { TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORIES, TOPIC_CATEGORY_CONFIG } from '@/types/submission'

interface UserRow {
  id: string
  full_name: string
  email: string
  phone?: string
  organization?: string
  role?: string
  expertise?: string[] | null
  created_at: string
}

// ─── Expertise Editor Popover ─────────────────────────────────────────────────

function ExpertiseEditor({
  userId,
  current,
  onSave,
  onClose,
}: {
  userId: string
  current: string[]
  onSave: () => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<TopicCategory[]>(
    (current ?? []).filter((e): e is TopicCategory =>
      TOPIC_CATEGORIES.includes(e as TopicCategory)
    )
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const toggle = (cat: TopicCategory) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await updateProfileExpertise(userId, selected)
    setSaving(false)
    if (!result.ok) {
      setMsg({ ok: false, text: '❌ ' + result.error })
    } else {
      setMsg({ ok: true, text: '✅ Đã lưu lĩnh vực chuyên môn' })
      setTimeout(() => { onSave(); onClose() }, 800)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0b1124] border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <h3 className="font-orbitron text-base font-bold text-purple-300 uppercase tracking-wider mb-1">
          ⭐ Lĩnh vực chuyên môn
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Chọn các lĩnh vực mà giám khảo này có chuyên môn để hỗ trợ phân công đúng hướng.
        </p>
        <div className="space-y-2 mb-5">
          {TOPIC_CATEGORIES.map((cat) => {
            const cfg = TOPIC_CATEGORY_CONFIG[cat]
            const isSelected = selected.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggle(cat)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-xs font-bold tracking-wide transition ${
                  isSelected
                    ? `${cfg.cls} opacity-100 shadow-sm`
                    : 'border-[#1e2d5a] bg-slate-950/40 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                  isSelected ? 'bg-current border-current' : 'border-slate-600'
                }`}>
                  {isSelected && <span className="text-[8px] text-[#0b1124] font-black">✓</span>}
                </span>
                {cfg.label}
              </button>
            )
          })}
        </div>
        {msg && (
          <p className={`text-xs font-semibold mb-3 ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-orbitron font-bold uppercase tracking-wider rounded-lg transition"
          >
            {saving ? '⏳ ĐANG LƯU...' : '💾 LƯU'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-[#1e2d5a] text-slate-400 text-xs font-semibold rounded-lg hover:bg-slate-900/60 transition"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [editingExpertiseFor, setEditingExpertiseFor] = useState<UserRow | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, organization, role, expertise, created_at')
      .order('created_at', { ascending: false })
    setUsers((data as UserRow[]) || [])
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!isMounted) return
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      await loadUsers()
      if (!isMounted) return
      setLoading(false)
    }
    init()
    return () => { isMounted = false }
  }, [supabase, router, loadUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles').update({ role: newRole } as never).eq('id', userId)
    if (error) setMessage('❌ Lỗi: ' + error.message)
    else { setMessage('✅ Đã cập nhật quyền'); await loadUsers() }
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.organization?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading text="LOADING USER REGISTRY" />

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-brand-blue/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {editingExpertiseFor && (
        <ExpertiseEditor
          userId={editingExpertiseFor.id}
          current={editingExpertiseFor.expertise ?? []}
          onSave={() => loadUsers()}
          onClose={() => setEditingExpertiseFor(null)}
        />
      )}

      <div className="max-w-6xl mx-auto relative z-10">

        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-orbitron font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors uppercase mb-8"
        >
          ← QUAY LẠI PANEL ADMIN
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              👥 CƠ SỞ DỮ LIỆU ĐẤU THỦ
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              USER DATABASE MONITOR // ACCESS CONTROL
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-orbitron bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.05)]">
            TỔNG SỐ: {users.length} THÀNH VIÊN
          </div>
        </div>

        {message && (
          <div className="bg-[#131e3d] border border-cyan-500/40 text-cyan-400 p-4 rounded-lg mb-6 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span>📡</span> {message}
          </div>
        )}

        <div className="relative mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm đấu thủ theo tên, email, đơn vị công tác..."
            className="w-full bg-slate-950/60 border border-[#1e2d5a] px-4 py-3 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
          />
        </div>

        <div className="tech-panel border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-350">
              <thead>
                <tr className="bg-dark-panel border-b border-[#1e2d5a] text-slate-300 font-bold tracking-widest uppercase text-xs">
                  <th className="px-6 py-4">Họ tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">SĐT</th>
                  <th className="px-6 py-4">Đơn vị</th>
                  <th className="px-6 py-4">Quyền truy cập</th>
                  <th className="px-6 py-4">Lĩnh vực chuyên môn (BGK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2d5a]/40">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#131e3d]/30 transition duration-150">
                    <td className="px-6 py-4 font-semibold text-white">{u.full_name}</td>
                    <td className="px-6 py-4 text-slate-300">{u.email}</td>
                    <td className="px-6 py-4 text-slate-400">{u.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-400">{u.organization || '-'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'participant'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-950/80 border border-[#1e2d5a] text-xs font-bold font-orbitron tracking-wide uppercase rounded px-3 py-1.5 focus:outline-none focus:border-cyan-400 text-white cursor-pointer transition"
                      >
                        <option value="participant" className="bg-dark-bg">Thí sinh (PILOT)</option>
                        <option value="judge" className="bg-dark-bg">Giám khảo (JUDGE)</option>
                        <option value="admin" className="bg-dark-bg">Quản trị (ADMIN)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'judge' ? (
                        <div>
                          {u.expertise?.length ? (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {u.expertise.map((e) => {
                                const cfg = TOPIC_CATEGORY_CONFIG[e as TopicCategory]
                                return cfg ? (
                                  <span key={e} className={`inline-flex items-center px-1.5 py-px rounded border text-[8px] font-bold ${cfg.cls}`}>
                                    {cfg.label}
                                  </span>
                                ) : null
                              })}
                            </div>
                          ) : (
                            <p className="text-[9px] text-slate-600 italic mb-1.5">Chưa khai báo</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingExpertiseFor(u)}
                            className="text-[9px] font-orbitron font-bold text-purple-400 border border-purple-500/30 px-2 py-1 rounded hover:bg-purple-950/30 transition uppercase tracking-widest"
                          >
                            ✏ Cập nhật
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm font-semibold">
              Không tìm thấy người dùng nào khớp với truy vấn tìm kiếm.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
