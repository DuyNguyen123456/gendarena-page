'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Loading from '@/components/loading'

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckingSession((prev) => {
        if (prev) {
          setHasSession(false)
        }
        return false
      })
    }, 3000)

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') &&
        session
      ) {
        setHasSession(true)
        setCheckingSession(false)
      }
    })

    return () => {
      clearTimeout(timer)
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Vui lòng nhập mật khẩu mới.')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Đã có lỗi xảy ra khi cập nhật mật khẩu.')
      return
    }

    setSuccess(true)
    
    // Sign out to clear recovery session and force user to log in with new credentials
    await supabase.auth.signOut()

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login?reset=success')
    }, 3000)
  }

  if (checkingSession) {
    return <Loading text="Đang kiểm tra thông tin khôi phục..." />
  }

  if (!hasSession && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
        <div className="tech-panel-glow p-8 max-w-md w-full relative cyber-corners border-red-500/30 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-orbitron text-xl font-bold text-white uppercase tracking-wider">
            Liên kết không hợp lệ
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Phiên khôi phục mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng gửi lại yêu cầu đặt lại mật khẩu từ trang đăng nhập.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block w-full py-3 bg-gradient-to-r from-blue-900 to-[#112E81] hover:from-blue-800 hover:to-blue-700 text-white font-bold rounded-lg border border-cyan-500/30 text-sm font-orbitron transition"
            >
              Quay lại Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050814] p-4 relative scanline-container">
      {/* Background Glows */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-[#112E81]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="tech-panel-glow p-8 max-w-md w-full relative cyber-corners border-cyan-500/20 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
        <h2 className="font-orbitron text-2xl font-extrabold text-center text-white mb-2 tracking-wider flex items-center justify-center gap-2 uppercase">
          <KeyRound className="w-6 h-6 text-cyan-400" />
          <span>Đặt lại mật khẩu</span>
        </h2>
        <p className="text-xs text-slate-400 text-center mb-6">
          Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
        </p>

        {success ? (
          <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 p-6 rounded-xl text-center space-y-4 animate-in fade-in duration-300">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-1">
                Đổi mật khẩu thành công!
              </h3>
              <p className="text-xs text-emerald-200">
                Mật khẩu mới đã được cập nhật. Bạn sẽ tự động chuyển về trang đăng nhập trong giây lát...
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs font-orbitron transition cursor-pointer"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-start gap-2">
                <XCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mật khẩu mới (tối thiểu 6 ký tự)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Xác nhận mật khẩu mới</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-950/60 border border-[#1e2d5a] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-900 to-[#112E81] hover:from-blue-800 hover:to-blue-700 text-white border border-cyan-500/30 font-bold tracking-wider rounded-lg shadow-[0_0_15px_rgba(17,46,129,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50 transition duration-200 cursor-pointer text-sm font-orbitron flex items-center justify-center gap-2 uppercase"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  'Cập nhật mật khẩu'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
