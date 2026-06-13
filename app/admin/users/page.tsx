'use client'

import { useEffect, useState } from 'react'
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

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function loadUsers() {
    const { data } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      await loadUsers()
      setLoading(false)
    }
    init()
  }, [supabase, router, loadUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) setMessage('❌ Lỗi: ' + error.message)
    else { setMessage('✅ Đã cập nhật quyền'); await loadUsers() }
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.organization?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/admin" style={{ display: 'inline-block', marginBottom: '20px', color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
          ← Quay lại Admin
        </Link>

        <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 'bold' }}>👥 Quản lý người dùng ({users.length})</h1>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.startsWith('✅') ? '#86efac' : '#fecaca'}`, color: message.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
            {message}
          </div>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm theo tên, email, đơn vị..."
          style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box', marginBottom: '20px' }}
        />

        <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Họ tên</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>SĐT</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Đơn vị</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Quyền</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.phone || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.organization || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={u.role || 'participant'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <option value="participant">Thí sinh</option>
                      <option value="judge">Giám khảo</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
              Không tìm thấy người dùng nào.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}