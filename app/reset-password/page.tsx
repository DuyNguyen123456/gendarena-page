import type { Metadata } from 'next'
import { Suspense } from 'react'
import Loading from '@/components/loading'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  description: 'Khôi phục và cập nhật mật khẩu mới cho tài khoản đấu thủ GenD Arena 2026.',
  openGraph: {
    title: 'Đặt lại mật khẩu | GenD Arena 2026',
    description: 'Khôi phục và cập nhật mật khẩu mới cho tài khoản đấu thủ GenD Arena 2026.',
  },
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading text="Đang tải..." />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
