'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const phone = formData.get('phone') as string
    const organization = formData.get('organization') as string

    const confirmPassword = formData.get('confirmPassword') as string
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      setLoading(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          phone: phone,
          organization: organization,
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center 
                      bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md 
                        w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Đăng ký thành công!</h2>
          <p className="text-gray-500 mb-6">
            Kiểm tra email để xác thực tài khoản, 
            sau đó đăng nhập.
          </p>
          <Link href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white 
                       rounded-lg hover:bg-blue-700">
            Đăng nhập
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-2">
          🚀 Đăng Ký Tham Gia
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Tạo tài khoản để bắt đầu hành trình khởi nghiệp
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
              Họ và tên *
            </label>
            <input
              name="fullName"
              required
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2 border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 
                         focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email *
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
              Số điện thoại
            </label>
            <input
              name="phone"
              placeholder="0901234567"
              className="w-full px-4 py-2 border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 
                         focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Trường / Công ty
            </label>
            <input
              name="organization"
              placeholder="Đại học ABC"
              className="w-full px-4 py-2 border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 
                         focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mật khẩu *
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Ít nhất 6 ký tự"
              className="w-full px-4 py-2 border rounded-lg 
                         focus:ring-2 focus:ring-blue-500 
                         focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Xác nhận mật khẩu *
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              placeholder="Nhập lại mật khẩu"
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
            {loading ? '⏳ Đang xử lý...' : 'Đăng Ký'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}