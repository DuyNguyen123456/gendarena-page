'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ full_name?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
      setLoading(false)
    }
    loadUser()
  }, [pathname, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  const isAdmin = profile?.role === 'admin'

  const linkStyle = (path: string) => ({
    padding: '8px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: (path !== '/' && pathname.startsWith(path)) || pathname === path ? '#2563eb' : '#475569',
    backgroundColor: (path !== '/' && pathname.startsWith(path)) || pathname === path ? '#eff6ff' : 'transparent',
    fontWeight: (path !== '/' && pathname.startsWith(path)) || pathname === path ? 600 : 500,
    fontSize: '15px',
    transition: 'all 0.15s',
  })

  return (
    <nav style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      padding: '14px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link href="/" style={{
        fontSize: '20px',
        fontWeight: 'bold',
        textDecoration: 'none',
        color: '#0f172a',
      }}>
        🚀 GenD Arena
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/" style={linkStyle('/')}>Trang chủ</Link>

        {user && !isAdmin && (
          <>
            <Link href="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>
            <Link href="/submissions" style={linkStyle('/submissions')}>Bài nộp</Link>
          </>
        )}

        {isAdmin && (
          <Link href="/admin" style={{
            ...linkStyle('/admin'),
            color: pathname.startsWith('/admin') ? '#dc2626' : '#475569',
            backgroundColor: pathname.startsWith('/admin') ? '#fef2f2' : 'transparent',
          }}>
            🛠️ Admin
          </Link>
        )}

        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 8px' }} />

        {loading ? (
          <div style={{ width: '80px', height: '36px' }} />
        ) : user ? (
          <>
            <span style={{ color: '#475569', fontSize: '14px' }}>
              {isAdmin ? '👑' : '👋'} {profile?.full_name || 'Bạn'}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                border: '1px solid #fca5a5',
                backgroundColor: 'white',
                color: '#dc2626',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              Đăng nhập
            </Link>
            <Link href="/register" style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}