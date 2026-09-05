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

export interface NotifySubmissionParams {
  teamId: string
  submitterId: string
  action: 'submit' | 'replace'
  detail?: string
  phaseTitle?: string
}

/**
 * Sends 'Nộp bài thành công' or 'Thay đổi bài nộp thành công' notification
 * to all team members and the leader.
 */
export async function notifySubmissionSuccess({
  teamId,
  submitterId,
  action,
  detail,
  phaseTitle,
}: NotifySubmissionParams): Promise<void> {
  const supabase = createClient()
  try {
    const { data: teamData } = await supabase
      .from('teams')
      .select('name, leader_id, team_members(user_id)')
      .eq('id', teamId)
      .single()

    const allMemberIds = Array.from(
      new Set([
        submitterId,
        teamData?.leader_id,
        ...(teamData?.team_members || []).map((m: any) => m.user_id),
      ].filter(Boolean))
    )

    const isReplace = action === 'replace'
    const title = isReplace ? 'Thay đổi bài nộp thành công' : 'Nộp bài thành công'
    const teamNameStr = teamData?.name ? `Đội "${teamData.name}"` : 'Đội thi của bạn'
    const phaseStr = phaseTitle ? ` cho vòng "${phaseTitle}"` : ''
    const detailStr = detail ? ` (${detail})` : ''

    const message = isReplace
      ? `${teamNameStr} đã cập nhật lại bài nộp thành công${phaseStr}${detailStr}.`
      : `${teamNameStr} đã nộp bài thi thành công${phaseStr}${detailStr}.`

    for (const uid of allMemberIds) {
      await createNotification({
        userId: uid,
        title,
        message,
        type: 'submission',
        link: '/submissions',
      })
    }
  } catch (err) {
    console.warn('[services/notifications] Failed to notify submission:', err)
  }
}

/**
 * Sends notification about profile update status:
 * - 'Thông tin của bạn đã được cập nhật thành công' (khi cập nhật đủ thông tin)
 * - 'Thí sinh lưu ý cập nhật đủ thông tin cá nhân' (khi còn thiếu thông tin bắt buộc)
 */
export async function notifyProfileUpdateStatus(
  userId: string,
  isComplete: boolean
): Promise<void> {
  try {
    if (isComplete) {
      await createNotification({
        userId,
        title: 'Thông tin của bạn đã được cập nhật thành công',
        message: 'Hồ sơ thông tin cá nhân của bạn đã được cập nhật đầy đủ và hợp lệ trên hệ thống GenD Arena.',
        type: 'profile',
        link: '/dashboard?tab=profile',
      })
    } else {
      await createNotification({
        userId,
        title: 'Thí sinh lưu ý cập nhật đủ thông tin cá nhân',
        message: 'Hồ sơ của bạn đã được lưu nhưng vẫn còn thiếu một số mục thông tin bắt buộc. Vui lòng bổ sung đầy đủ để đủ điều kiện tham gia đội thi và nộp bài.',
        type: 'profile',
        link: '/dashboard?tab=profile',
      })
    }
  } catch (err) {
    console.warn('[services/notifications] Failed to notify profile status:', err)
  }
}

/**
 * Sends reminder notification 'Thí sinh lưu ý cập nhật đủ thông tin cá nhân'
 * if the user has not completed their profile (with 24h deduplication).
 */
export async function checkAndSendIncompleteProfileReminder(
  userId: string,
  isComplete: boolean
): Promise<void> {
  if (isComplete) return

  const supabase = createClient()
  try {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('title', 'Thí sinh lưu ý cập nhật đủ thông tin cá nhân')
      .order('created_at', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      const lastCreated = new Date(existing[0].created_at).getTime()
      const hoursDiff = (Date.now() - lastCreated) / (1000 * 60 * 60)
      if (hoursDiff < 24) return
    }

    await createNotification({
      userId,
      title: 'Thí sinh lưu ý cập nhật đủ thông tin cá nhân',
      message: 'Vui lòng cập nhật đầy đủ thông tin cá nhân (họ tên, trường, khoa, chuyên ngành, số điện thoại, ngày sinh) để đủ điều kiện tham gia đội thi và nộp bài.',
      type: 'profile',
      link: '/dashboard?tab=profile',
    })
  } catch (err) {
    console.warn('[services/notifications] Failed to send profile reminder:', err)
  }
}

