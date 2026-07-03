'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { siteConfig } from '@/config/site'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ full_name?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
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

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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
    return `px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
        ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)] font-bold'
        : 'text-slate-300 hover:text-cyan-400 hover:bg-cyan-950/10'
      }`
  }

  const getMobileLinkClass = (path: string) => {
    const isActive = (path !== '/' && pathname.startsWith(path)) || pathname === path
    return `block w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
        ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 font-bold'
        : 'text-slate-300 hover:text-cyan-400 hover:bg-cyan-950/10'
      }`
  }

  const getAdminLinkClass = (path: string) => {
    const isActive = pathname === path
    return `px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
        ? 'text-red-400 bg-red-950/30 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)] font-bold'
        : 'text-slate-300 hover:text-red-400 hover:bg-red-950/10'
      }`
  }

  return (
    <nav
      ref={menuRef}
      className="bg-[#070c1e]/85 backdrop-blur-md border-b border-[#1e2d5a] px-6 md:px-8 py-3.5 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,240,255,0.03)]"
    >
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link
          href="/"
          className="font-orbitron text-lg font-bold tracking-wider text-white hover:text-cyan-400 transition duration-300 flex items-center gap-2 group"
        >
          <span className="group-hover:animate-pulse">🤖</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-400">
            {siteConfig.name.toUpperCase()}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {siteConfig.navItems.map((item) => (
            <Link key={item.href} href={item.href} className={getLinkClass(item.href)}>
              {item.label}
            </Link>
          ))}

          {user && !isAdmin && !isJudge && (
            <>
              {siteConfig.authNavItems.map((item) => (
                <Link key={item.href} href={item.href} className={getLinkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
            </>
          )}

          {isAdmin && (
            <Link href="/admin" className={getAdminLinkClass('/admin')}>
              ⚙️ Quản lý
            </Link>
          )}

          {isJudge && (
            <Link href="/judge" className={getAdminLinkClass('/judge')}>
              ⚖️ Giám khảo
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin/phases" className={getAdminLinkClass('/admin/phases')}>
              🗓️ Quản lý Timeline
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

        {/* Mobile Hamburger Button */}
        <button
          id="mobile-menu-btn"
          className="md:hidden flex flex-col gap-[6px] p-2 rounded-lg hover:bg-cyan-950/20 transition cursor-pointer"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span
            className="block w-5 h-0.5 bg-slate-300 transition-all duration-300 origin-center"
            style={menuOpen ? { transform: 'translateY(7px) rotate(45deg)' } : {}}
          />
          <span
            className="block w-5 h-0.5 bg-slate-300 transition-all duration-300"
            style={menuOpen ? { opacity: 0, transform: 'scaleX(0)' } : {}}
          />
          <span
            className="block w-5 h-0.5 bg-slate-300 transition-all duration-300 origin-center"
            style={menuOpen ? { transform: 'translateY(-7px) rotate(-45deg)' } : {}}
          />
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden mobile-menu-open mt-3 pb-3 border-t border-[#1e2d5a] pt-3 space-y-1">
          {siteConfig.navItems.map((item) => (
            <Link key={item.href} href={item.href} className={getMobileLinkClass(item.href)}>
              {item.label}
            </Link>
          ))}

          {user && !isAdmin && !isJudge && (
            <>
              {siteConfig.authNavItems.map((item) => (
                <Link key={item.href} href={item.href} className={getMobileLinkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
            </>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className={`block w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${pathname === '/admin'
                  ? 'text-red-400 bg-red-950/30 border border-red-500/30'
                  : 'text-slate-300 hover:text-red-400 hover:bg-red-950/10'
                }`}
            >
              ⚙️ Quản lý
            </Link>
          )}

          {isJudge && (
            <Link
              href="/judge"
              className={`block w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${pathname.startsWith('/judge')
                  ? 'text-purple-400 bg-purple-950/30 border border-purple-500/30'
                  : 'text-slate-300 hover:text-purple-400 hover:bg-purple-950/10'
                }`}
            >
              ⚖️ Giám khảo
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/phases"
              className={`block w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${pathname === '/admin/phases'
                  ? 'text-red-400 bg-red-950/30 border border-red-500/30'
                  : 'text-slate-300 hover:text-red-400 hover:bg-red-950/10'
                }`}
            >
              🗓️ Quản lý Timeline
            </Link>
          )}

          <div className="pt-2 border-t border-[#1e2d5a] mt-2">
            {loading ? (
              <div className="w-full h-9 bg-slate-800/30 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center justify-between px-1">
                <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {isAdmin ? '👑' : isJudge ? '⚖️' : '👤'} {profile?.full_name || 'Đấu thủ'}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-red-500/30 bg-red-950/20 hover:bg-red-500 hover:text-white text-red-400 text-xs font-semibold rounded-lg cursor-pointer transition-all duration-200"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className="block text-center px-4 py-2.5 rounded-lg text-slate-300 hover:text-white text-sm font-semibold border border-[#1e2d5a] hover:border-cyan-500/30 transition">
                  Đăng nhập
                </Link>
                <Link href="/register" className="tech-btn-accent block text-center px-4 py-2.5 rounded-lg text-sm font-bold">
                  BƯỚC VÀO SÀN ĐẤU
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}