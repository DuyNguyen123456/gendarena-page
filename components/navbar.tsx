'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { siteConfig } from '@/config/site'
import Image from 'next/image'
import {
  Home,
  Users,
  LayoutDashboard,
  Upload,
  Settings,
  Calendar,
  Scale,
  User as UserIcon,
  Menu,
  X,
  LogOut,
  Award,
  BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isProfileComplete } from '@/lib/profile-utils'
import type { Profile } from '@/types/profile'
import NotificationBell from '@/components/notifications/NotificationBell'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, university, faculty, major, phone, dob')
          .eq('id', user.id)
          .maybeSingle()
        setProfile(data as Profile | null)
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
    window.location.href = '/login'
  }

  const isAdmin = profile?.role === 'admin'
  const isJudge = profile?.role === 'judge'
  const isParticipant = user && !isAdmin && !isJudge

  // Desktop Icon-First link styling
  const getIconLinkClass = (path: string, color: 'cyan' | 'warning' | 'purple' = 'cyan') => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path)

    if (color === 'warning') {
      return `size-9 rounded-lg flex items-center justify-center transition-all duration-150 relative ${
        isActive
          ? 'text-semantic-warning bg-semantic-warning/15 border border-semantic-warning/40 shadow-sm'
          : 'text-text-secondary hover:text-semantic-warning hover:bg-surface-raised border border-transparent'
      }`
    }

    if (color === 'purple') {
      return `size-9 rounded-lg flex items-center justify-center transition-all duration-150 relative ${
        isActive
          ? 'text-accent-violet bg-accent-violet/15 border border-accent-violet/40 shadow-sm'
          : 'text-text-secondary hover:text-accent-violet hover:bg-surface-raised border border-transparent'
      }`
    }

    return `size-9 rounded-lg flex items-center justify-center transition-all duration-150 relative ${
      isActive
        ? 'text-brand-cyan bg-brand-cyan/15 border border-brand-cyan/40 shadow-sm'
        : 'text-text-secondary hover:text-brand-cyan hover:bg-surface-raised border border-transparent'
    }`
  }

  // Mobile menu link styling (vertical with full Vietnamese text)
  const getMobileLinkClass = (path: string) => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path)
    return `flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'text-brand-cyan bg-brand-cyan/10 font-semibold'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
    }`
  }

  return (
    <nav
      ref={menuRef}
      className="sticky top-0 z-sticky bg-surface-base/85 backdrop-blur-md border-b border-surface-border transition-colors duration-[250ms]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo (Mobile: Logo only; Desktop: Logo + Brand Name) */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-85 shrink-0"
          aria-label="Về trang chủ GenD Arena 2026"
        >
          <Image
            src="/logo/gendarena-logo.png"
            alt="Logo GenD Arena 2026"
            width={32}
            height={32}
            className="object-contain shrink-0"
            priority
          />
          <span className="hidden sm:inline-block font-display text-base md:text-lg font-bold tracking-wider text-text-primary">
            {siteConfig.name.toUpperCase()}
          </span>
        </Link>

        {/* Desktop Navigation (Icon-First + Distinct CTA) */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {/* Main Navigation Icons */}
          <Link
            href="/"
            className={getIconLinkClass('/')}
            title="Trang chủ"
            aria-label="Trang chủ"
          >
            <Home className="size-4" />
          </Link>

          <Link
            href="/organizers"
            className={getIconLinkClass('/organizers')}
            title="Ban tổ chức"
            aria-label="Ban tổ chức"
          >
            <Award className="size-4" />
          </Link>

          {/* Participant Hub Icon */}
          {isParticipant && (
            <Link
              href="/dashboard"
              className={getIconLinkClass('/dashboard')}
              title="Bảng điều khiển & Đội thi"
              aria-label="Bảng điều khiển & Đội thi"
            >
              <LayoutDashboard className="size-4" />
            </Link>
          )}

          {/* Admin Icons */}
          {isAdmin && (
            <>
              <Link
                href="/admin"
                className={getIconLinkClass('/admin', 'warning')}
                title="Quản trị hệ thống"
                aria-label="Quản trị hệ thống"
              >
                <Settings className="size-4" />
              </Link>
              <Link
                href="/admin/phases"
                className={getIconLinkClass('/admin/phases', 'warning')}
                title="Timeline & Vòng thi"
                aria-label="Timeline & Vòng thi"
              >
                <Calendar className="size-4" />
              </Link>
              <Link
                href="/profile"
                className={getIconLinkClass('/profile', 'warning')}
                title="Hồ sơ quản trị"
                aria-label="Hồ sơ quản trị"
              >
                <UserIcon className="size-4" />
              </Link>
            </>
          )}

          {/* Judge Icons */}
          {isJudge && (
            <>
              <Link
                href="/judge"
                className={getIconLinkClass('/judge', 'purple')}
                title="Không gian chấm thi"
                aria-label="Không gian chấm thi"
              >
                <Scale className="size-4" />
              </Link>
              <Link
                href="/profile"
                className={getIconLinkClass('/profile', 'purple')}
                title="Hồ sơ & Chuyên môn"
                aria-label="Hồ sơ & Chuyên môn"
              >
                <UserIcon className="size-4" />
              </Link>
            </>
          )}

          {/* Exception: "Nộp bài" CTA Button for Participants & Logged-in Users */}
          {isParticipant && (
            <Link href="/submissions" className="ml-1">
              <Button
                variant={pathname.startsWith('/submissions') ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={<Upload className="size-3.5" />}
                className="font-semibold text-xs px-3 h-8 shadow-sm"
              >
                Nộp bài
              </Button>
            </Link>
          )}

          <div className="w-px h-5 bg-surface-border mx-2" />

          {/* User Auth Section */}
          {loading ? (
            <div className="w-24 h-9 bg-surface-elevated animate-pulse rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-2.5">
              <NotificationBell userId={user.id} />

              {/* Shortened Role Badge + Full Name */}
              <div
                className="flex items-center gap-1.5 bg-surface-raised border border-surface-border px-2.5 py-1 rounded-full text-xs"
                title={`Đã đăng nhập: ${profile?.full_name || 'Đấu thủ'} (${
                  isAdmin ? 'Ban Tổ Chức' : isJudge ? 'Ban Giám Khảo' : 'Thí sinh'
                })${isParticipant && isProfileComplete(profile) ? ' - Đã xác thực hồ sơ' : ''}`}
              >
                <span className="size-1.5 rounded-full bg-semantic-success animate-pulse" />
                {isAdmin ? (
                  <Badge variant="warning" size="sm" className="px-1 py-0 text-[10px] font-bold">
                    BTC
                  </Badge>
                ) : isJudge ? (
                  <Badge variant="brand" size="sm" className="px-1 py-0 text-[10px] font-bold">
                    BGK
                  </Badge>
                ) : (
                  <Badge variant="info" size="sm" className="px-1 py-0 text-[10px] font-bold">
                    TS
                  </Badge>
                )}
                <span className="font-medium text-text-primary max-w-[100px] lg:max-w-[130px] truncate">
                  {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Đấu thủ'}
                </span>
                {isParticipant && isProfileComplete(profile) && (
                  <span title="Đã xác thực hồ sơ" aria-label="Đã xác thực hồ sơ" className="inline-flex items-center">
                    <BadgeCheck className="size-3.5 text-brand-cyan shrink-0" />
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="text-text-tertiary hover:text-semantic-danger hover:bg-semantic-danger/10 size-8 p-0 flex items-center justify-center rounded-lg"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" className="text-xs">
                  Đăng ký
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button & Quick Notifications */}
        <div className="md:hidden flex items-center gap-1.5">
          {user && <NotificationBell userId={user.id} />}
          <Button
            variant="ghost"
            size="sm"
            id="mobile-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Mở menu điều hướng"
            aria-expanded={menuOpen}
            className="size-9 p-0 flex items-center justify-center rounded-lg"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Dropdown Menu (Vertical with Full Text) */}
      {menuOpen && (
        <div className="md:hidden bg-surface-overlay/95 backdrop-blur-xl border-b border-surface-border px-4 py-4 space-y-1.5 animate-in fade-in-0 duration-200 shadow-elevation-3">
          <Link href="/" className={getMobileLinkClass('/')}>
            <Home className="size-4 text-brand-cyan" />
            <span>Trang chủ</span>
          </Link>

          <Link href="/organizers" className={getMobileLinkClass('/organizers')}>
            <Award className="size-4 text-brand-cyan" />
            <span>Ban tổ chức</span>
          </Link>

          {isParticipant && (
            <>
              <Link href="/dashboard" className={getMobileLinkClass('/dashboard')}>
                <LayoutDashboard className="size-4 text-brand-cyan" />
                <span>Bảng điều khiển &amp; Đội thi</span>
              </Link>
              <Link
                href="/submissions"
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  pathname.startsWith('/submissions')
                    ? 'text-brand-cyan bg-brand-cyan/15 border border-brand-cyan/30'
                    : 'text-text-primary bg-brand-cyan/10 hover:bg-brand-cyan/15'
                }`}
              >
                <Upload className="size-4 text-brand-cyan" />
                <span>Nộp bài dự thi</span>
              </Link>
            </>
          )}

          {isAdmin && (
            <>
              <Link
                href="/admin"
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'text-semantic-warning bg-semantic-warning/10 font-semibold'
                    : 'text-text-secondary hover:text-semantic-warning hover:bg-surface-raised'
                }`}
              >
                <Settings className="size-4" />
                <span>Quản trị hệ thống</span>
              </Link>
              <Link
                href="/admin/phases"
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/admin/phases'
                    ? 'text-semantic-warning bg-semantic-warning/10 font-semibold'
                    : 'text-text-secondary hover:text-semantic-warning hover:bg-surface-raised'
                }`}
              >
                <Calendar className="size-4" />
                <span>Timeline &amp; Vòng thi</span>
              </Link>
              <Link
                href="/profile"
                className={getMobileLinkClass('/profile')}
              >
                <UserIcon className="size-4" />
                <span>Hồ sơ quản trị</span>
              </Link>
            </>
          )}

          {isJudge && (
            <>
              <Link
                href="/judge"
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/judge')
                    ? 'text-accent-violet bg-accent-violet/10 font-semibold'
                    : 'text-text-secondary hover:text-accent-violet hover:bg-surface-raised'
                }`}
              >
                <Scale className="size-4" />
                <span>Không gian chấm thi</span>
              </Link>
              <Link
                href="/profile"
                className={getMobileLinkClass('/profile')}
              >
                <UserIcon className="size-4" />
                <span>Hồ sơ &amp; Chuyên môn</span>
              </Link>
            </>
          )}

          {/* User Auth Footer on Mobile */}
          <div className="pt-3 border-t border-surface-border mt-3 space-y-2.5">
            {loading ? (
              <div className="w-full h-10 bg-surface-elevated animate-pulse rounded-lg" />
            ) : user ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-3 py-2 bg-surface-raised rounded-xl border border-surface-border">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-semantic-success animate-pulse" />
                    {isAdmin ? (
                      <Badge variant="warning" size="sm" className="px-1 py-0 text-[10px] font-bold">
                        BTC
                      </Badge>
                    ) : isJudge ? (
                      <Badge variant="brand" size="sm" className="px-1 py-0 text-[10px] font-bold">
                        BGK
                      </Badge>
                    ) : (
                      <Badge variant="info" size="sm" className="px-1 py-0 text-[10px] font-bold">
                        TS
                      </Badge>
                    )}
                    <span className="text-xs font-medium text-text-primary truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Đấu thủ'}
                    </span>
                    {isParticipant && isProfileComplete(profile) && (
                      <span title="Đã xác thực hồ sơ" aria-label="Đã xác thực hồ sơ" className="inline-flex items-center">
                        <BadgeCheck className="size-3.5 text-brand-cyan shrink-0" />
                      </span>
                    )}
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