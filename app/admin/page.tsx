'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, competitions: 0, teams: 0, submissions: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const [users, comps, teams, subs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('competitions').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        users: users.count || 0,
        competitions: comps.count || 0,
        teams: teams.count || 0,
        submissions: subs.count || 0,
      })
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 'bold' }}>🛠️ Admin Dashboard</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Quản lý toàn bộ hệ thống cuộc thi</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { icon: '👥', label: 'Thí sinh', value: stats.users, color: '#3b82f6' },
            { icon: '🏆', label: 'Cuộc thi', value: stats.competitions, color: '#eab308' },
            { icon: '🧩', label: 'Đội thi', value: stats.teams, color: '#8b5cf6' },
            { icon: '📝', label: 'Bài nộp', value: stats.submissions, color: '#16a34a' },
          ].map((stat) => (
            <div key={stat.label} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {[
            { href: '/admin/competitions', icon: '🏆', title: 'Quản lý cuộc thi', desc: 'Tạo, sửa, xoá cuộc thi' },
            { href: '/admin/users', icon: '👥', title: 'Quản lý người dùng', desc: 'Xem danh sách & phân quyền' },
            { href: '/admin/submissions', icon: '📝', title: 'Bài nộp', desc: 'Xem và chấm điểm bài nộp' },
            { href: '/admin/leaderboard', icon: '🏅', title: 'Bảng xếp hạng', desc: 'Xếp hạng theo điểm' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              <div style={{ fontSize: '36px' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '17px', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}