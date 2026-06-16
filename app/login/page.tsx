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
    <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="tech-panel-glow p-8 max-w-md w-full relative cyber-corners border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
        
        {/* Terminal Header */}
        <div className="absolute top-2 right-4 text-[9px] font-orbitron font-bold text-cyan-500/30 tracking-widest">
          SECURE CONNECTION // AUTH_01
        </div>

        <h2 className="font-orbitron text-2xl font-extrabold text-center text-white mb-1 uppercase tracking-wider">
          🔑 XÁC MINH DANH TÍNH
        </h2>
        <p className="text-slate-400 text-xs font-medium text-center tracking-widest uppercase mb-8">
          Đăng nhập vào hệ thống điều khiển
        </p>

        {error && (
          <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            ❌ HỆ THỐNG BÁO LỖI: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">
              ĐỊA CHỈ EMAIL
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
            <label className="block text-xs font-bold tracking-widest uppercase text-slate-300 mb-1.5">
              MẬT KHẨU TRUY CẬP
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-900 to-[#112E81] hover:from-blue-800 hover:to-blue-700 text-white border border-cyan-500/30 font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(17,46,129,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 transition duration-200 cursor-pointer text-sm font-orbitron"
          >
            {loading ? '⏳ ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP HỆ THỐNG'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 font-semibold tracking-wide">
          Chưa đăng ký quyền truy cập?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 hover:underline transition ml-1">
            ĐĂNG KÝ NGAY
          </Link>
        </p>
      </div>
    </div>
  )
}