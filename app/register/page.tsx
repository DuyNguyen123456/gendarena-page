import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = {
  title: 'Đăng ký tài khoản',
  description: 'Đăng ký tài khoản đấu thủ GenD Arena 2026 để thành lập đội thi, nộp bài dự thi và tranh tài trên sàn đấu công nghệ.',
  openGraph: {
    title: 'Đăng ký tài khoản | GenD Arena 2026',
    description: 'Đăng ký tài khoản đấu thủ GenD Arena 2026 để thành lập đội thi, nộp bài dự thi và tranh tài trên sàn đấu công nghệ.',
  },
}

export default function RegisterPage() {
  return <RegisterForm />
}