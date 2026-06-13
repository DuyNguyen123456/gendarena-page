'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Submission {
  id: string
  title: string
  avg_score: number | null
  judge_count: number
  teams?: { name: string }
  competitions?: { title: string }
}

interface Score {
  submission_id: string
  total_score: number
}

export default function Leaderboard() {
  const [rankings, setRankings] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!['admin', 'judge'].includes(profile?.role)) { router.push('/dashboard'); return }

      const { data: subs } = await supabase
        .from('submissions')
        .select('*, teams(name), competitions(title)')

      const { data: scoresData } = await supabase.from('scores').select('*')

      const ranked = (subs || []).map((sub: Submission) => {
        const subScores = (scoresData as Score[] || []).filter((s: Score) => s.submission_id === sub.id)
        const avgScore = subScores.length > 0
          ? subScores.reduce((sum: number, s: Score) => sum + (s.total_score || 0), 0) / subScores.length
          : null
        return { ...sub, avg_score: avgScore, judge_count: subScores.length }
      })
      .filter((s: Submission) => s.avg_score !== null)
      .sort((a: Submission, b: Submission) => (b.avg_score || 0) - (a.avg_score || 0))

      setRankings(ranked)
      setLoading(false)
    }
    init()
  }, [router])

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `#${idx + 1}`
  }

  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>⏳ Đang tải...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/admin" style={{ display: 'inline-block', marginBottom: '20px', color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
          ← Quay lại Admin
        </Link>

        <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 'bold' }}>🏅 Bảng xếp hạng</h1>

        {rankings.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#64748b' }}>Chưa có bài nào được chấm điểm.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {rankings.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderBottom: idx < rankings.length - 1 ? '1px solid #f1f5f9' : 'none',
                  backgroundColor: idx < 3 ? '#fefce8' : 'white',
                }}
              >
                <div style={{ width: '60px', fontSize: idx < 3 ? '28px' : '18px', fontWeight: 'bold', textAlign: 'center' }}>
                  {getMedal(idx)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {item.teams?.name} · {item.competitions?.title} · {item.judge_count} giám khảo
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ĐIỂM TB</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{item.avg_score?.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}