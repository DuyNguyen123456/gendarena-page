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
  const isJudge = profile?.role === 'judge'

  const getLinkClass = (path: string) => {
    const isActive = (path !== '/' && pathname.startsWith(path)) || pathname === path
    return `px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
      isActive 
        ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)] font-bold' 
        : 'text-slate-300 hover:text-cyan-400 hover:bg-cyan-950/10'
    }`
  }

  const getAdminLinkClass = () => {
    const isActive = pathname.startsWith('/admin')
    return `px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
      isActive 
        ? 'text-red-400 bg-red-950/30 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)] font-bold' 
        : 'text-slate-300 hover:text-red-400 hover:bg-red-950/10'
    }`
  }

  return (
    <nav className="bg-[#070c1e]/85 backdrop-blur-md border-b border-[#1e2d5a] px-8 py-3.5 flex justify-between items-center sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,240,255,0.03)]">
      <Link 
        href="/" 
        className="font-orbitron text-lg font-bold tracking-wider text-white hover:text-cyan-400 transition duration-300 flex items-center gap-2 group"
      >
        <span className="group-hover:animate-pulse">🤖</span>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-400 group-hover:neon-text-cyan">
          GEND ARENA
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link href="/" className={getLinkClass('/')}>Trang chủ</Link>

        {user && !isAdmin && (
          <>
            <Link href="/dashboard" className={getLinkClass('/dashboard')}>Dashboard</Link>
            <Link href="/submissions" className={getLinkClass('/submissions')}>Bài nộp</Link>
          </>
        )}

        {(isAdmin || isJudge) && (
          <Link href="/admin" className={getAdminLinkClass()}>
            ⚙️ Quản lý
          </Link>
        )}

        <div className="w-[1px] h-5 bg-[#1e2d5a] mx-2" />

        {loading ? (
          <div className="w-20 h-9 bg-slate-800/30 animate-pulse rounded-lg" />
        ) : user ? (
          <div className="flex items-center gap-3.5">
            <span className="text-slate-300 text-xs font-medium bg-[#131e3d] border border-[#1e2d5a] px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {isAdmin ? '👑 Admin:' : isJudge ? '⚖️ Giám khảo:' : '👤'} {profile?.full_name || 'Đấu thủ'}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-500/30 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-semibold rounded-lg cursor-pointer transition-all duration-200 active:translate-y-px"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link 
              href="/login" 
              className="px-4 py-2 rounded-lg text-slate-300 hover:text-white text-sm font-semibold transition"
            >
              Đăng nhập
            </Link>
            <Link 
              href="/register" 
              className="tech-btn-accent px-4 py-2 rounded-lg text-sm"
            >
              BƯỚC VÀO SÀN ĐẤU
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}