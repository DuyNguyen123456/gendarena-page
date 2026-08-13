import type { Metadata } from 'next'
import { Suspense } from 'react'
import Loading from '@/components/loading'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập hệ thống GenD Arena 2026 để quản lý đội thi, theo dõi bài nộp và cập nhật thông tin mới nhất từ ban tổ chức.',
  openGraph: {
    title: 'Đăng nhập | GenD Arena 2026',
    description: 'Đăng nhập hệ thống GenD Arena 2026 để quản lý đội thi, theo dõi bài nộp và cập nhật thông tin mới nhất từ ban tổ chức.',
  },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading text="Đang tải trang đăng nhập..." />}>
      <LoginForm />
    </Suspense>
  )
}
