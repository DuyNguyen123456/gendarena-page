'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  Inbox,
  Users,
  Upload,
  Trophy,
  User,
  Shield,
  Info,
} from 'lucide-react'
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/services/notifications'
import type { AppNotification, NotificationType } from '@/types/notification'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Vừa xong'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'team_invite':
      return <Users className="size-4 text-brand-cyan shrink-0" />
    case 'submission':
      return <Upload className="size-4 text-accent-violet shrink-0" />
    case 'result':
      return <Trophy className="size-4 text-semantic-warning shrink-0" />
    case 'profile':
      return <User className="size-4 text-semantic-info shrink-0" />
    case 'system':
      return <Shield className="size-4 text-brand-cyan shrink-0" />
    case 'info':
    default:
      return <Info className="size-4 text-text-secondary shrink-0" />
  }
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) return
    const count = await getUnreadCount(userId)
    setUnreadCount(count)
  }, [userId])

  const loadNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const data = await getUserNotifications(userId, 15)
    setNotifications(data)
    setLoading(false)
  }, [userId])

  // Polling every 30 seconds
  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  // Fetch full list when opening dropdown
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, loadNotifications])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    if (notif.link) {
      setIsOpen(false)
      router.push(notif.link)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Thông báo"
        className="relative size-8 sm:size-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-brand-cyan hover:bg-surface-raised transition border border-transparent hover:border-surface-border focus:outline-none"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-semantic-danger text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-surface-overlay/95 backdrop-blur-xl border border-surface-border shadow-elevation-3 z-dropdown overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-raised/40">
            <div className="flex items-center gap-2">
              <h4 className="font-display font-semibold text-sm text-text-primary">
                Thông báo
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-brand-cyan/15 text-brand-cyan">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-brand-cyan transition font-medium"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="size-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-border/50">
            {loading ? (
              <div className="py-8 text-center text-xs text-text-tertiary">
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center text-text-tertiary">
                <Inbox className="size-8 stroke-1 text-text-disabled mb-2" />
                <p className="text-xs">Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-surface-raised/70 ${
                    !notif.is_read ? 'bg-brand-cyan/5' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-surface-raised border border-surface-border">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !notif.is_read
                            ? 'font-semibold text-text-primary'
                            : 'font-medium text-text-secondary'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="size-2 rounded-full bg-brand-cyan shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-text-disabled mt-1 font-mono">
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
