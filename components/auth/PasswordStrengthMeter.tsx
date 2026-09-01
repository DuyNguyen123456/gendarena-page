'use client'

import { useMemo } from 'react'
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password?: string
}

export function calculatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3
  label: string
  color: string
  barClass: string
  hint: string
} {
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: '',
      color: 'text-text-tertiary',
      barClass: 'bg-surface-border',
      hint: 'Tối thiểu 8 ký tự, kết hợp chữ và số để tăng bảo mật.',
    }
  }

  const length = password.length
  const hasNumber = /\d/.test(password)
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (length < 8) {
    return {
      score: 1,
      label: 'Yếu',
      color: 'text-semantic-danger',
      barClass: 'bg-semantic-danger',
      hint: `Cần thêm ít nhất ${8 - length} ký tự nữa để đạt chuẩn an toàn.`,
    }
  }

  // Length >= 8
  const diversityCount = (hasNumber ? 1 : 0) + (hasLetter ? 1 : 0) + ((hasUpper && hasLower) ? 1 : 0) + (hasSpecial ? 1 : 0)

  if (diversityCount >= 3 || length >= 12) {
    return {
      score: 3,
      label: 'Rất mạnh',
      color: 'text-semantic-success',
      barClass: 'bg-semantic-success shadow-[0_0_8px_rgba(34,197,94,0.4)]',
      hint: 'Mật khẩu độ bảo mật cao, an toàn trước các cuộc tấn công.',
    }
  }

  return {
    score: 2,
    label: 'Khá',
    color: 'text-semantic-warning',
    barClass: 'bg-semantic-warning shadow-[0_0_8px_rgba(245,158,11,0.3)]',
    hint: 'Gợi ý: Thêm ký tự viết hoa hoặc ký tự đặc biệt (!@#$) để mạnh hơn.',
  }
}

export default function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  if (!password) {
    return (
      <p className="text-[11px] text-text-tertiary mt-1.5 flex items-center gap-1">
        <Shield className="size-3 text-text-tertiary shrink-0" />
        <span>Mật khẩu tối thiểu 8 ký tự, nên gồm chữ và số.</span>
      </p>
    )
  }

  return (
    <div className="space-y-1.5 mt-2 animate-in fade-in duration-200">
      {/* 3-segment indicator bar */}
      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 1 ? strength.barClass : 'bg-surface-border'
          }`}
        />
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 2 ? strength.barClass : 'bg-surface-border'
          }`}
        />
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 3 ? strength.barClass : 'bg-surface-border'
          }`}
        />
      </div>

      {/* Label and Hint */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-tertiary flex items-center gap-1 truncate pr-2">
          {strength.score >= 3 ? (
            <ShieldCheck className="size-3.5 text-semantic-success shrink-0" />
          ) : strength.score >= 2 ? (
            <Shield className="size-3.5 text-semantic-warning shrink-0" />
          ) : (
            <ShieldAlert className="size-3.5 text-semantic-danger shrink-0" />
          )}
          <span className="truncate">{strength.hint}</span>
        </span>
        <span className={`font-semibold shrink-0 font-display ${strength.color}`}>
          {strength.label}
        </span>
      </div>
    </div>
  )
}
