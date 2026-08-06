'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { KeyRound, XCircle, Loader2 } from 'lucide-react'

import { getPostLoginPath } from '@/lib/auth/routing'

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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user!.id)
      .single()

    router.refresh()
    router.push(getPostLoginPath(profile?.role))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="tech-panel-glow p-8 max-w-md w-full relative cyber-corners border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
        

        <h2 className="font-orbitron text-2xl font-extrabold text-center text-white mb-6 tracking-wider flex items-center justify-center gap-2">
          <KeyRound className="w-5 h-5 text-cyan-400" />
          <span>Đăng nhập</span>
        </h2>

        {error && (
          <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>Lỗi: {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mật khẩu
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
            className="w-full py-3.5 bg-gradient-to-r from-blue-900 to-[#112E81] hover:from-blue-800 hover:to-blue-700 text-white border border-cyan-500/30 font-bold tracking-wider rounded-lg shadow-[0_0_15px_rgba(17,46,129,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 transition duration-200 cursor-pointer text-sm font-orbitron flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 font-semibold tracking-wide">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 hover:underline transition ml-1">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
