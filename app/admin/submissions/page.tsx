'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Submission {
  id: string
  title: string
  description: string
  pitch_deck_url?: string
  video_url?: string
  prototype_url?: string
  created_at: string
  teams?: { name: string }
  competitions?: { title: string }
}

interface Score {
  id: string
  submission_id: string
  judge_id: string
  innovation_score: number
  feasibility_score: number
  presentation_score: number
  impact_score: number
  total_score: number
  comment: string
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [scoringId, setScoringId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [message, setMessage] = useState('')
  const [scores, setScores] = useState<Record<string, Score>>({})
  const router = useRouter()
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function loadData() {
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, teams(name), competitions(title)')
      .order('created_at', { ascending: false })

    const { data: scoresData } = await supabase.from('scores').select('*')
    const scoresMap: Record<string, Score> = {}
    scoresData?.forEach((s) => { scoresMap[s.submission_id] = s })

    setSubmissions(subs || [])
    setScores(scoresMap)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!['admin', 'judge'].includes(profile?.role)) { router.push('/dashboard'); return }

      await loadData()
      setLoading(false)
    }
    init()
  }, [supabase, router, loadData])

  const handleScore = async (e: React.FormEvent<HTMLFormElement>, submissionId: string) => {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)

    const innovation = parseInt(formData.get('innovation') as string)
    const feasibility = parseInt(formData.get('feasibility') as string)
    const presentation = parseInt(formData.get('presentation') as string)
    const impact = parseInt(formData.get('impact') as string)
    const total = (innovation + feasibility + presentation + impact) / 4

    const payload = {
      submission_id: submissionId,
      judge_id: user.id,
      innovation_score: innovation,
      feasibility_score: feasibility,
      presentation_score: presentation,
      impact_score: impact,
      total_score: total,
      comment: formData.get('comment') as string,
    }

    const existing = scores[submissionId]
    const { error } = existing
      ? await supabase.from('scores').update(payload).eq('id', existing.id)
      : await supabase.from('scores').insert(payload)

    if (error) {
      setMessage('❌ Lỗi: ' + error.message)
    } else {
      setMessage('✅ Đã lưu điểm!')
      setScoringId(null)
      await loadData()
    }
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/admin" style={{ display: 'inline-block', marginBottom: '20px', color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
          ← Quay lại Admin
        </Link>

        <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 'bold' }}>📝 Bài nộp ({submissions.length})</h1>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.startsWith('✅') ? '#86efac' : '#fecaca'}`, color: message.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
            {message}
          </div>
        )}

        {submissions.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#64748b' }}>Chưa có bài nộp nào.</p>
          </div>
        ) : (
          submissions.map((sub) => {
            const score = scores[sub.id]
            return (
              <div key={sub.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold' }}>{sub.title}</h3>
                    <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#64748b' }}>
                      <strong>Đội:</strong> {sub.teams?.name} · <strong>Cuộc thi:</strong> {sub.competitions?.title}
                    </p>
                    <p style={{ margin: '8px 0 0', color: '#475569' }}>{sub.description}</p>
                  </div>
                  {score && (
                    <div style={{ marginLeft: '16px', padding: '8px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#16a34a', marginBottom: '2px' }}>ĐÃ CHẤM</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a' }}>{score.total_score?.toFixed(1)}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px' }}>
                  {sub.pitch_deck_url && <a href={sub.pitch_deck_url} target="_blank" style={{ color: '#2563eb' }}>📄 Pitch Deck</a>}
                  {sub.video_url && <a href={sub.video_url} target="_blank" style={{ color: '#2563eb' }}>🎥 Video</a>}
                  {sub.prototype_url && <a href={sub.prototype_url} target="_blank" style={{ color: '#2563eb' }}>🔗 Demo</a>}
                </div>

                {scoringId !== sub.id && (
                  <button
                    onClick={() => setScoringId(sub.id)}
                    style={{ padding: '8px 16px', backgroundColor: score ? '#eff6ff' : '#2563eb', color: score ? '#2563eb' : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {score ? '✏️ Sửa điểm' : '⚖️ Chấm điểm'}
                  </button>
                )}

                {scoringId === sub.id && (
                  <form onSubmit={(e) => handleScore(e, sub.id)} style={{ marginTop: '16px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 'bold' }}>Chấm điểm (0-10 mỗi tiêu chí)</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      {[
                        { name: 'innovation', label: '💡 Sáng tạo', default: score?.innovation_score },
                        { name: 'feasibility', label: '🛠️ Khả thi', default: score?.feasibility_score },
                        { name: 'presentation', label: '🎤 Trình bày', default: score?.presentation_score },
                        { name: 'impact', label: '🌍 Tác động', default: score?.impact_score },
                      ].map((field) => (
                        <div key={field.name}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{field.label}</label>
                          <input name={field.name} type="number" min="0" max="10" required defaultValue={field.default ?? ''}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Nhận xét</label>
                      <textarea name="comment" rows={2} defaultValue={score?.comment || ''}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
                        💾 Lưu điểm
                      </button>
                      <button type="button" onClick={() => setScoringId(null)}
                        style={{ padding: '8px 16px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        Huỷ
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )
          })
        )}

      </div>
    </div>
  )
}