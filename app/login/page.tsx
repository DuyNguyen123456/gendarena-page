'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { KeyRound, XCircle, Loader2, X, CheckCircle } from 'lucide-react'

import { getPostLoginPath } from '@/lib/auth/routing'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Password Recovery state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

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

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')

    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: redirectUrl,
    })

    setResetLoading(false)

    if (resetErr) {
      setResetError(resetErr.message)
    } else {
      setShowResetModal(false)
      setToast({
        text: 'Email khôi phục đã gửi! Kiểm tra hộp thư của bạn.',
        type: 'success',
      })
      setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#0d1630] border border-cyan-500/40 text-cyan-300 px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.2)] text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Mật khẩu
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail('')
                  setResetError('')
                  setShowResetModal(true)
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-semibold transition cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>
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

      {/* Password Recovery Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="tech-panel p-6 max-w-md w-full relative border-cyan-500/30 bg-[#0a0f24] rounded-xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#1e2d5a] pb-3">
              <h3 className="font-orbitron text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>Khôi phục mật khẩu</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nhập địa chỉ email đã đăng ký tài khoản. Chúng tôi sẽ gửi đường dẫn khôi phục mật khẩu vào email của bạn.
            </p>

            {resetError && (
              <div className="bg-red-950/40 border border-red-500/40 text-red-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email liên kết</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-[#1e2d5a] rounded-lg transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-900 to-[#112E81] hover:from-blue-800 hover:to-blue-700 border border-cyan-500/30 text-white font-bold rounded-lg text-xs tracking-wider font-orbitron flex items-center gap-2 disabled:opacity-50 transition cursor-pointer"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    'Gửi email khôi phục'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
