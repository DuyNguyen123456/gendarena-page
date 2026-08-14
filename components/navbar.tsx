'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { siteConfig } from '@/config/site'
import Image from 'next/image'
import { Settings, Scale, Calendar, Crown, User as UserIcon, Menu, X, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ full_name?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

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
      } else {
        setProfile(null)
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
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'admin'
  const isJudge = profile?.role === 'judge'

  const getLinkClass = (path: string) => {
    const isActive = (path !== '/' && pathname.startsWith(path)) || pathname === path
    return `px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-[150ms] ${
      isActive
        ? 'text-brand-cyan bg-brand-cyan/10 font-semibold'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
    }`
  }

  const getMobileLinkClass = (path: string) => {
    const isActive = (path !== '/' && pathname.startsWith(path)) || pathname === path
    return `block w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-[150ms] ${
      isActive
        ? 'text-brand-cyan bg-brand-cyan/10 font-semibold'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
    }`
  }

  const getRoleLinkClass = (path: string, activeColor: 'cyan' | 'warning' | 'purple' = 'cyan') => {
    const isActive = (path !== '/' && pathname.startsWith(path)) || pathname === path
    if (activeColor === 'warning') {
      return `px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-[150ms] ${
        isActive
          ? 'text-semantic-warning bg-semantic-warning/10 font-semibold'
          : 'text-text-secondary hover:text-semantic-warning hover:bg-surface-raised'
      }`
    }
    if (activeColor === 'purple') {
      return `px-3.5 py-2 rounded-md text-sm font-medium transition-colors duration-[150ms] ${
        isActive
          ? 'text-accent-violet bg-accent-violet/10 font-semibold'
          : 'text-text-secondary hover:text-accent-violet hover:bg-surface-raised'
      }`
    }
    return getLinkClass(path)
  }

  return (
    <nav
      ref={menuRef}
      className="sticky top-0 z-sticky bg-surface-base/80 backdrop-blur-md border-b border-surface-border transition-colors duration-[250ms]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-85"
        >
          <Image
            src="/logo/gendarena-logo.png"
            alt="Logo GenD Arena 2026"
            width={32}
            height={32}
            className="object-contain shrink-0"
          />
          <span className="font-display text-base md:text-lg font-bold tracking-wider text-text-primary">
            {siteConfig.name.toUpperCase()}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
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
            <>
              <Link href="/admin" className={`${getRoleLinkClass('/admin', 'warning')} flex items-center gap-1.5`}>
                <Settings className="size-4" />
                <span>Quản lý</span>
              </Link>
              <Link href="/admin/phases" className={`${getRoleLinkClass('/admin/phases', 'warning')} flex items-center gap-1.5`}>
                <Calendar className="size-4" />
                <span>Timeline</span>
              </Link>
            </>
          )}

          {isJudge && (
            <>
              <Link href="/judge" className={`${getRoleLinkClass('/judge', 'purple')} flex items-center gap-1.5`}>
                <Scale className="size-4" />
                <span>Giám khảo</span>
              </Link>
              <Link href="/profile" className={getLinkClass('/profile')}>
                Hồ sơ
              </Link>
            </>
          )}

          <div className="w-px h-5 bg-surface-border mx-2" />

          {loading ? (
            <div className="w-24 h-9 bg-surface-elevated animate-pulse rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-surface-raised border border-surface-border px-3 py-1 rounded-full">
                <span className="size-1.5 rounded-full bg-semantic-success animate-pulse" />
                {isAdmin ? (
                  <Badge variant="warning" size="sm">BTC</Badge>
                ) : isJudge ? (
                  <Badge variant="brand" size="sm">BGK</Badge>
                ) : (
                  <Badge variant="info" size="sm">Thí sinh</Badge>
                )}
                <span className="text-xs font-medium text-text-primary max-w-[120px] truncate">
                  {profile?.full_name || 'Đấu thủ'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-text-tertiary hover:text-semantic-danger hover:bg-semantic-danger/10"
                rightIcon={<LogOut className="size-3.5" />}
              >
                Đăng xuất
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Đăng ký ngay
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <Button
            variant="ghost"
            size="sm"
            id="mobile-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="p-2"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface-overlay border-b border-surface-border px-4 py-4 space-y-1 animate-in fade-in-0 duration-200">
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
            <>
              <Link
                href="/admin"
                className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'text-semantic-warning bg-semantic-warning/10 font-semibold'
                    : 'text-text-secondary hover:text-semantic-warning hover:bg-surface-raised'
                }`}
              >
                <Settings className="size-4" />
                <span>Quản lý</span>
              </Link>
              <Link
                href="/admin/phases"
                className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/admin/phases'
                    ? 'text-semantic-warning bg-semantic-warning/10 font-semibold'
                    : 'text-text-secondary hover:text-semantic-warning hover:bg-surface-raised'
                }`}
              >
                <Calendar className="size-4" />
                <span>Timeline</span>
              </Link>
            </>
          )}

          {isJudge && (
            <>
              <Link
                href="/judge"
                className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/judge')
                    ? 'text-accent-violet bg-accent-violet/10 font-semibold'
                    : 'text-text-secondary hover:text-accent-violet hover:bg-surface-raised'
                }`}
              >
                <Scale className="size-4" />
                <span>Giám khảo</span>
              </Link>
              <Link href="/profile" className={getMobileLinkClass('/profile')}>
                Hồ sơ
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-surface-border mt-3">
            {loading ? (
              <div className="w-full h-10 bg-surface-elevated animate-pulse rounded-md" />
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2 py-1 bg-surface-raised rounded-lg border border-surface-border">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-semantic-success animate-pulse" />
                    {isAdmin ? (
                      <Badge variant="warning" size="sm">BTC</Badge>
                    ) : isJudge ? (
                      <Badge variant="brand" size="sm">BGK</Badge>
                    ) : (
                      <Badge variant="info" size="sm">Thí sinh</Badge>
                    )}
                    <span className="text-xs font-medium text-text-primary">
                      {profile?.full_name || 'Đấu thủ'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleLogout}
                  className="w-full justify-center text-semantic-danger hover:bg-semantic-danger/10"
                  leftIcon={<LogOut className="size-4" />}
                >
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link href="/login" className="w-full">
                  <Button variant="secondary" size="md" className="w-full justify-center">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button variant="primary" size="md" className="w-full justify-center">
                    Đăng ký ngay
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}