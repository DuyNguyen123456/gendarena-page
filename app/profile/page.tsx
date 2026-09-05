import { redirect } from 'next/navigation'

/**
 * Route /profile đã được sáp nhập toàn bộ vào /dashboard.
 * Mọi truy cập vào /profile sẽ được chuyển hướng tự động sang /dashboard.
 */
export default function ProfilePage() {
  redirect('/dashboard')
}
