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
        } as never)

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
      <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
        {/* Glow Effects */}
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="tech-panel-glow p-8 max-w-md w-full text-center relative cyber-corners border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)] text-white">
          <div className="text-5xl mb-4 inline-block bg-cyan-950/30 border border-cyan-800/30 p-4 rounded-full text-cyan-400">✅</div>
          <h2 className="font-orbitron text-2xl font-extrabold mb-2 uppercase tracking-wider text-cyan-400">ĐĂNG KÝ THÀNH CÔNG!</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Hệ thống đã gửi email kích hoạt. Vui lòng kiểm tra hộp thư để xác thực tài khoản trước khi truy cập đấu trường.
          </p>
          <Link href="/login"
            className="tech-btn-accent font-orbitron inline-block px-8 py-3 rounded-lg text-sm tracking-widest text-black">
            ĐĂNG NHẬP NGAY
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container py-12">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="tech-panel-glow p-8 max-w-md w-full relative cyber-corners border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)] text-white">
        
        {/* Terminal Header */}
        <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/30 tracking-widest">
          SECURE REGISTER // REG_02
        </div>

        <h2 className="font-orbitron text-2xl font-extrabold text-center text-white mb-1 uppercase tracking-wider">
          🚀 ĐĂNG KÝ ĐẤU THỦ
        </h2>
        <p className="text-slate-400 text-xs font-medium text-center tracking-widest uppercase mb-6">
          Tạo tài khoản để tham gia GenD Arena
        </p>

        {error && (
          <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
            ❌ HỆ THỐNG BÁO LỖI: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1">
              HỌ VÀ TÊN *
            </label>
            <input
              name="fullName"
              required
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1">
              ĐỊA CHỈ EMAIL *
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1">
              SỐ ĐIỆN THOẠI
            </label>
            <input
              name="phone"
              placeholder="0901234567"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1">
              ĐƠN VỊ / TRƯỜNG HỌC
            </label>
            <input
              name="organization"
              placeholder="Đại học ABC"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1">
              MẬT KHẨU KHỞI TẠO *
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Ít nhất 6 ký tự"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1">
              XÁC NHẬN MẬT KHẨU *
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              placeholder="Nhập lại mật khẩu"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-900 to-[#112E81] hover:from-blue-800 hover:to-blue-700 text-white border border-cyan-500/30 font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(17,46,129,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 transition duration-200 cursor-pointer text-sm font-orbitron"
          >
            {loading ? '⏳ ĐANG KHỞI TẠO...' : 'ĐĂNG KÝ TÀI KHOẢN'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 font-semibold tracking-wide">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 hover:underline transition ml-1">
            ĐĂNG NHẬP
          </Link>
        </p>
      </div>
    </div>
  )
}