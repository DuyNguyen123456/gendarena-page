'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Competition = {
  id: string
  title: string
  description: string
  rules?: string | null
  prizes?: string | null
  status: string
  registration_start?: string | null
  registration_end?: string | null
  submission_start?: string | null
  submission_end?: string | null
}

type User = {
  id: string
}

export default function CompetitionDetailPage() {
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const params = useParams()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', params.id)
        .single()
      setCompetition(data)
      setLoading(false)
    }
    loadData()
  }, [params.id, router, supabase])

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setMessage('❌ Người dùng chưa đăng nhập.')
      return
    }

    setSubmitLoading(true)
    setMessage('')

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: teamName, description: teamDesc, competition_id: params.id, leader_id: user.id })
      .select()
      .single()

    if (teamError) { setMessage('❌ Lỗi: ' + teamError.message); setSubmitLoading(false); return }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'leader' })

    if (memberError) { setMessage('❌ Lỗi: ' + memberError.message); setSubmitLoading(false); return }

    setMessage('✅ Tạo đội thành công! Bạn đã đăng ký tham gia cuộc thi.')
    setShowForm(false)
    setTeamName('')
    setTeamDesc('')
    setSubmitLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  if (!competition) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>Không tìm thấy cuộc thi.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/dashboard" style={{ display: 'inline-block', marginBottom: '20px', color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
          ← Quay lại Dashboard
        </Link>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '20px', fontSize: '13px', marginBottom: '16px' }}>
            {competition.status === 'registration' ? '📝 Đang mở đăng ký' : competition.status}
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 12px' }}>{competition.title}</h1>
          <p style={{ color: '#475569', fontSize: '16px', margin: 0 }}>{competition.description}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>📜 Thể lệ</h2>
            <p style={{ color: '#475569', whiteSpace: 'pre-line', margin: 0, lineHeight: 1.7 }}>{competition.rules || 'Đang cập nhật...'}</p>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>🏆 Giải thưởng</h2>
            <p style={{ color: '#475569', whiteSpace: 'pre-line', margin: 0, lineHeight: 1.7 }}>{competition.prizes || 'Đang cập nhật...'}</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>📅 Thời gian</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Mở đăng ký', value: competition.registration_start, bg: '#eff6ff' },
              { label: 'Hết đăng ký', value: competition.registration_end, bg: '#eff6ff' },
              { label: 'Bắt đầu nộp', value: competition.submission_start, bg: '#fff7ed' },
              { label: 'Hạn nộp bài', value: competition.submission_end, bg: '#fef2f2' },
            ].map((item) => (
              <div key={item.label} style={{ backgroundColor: item.bg, padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>{item.label}: </span>
                <strong>{item.value ? new Date(item.value).toLocaleDateString('vi-VN') : 'TBD'}</strong>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            👥 Đăng Ký Đội Thi
          </button>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>Tạo đội thi mới</h2>
            <form onSubmit={handleRegisterTeam}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Tên đội *</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="VD: Team Innovation"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Mô tả đội</label>
                <textarea
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn về đội của bạn..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={submitLoading}
                  style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {submitLoading ? '⏳ Đang tạo...' : 'Tạo đội'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ padding: '10px 24px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}