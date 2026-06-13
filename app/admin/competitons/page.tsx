'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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
  max_team_size?: number | null
  created_at?: string | null
}

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadCompetitions = useCallback(async () => {
    const { data } = await supabase
      .from('competitions').select('*').order('created_at', { ascending: false })
    setCompetitions(data || [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      await loadCompetitions()
      setLoading(false)
    }
    init()
  }, [router, supabase, loadCompetitions])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const payload = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      rules: formData.get('rules') as string,
      prizes: formData.get('prizes') as string,
      status: formData.get('status') as string,
      registration_start: formData.get('registration_start') || null,
      registration_end: formData.get('registration_end') || null,
      submission_start: formData.get('submission_start') || null,
      submission_end: formData.get('submission_end') || null,
      max_team_size: parseInt(formData.get('max_team_size') as string) || 5,
    }

    const { error } = editingId
      ? await supabase.from('competitions').update(payload).eq('id', editingId)
      : await supabase.from('competitions').insert(payload)

    if (error) {
      setMessage('❌ Lỗi: ' + error.message)
    } else {
      setMessage(editingId ? '✅ Cập nhật thành công!' : '✅ Tạo cuộc thi thành công!')
      setShowForm(false)
      setEditingId(null)
      await loadCompetitions()
    }
    setSubmitLoading(false)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xoá cuộc thi "${title}"? Hành động này không thể hoàn tác.`)) return
    const { error } = await supabase.from('competitions').delete().eq('id', id)
    if (error) setMessage('❌ Lỗi: ' + error.message)
    else { setMessage('✅ Đã xoá'); await loadCompetitions() }
  }

  const handleEdit = (comp: Competition) => {
    setEditingId(comp.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editingComp = competitions.find(c => c.id === editingId)

  const formatDateTimeLocal = (iso?: string | null) => {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 16)
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>🏆 Quản lý cuộc thi</h1>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null) }}
              style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Tạo cuộc thi
            </button>
          )}
        </div>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.startsWith('✅') ? '#86efac' : '#fecaca'}`, color: message.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
            {message}
          </div>
        )}

        {showForm && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px' }}>
              {editingId ? '✏️ Chỉnh sửa cuộc thi' : '➕ Tạo cuộc thi mới'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Tên cuộc thi *</label>
                <input name="title" required defaultValue={editingComp?.title || ''}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Mô tả ngắn *</label>
                <textarea name="description" required rows={2} defaultValue={editingComp?.description || ''}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Thể lệ</label>
                  <textarea name="rules" rows={5} defaultValue={editingComp?.rules || ''}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Giải thưởng</label>
                  <textarea name="prizes" rows={5} defaultValue={editingComp?.prizes || ''}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Trạng thái</label>
                  <select name="status" defaultValue={editingComp?.status || 'upcoming'}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}>
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="registration">Đang mở đăng ký</option>
                    <option value="submission">Đang nộp bài</option>
                    <option value="judging">Đang chấm điểm</option>
                    <option value="completed">Đã kết thúc</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Số thành viên tối đa/đội</label>
                  <input name="max_team_size" type="number" min="1" max="20" defaultValue={editingComp?.max_team_size || 5}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Mở đăng ký</label>
                  <input name="registration_start" type="datetime-local" defaultValue={formatDateTimeLocal(editingComp?.registration_start)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Hết đăng ký</label>
                  <input name="registration_end" type="datetime-local" defaultValue={formatDateTimeLocal(editingComp?.registration_end)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Bắt đầu nộp bài</label>
                  <input name="submission_start" type="datetime-local" defaultValue={formatDateTimeLocal(editingComp?.submission_start)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Hạn nộp bài</label>
                  <input name="submission_end" type="datetime-local" defaultValue={formatDateTimeLocal(editingComp?.submission_end)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={submitLoading}
                  style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {submitLoading ? '⏳ Đang lưu...' : (editingId ? '💾 Cập nhật' : '➕ Tạo')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }}
                  style={{ padding: '12px 24px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          {competitions.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <p style={{ color: '#64748b' }}>Chưa có cuộc thi nào. Click &quot;Tạo cuộc thi&quot; để bắt đầu.</p>
            </div>
          ) : (
            competitions.map((comp) => (
              <div key={comp.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold' }}>{comp.title}</h3>
                      <span style={{ padding: '3px 10px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '20px', fontSize: '12px' }}>
                        {comp.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{comp.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button onClick={() => handleEdit(comp)}
                      style={{ padding: '8px 16px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
                      ✏️ Sửa
                    </button>
                    <button onClick={() => handleDelete(comp.id, comp.title)}
                      style={{ padding: '8px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
                      🗑️ Xoá
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}