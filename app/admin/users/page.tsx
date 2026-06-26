'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  organization?: string
  role?: string
  created_at: string
}

interface Profile {
  role?: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single() as { data: Profile | null }
      if (!isMounted) return
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      await loadUsers()
      if (!isMounted) return
      setLoading(false)
    }
    init()
    return () => {
      isMounted = false
    }
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

  if (loading) return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center font-orbitron tracking-widest">
      <p className="animate-pulse">⏳ LOADING USERS REGISTER...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4 relative scanline-container">
      {/* Decorative Glows */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-brand-blue/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

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
                  <th className="padding-table px-6 py-4">Họ tên</th>
                  <th className="padding-table px-6 py-4">Email</th>
                  <th className="padding-table px-6 py-4">SĐT</th>
                  <th className="padding-table px-6 py-4">Đơn vị</th>
                  <th className="padding-table px-6 py-4">Quyền truy cập</th>
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
