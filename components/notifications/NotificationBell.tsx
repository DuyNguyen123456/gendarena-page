'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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
    case 'team_request':
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
  const router = useRouter()

  // SWR for unread count (polls every 30s)
  const { data: unreadCount = 0, mutate: mutateUnread } = useSWR(
    userId ? `notifications_unread_${userId}` : null,
    () => getUnreadCount(userId),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  )

  // SWR for notification list (fetches when popover is open)
  const {
    data: notifications = [],
    mutate: mutateNotifications,
    isLoading: loading,
  } = useSWR(
    userId && isOpen ? `notifications_list_${userId}` : null,
    () => getUserNotifications(userId, 20),
    {
      revalidateOnFocus: true,
    }
  )

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
      mutateNotifications(
        (prev = []) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
        false
      )
      mutateUnread((prev = 0) => Math.max(0, prev - 1), false)
    }

    if (notif.link) {
      setIsOpen(false)
      router.push(notif.link)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId)
    mutateNotifications(
      (prev = []) => prev.map((n) => ({ ...n, is_read: true })),
      false
    )
    mutateUnread(0, false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
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
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[100] w-[calc(100vw-2rem)] sm:w-[400px] max-h-[480px] p-0 overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl backdrop-blur-none right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
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
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 bg-slate-950">
          {loading ? (
            <div className="py-8 text-center text-xs text-text-tertiary">
              Đang tải thông báo...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center text-text-tertiary">
              <Inbox className="size-8 stroke-1 text-text-disabled mb-2 opacity-50" />
              <p className="text-xs font-medium text-text-secondary">Chưa có thông báo nào</p>
              <p className="text-[11px] text-text-disabled mt-0.5">Các cập nhật quan trọng sẽ hiển thị tại đây</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-900/70 ${
                  !notif.is_read ? 'bg-slate-900/40' : 'bg-transparent'
                }`}
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
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
                      <span className="size-2 rounded-full bg-brand-cyan shrink-0 shadow-sm shadow-brand-cyan/50" />
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
      </PopoverContent>
    </Popover>
  )
}
