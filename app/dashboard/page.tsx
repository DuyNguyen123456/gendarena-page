'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Profile = {
  id: string
  full_name?: string
  email?: string
  phone?: string
  organization?: string
}

type Competition = {
  id: string
  title: string
  description?: string
  status?: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false })
      setCompetitions(comps || [])

      setLoading(false)
    }
    loadData()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ fontSize: '20px' }}>⏳ Đang tải...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px' }}>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 'bold' }}>📋 Thông tin của bạn</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '15px' }}>
            <div><span style={{ color: '#64748b' }}>Họ tên: </span><strong>{profile?.full_name}</strong></div>
            <div><span style={{ color: '#64748b' }}>Email: </span><strong>{profile?.email}</strong></div>
            <div><span style={{ color: '#64748b' }}>SĐT: </span><strong>{profile?.phone || 'Chưa cập nhật'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Đơn vị: </span><strong>{profile?.organization || 'Chưa cập nhật'}</strong></div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 'bold' }}>🏆 Cuộc thi đang diễn ra</h2>
          {competitions.length === 0 ? (
            <p style={{ color: '#64748b' }}>Chưa có cuộc thi nào.</p>
          ) : (
            <div>
              {competitions.map((comp) => (
                <div key={comp.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 'bold' }}>{comp.title}</h3>
                      <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '14px' }}>{comp.description}</p>
                      <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '20px', fontSize: '13px' }}>
                        {comp.status === 'registration' ? '📝 Đang mở đăng ký' : comp.status}
                      </span>
                    </div>
                    <Link
                      href={`/competitions/${comp.id}`}
                      style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', whiteSpace: 'nowrap', marginLeft: '16px' }}
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { href: '/submissions', icon: '📝', title: 'Nộp bài', desc: 'Xem và quản lý bài nộp' },
            { href: '/teams', icon: '👥', title: 'Đội của tôi', desc: 'Xem thành viên trong đội' },
            { href: '/profile', icon: '👤', title: 'Hồ sơ', desc: 'Cập nhật thông tin cá nhân' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', textAlign: 'center', textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'block' }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>{item.desc}</div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}