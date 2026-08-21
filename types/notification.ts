export type NotificationType =
  | 'team_invite'
  | 'submission'
  | 'result'
  | 'system'
  | 'profile'
  | 'info'

export interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  link?: string | null
  is_read: boolean
  created_at: string
}
