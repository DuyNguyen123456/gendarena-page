'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-2">
          👋 Đăng Nhập
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Chào mừng bạn quay lại
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 
                          px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="w-full px-4 py-2 border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 
                         focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mật khẩu
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••"
              className="w-full px-4 py-2 border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 
                         focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg 
                       font-medium hover:bg-blue-700 
                       disabled:opacity-50 transition">
            {loading ? '⏳ Đang xử lý...' : 'Đăng Nhập'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  )
}