import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { ensureProfileExists, getProfile } from '@/services/profile'
import { isProfileComplete } from '@/lib/profile-utils'
import { createNotification } from '@/services/notifications'

/**
 * Translates Postgres / PostgREST errors for team join requests into user-friendly messages.
 * Specifically converts foreign key violation (23503) on profiles to a friendly Vietnamese prompt.
 */
export function formatTeamJoinError(error: any): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.'

  const code = String(error.code || '')
  const message = String(error.message || '')
  const details = String(error.details || '')

  // Lỗi Foreign Key constraint (23503): bảng profiles chưa có user record
  if (
    code === '23503' ||
    message.includes('23503') ||
    message.includes('team_join_requests_requester_id_profiles_fkey') ||
    message.includes('foreign key constraint') ||
    details.includes('team_join_requests_requester_id_profiles_fkey')
  ) {
    return 'Hồ sơ cá nhân của bạn chưa được khởi tạo. Vui lòng cập nhật hồ sơ trước khi xin vào đội.'
  }

  // Lỗi trùng lặp (23505): đã gửi request hoặc đã có quan hệ
  if (
    code === '23505' ||
    message.includes('23505') ||
    message.includes('duplicate key') ||
    message.includes('unique constraint')
  ) {
    return 'Bạn đã gửi yêu cầu gia nhập đội này rồi.'
  }

  return message || 'Không thể gửi yêu cầu gia nhập đội. Vui lòng thử lại sau.'
}

export type SendJoinRequestResult =
  | { ok: true }
  | { ok: false; error: string; isIncomplete?: boolean }

/**
 * Sends a team join request for a user.
 * Automatically checks and ensures that the user's profile exists and is complete before inserting.
 */
export async function sendTeamJoinRequest(
  teamId: string,
  user: User | { id: string; email?: string | null; user_metadata?: Record<string, any> | null }
): Promise<SendJoinRequestResult> {
  if (!user || !user.id) {
    return { ok: false, error: 'Bạn cần đăng nhập để thực hiện thao tác này.' }
  }

  const supabase = createClient()

  // 1. Đảm bảo profile luôn tồn tại trước khi gửi request
  const profileRes = await ensureProfileExists(user)
  if (!profileRes.ok) {
    return {
      ok: false,
      error: 'Hồ sơ cá nhân của bạn chưa được khởi tạo. Vui lòng cập nhật hồ sơ trước khi xin vào đội.',
      isIncomplete: true,
    }
  }

  // 2. Kiểm tra hồ sơ đã hoàn thiện đầy đủ 7 trường chưa
  const profile = await getProfile(user.id)
  if (!profile || !isProfileComplete(profile)) {
    return {
      ok: false,
      error: 'Vui lòng hoàn thiện hồ sơ cá nhân trước khi xin gia nhập đội.',
      isIncomplete: true,
    }
  }

  // 3. Kiểm tra xem user đã có đội chưa
  const { data: memberRecord } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberRecord) {
    return { ok: false, error: 'Bạn đã là thành viên của một đội thi khác.' }
  }

  // 4. Thực hiện insert join request
  const { error } = await supabase.from('team_join_requests').insert({
    team_id: teamId,
    requester_id: user.id,
    status: 'pending',
  })

  if (error) {
    console.error('Gửi yêu cầu gia nhập thất bại:', error)
    return { ok: false, error: formatTeamJoinError(error) }
  }

  // 5. Gửi thông báo cho Trưởng đội (try/catch an toàn không làm hỏng request chính)
  try {
    const { data: teamData } = await supabase
      .from('teams')
      .select('name, leader_id')
      .eq('id', teamId)
      .maybeSingle()

    if (teamData?.leader_id) {
      const requesterName = profile?.full_name || 'Một thí sinh'
      await createNotification({
        userId: teamData.leader_id,
        title: 'Yêu cầu gia nhập đội thi',
        message: `${requesterName} đã gửi yêu cầu gia nhập đội "${teamData.name}".`,
        type: 'team_request',
        link: '/dashboard',
      })
    }
  } catch (notifErr) {
    console.warn('[services/teams] Failed to create join request notification:', notifErr)
  }

  return { ok: true }
}

export type TeamMemberProfile = {
  id: string
  full_name: string | null
  university: string | null
  faculty: string | null
  major: string | null
  avatar_url: string | null
}

export type TeamMemberDetail = {
  id?: string
  user_id: string
  role?: string
  joined_at?: string
  profile?: TeamMemberProfile | null
}

export type BrowseTeam = {
  id: string
  name: string
  description: string | null
  max_members: number
  is_open: boolean
  leader_id: string
  competition_id: string
  leader?: TeamMemberProfile | null
  competitions?: {
    title: string
  } | null
  members: TeamMemberDetail[]
}

/**
 * Fetches single team details including leader profile and full member list with profiles.
 */
export async function getTeamWithMembers(teamId: string): Promise<BrowseTeam | null> {
  const supabase = createClient()
  try {
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select(`
        id, name, description, max_members, is_open, leader_id, competition_id,
        leader:profiles!leader_id(id, full_name, university, faculty, major, avatar_url),
        competitions(title),
        team_members(id, role, user_id, joined_at)
      `)
      .eq('id', teamId)
      .maybeSingle()

    if (teamError || !teamData) return null

    const memberUserIds = (teamData.team_members || []).map((m: any) => m.user_id)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, university, faculty, major, avatar_url')
      .in('id', memberUserIds)

    const profileMap: Record<string, TeamMemberProfile> = {}
    profilesData?.forEach((p) => {
      profileMap[p.id] = p
    })

    const members: TeamMemberDetail[] = (teamData.team_members || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: profileMap[m.user_id] ?? null,
    }))

    return {
      ...teamData,
      leader: (teamData.leader as unknown as TeamMemberProfile) ?? profileMap[teamData.leader_id] ?? null,
      members,
    } as unknown as BrowseTeam
  } catch (err) {
    console.error('[services/teams] Error in getTeamWithMembers:', err)
    return null
  }
}
