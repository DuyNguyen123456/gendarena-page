'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Team = {
  id: string
  name: string
  competition_id: string
}

type Submission = {
  id: string
  team_id: string
  competition_id: string
  title: string
  description: string
  pitch_deck_url: string | null
  video_url: string | null
  prototype_url: string | null
  status: string
  submitted_at: string
  teams?: { name: string } | null
}

export default function SubmissionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadSubmissions = useCallback(async (teams: Team[]) => {
    if (teams.length === 0) return
    const teamIds = teams.map((t) => t.id)
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, teams(name)')
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })
    setSubmissions(subs || [])
  }, [supabase])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      type TeamMemberRecord = {
        team_id: string
        teams: Team[] | null
      }

      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name, competition_id)')
        .eq('user_id', user.id) as { data: TeamMemberRecord[] | null }

      const teams = (memberData ?? [])
        .flatMap((m) => m.teams ?? [])
      setMyTeams(teams)
      await loadSubmissions(teams)
      setLoading(false)
    }
    loadData()
  }, [loadSubmissions, router, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const team = myTeams.find(t => t.id === selectedTeam)

    const userId = user?.id
    if (!userId) {
      setMessage('❌ Người dùng chưa đăng nhập')
      setSubmitLoading(false)
      return
    }

    let pitchDeckUrl = ''
    const pitchFile = formData.get('pitchDeck') as File
    if (pitchFile && pitchFile.size > 0) {
      const fileName = `${userId}/${Date.now()}_${pitchFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, pitchFile)

      if (uploadError) {
        setMessage('❌ Upload lỗi: ' + uploadError.message)
        setSubmitLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName)
      pitchDeckUrl = publicUrl
    }

    const { error } = await supabase
      .from('submissions')
      .insert({
        team_id: selectedTeam,
        competition_id: team?.competition_id,
        title: formData.get('title'),
        description: formData.get('description'),
        pitch_deck_url: pitchDeckUrl,
        video_url: formData.get('videoUrl'),
        prototype_url: formData.get('prototypeUrl'),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })

    if (error) {
      setMessage('❌ Lỗi: ' + error.message)
    } else {
      setMessage('✅ Nộp bài thành công!')
      setShowForm(false)
      await loadSubmissions(myTeams)
    }
    setSubmitLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/dashboard" style={{ display: 'inline-block', marginBottom: '20px', color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
          ← Quay lại Dashboard
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>📝 Bài Nộp Của Tôi</h1>
          {myTeams.length > 0 && (
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Nộp bài mới
            </button>
          )}
        </div>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.startsWith('✅') ? '#86efac' : '#fecaca'}`, color: message.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
            {message}
          </div>
        )}

        {myTeams.length === 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Bạn chưa tham gia đội nào</h3>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>Hãy đăng ký đội thi trước khi nộp bài.</p>
            <Link href="/dashboard" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
              Xem cuộc thi
            </Link>
          </div>
        )}

        {showForm && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>Nộp bài dự thi</h2>
            <form onSubmit={handleSubmit}>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Chọn đội *</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Chọn đội --</option>
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Tên dự án *</label>
                <input name="title" required placeholder="VD: EcoApp - Ứng dụng sống xanh"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Mô tả dự án *</label>
                <textarea name="description" required rows={4} placeholder="Mô tả ý tưởng, vấn đề giải quyết, giải pháp..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>📄 Pitch Deck (PDF, PPTX)</label>
                <input name="pitchDeck" type="file" accept=".pdf,.pptx,.ppt"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>🎥 Link Video Pitch</label>
                <input name="videoUrl" placeholder="https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>🔗 Link Demo / Prototype</label>
                <input name="prototypeUrl" placeholder="https://..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={submitLoading}
                  style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {submitLoading ? '⏳ Đang nộp...' : '📤 Nộp bài'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '12px 24px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>
                  Huỷ
                </button>
              </div>

            </form>
          </div>
        )}

        {submissions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Bài đã nộp</h2>
            {submissions.map((sub) => (
              <div key={sub.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 'bold' }}>{sub.title}</h3>
                    <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '14px' }}>Đội: {sub.teams?.name}</p>
                    <p style={{ margin: '0 0 12px', color: '#475569' }}>{sub.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                      {sub.pitch_deck_url && <a href={sub.pitch_deck_url} target="_blank" style={{ color: '#2563eb' }}>📄 Pitch Deck</a>}
                      {sub.video_url && <a href={sub.video_url} target="_blank" style={{ color: '#2563eb' }}>🎥 Video</a>}
                      {sub.prototype_url && <a href={sub.prototype_url} target="_blank" style={{ color: '#2563eb' }}>🔗 Demo</a>}
                    </div>
                  </div>
                  <span style={{ padding: '4px 12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    ✅ Đã nộp
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}