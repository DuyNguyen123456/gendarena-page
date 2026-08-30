import { createClient } from '@/lib/supabase'
import type { AppNotification, NotificationType } from '@/types/notification'

export async function getUserNotifications(
  userId: string,
  limit = 10
): Promise<AppNotification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return (data as AppNotification[]) || []
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as never)
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    return false
  }

  return true
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as never)
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }

  return true
}

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: NotificationType
  link?: string | null
}

/**
 * Creates a new notification record in the database.
 * Wrapped in try/catch to ensure caller flows are not blocked if notification fails.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link = null,
}: CreateNotificationParams): Promise<boolean> {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
    })

    if (error) {
      console.warn('[services/notifications] Failed to insert notification:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[services/notifications] Exception in createNotification:', err)
    return false
  }
}
