'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import { getDownloadUrl } from '@/services/submissions'

type SubmissionRow = {
  id: string
  submission_kind: 'file' | 'link'
  file_name: string | null
  submission_url: string | null
  file_path: string | null
  uploaded_at: string
  status: string
  phase_id: string | null
  teams?: { name: string } | null
  competition_phases?: { title: string } | null
}

type Phase = { id: string; title: string }

type TabKey = 'all' | 'pending' | string // string for phase IDs

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [userRole, setUserRole] = useState<string>('')
  const [judgeId, setJudgeId] = useState<string | null>(null)
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())

  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async (role: string, uid: string) => {
    let query = supabase
      .from('submissions')
      .select('id, submission_kind, file_name, submission_url, file_path, uploaded_at, status, phase_id, teams(name)')
      .order('uploaded_at', { ascending: false })

    // Judges only see their assigned submissions (RLS handles this, but we also filter client-side)
    if (role === 'judge') {
      const { data: assignments } = await supabase
        .from('judge_assignments')
        .select('submission_id')
        .eq('judge_id', uid)
      const ids = (assignments ?? []).map((a: { submission_id: string }) => a.submission_id)
      setAssignedIds(new Set(ids))
      if (ids.length > 0) {
        query = query.in('id', ids)
      } else {
        setSubmissions([])
        return
      }
    }

    const { data } = await query
    setSubmissions((data as unknown as SubmissionRow[]) || [])


    // Load phases for tab filter
    const { data: phaseData } = await supabase
      .from('competition_phases')
      .select('id, title')
      .order('display_order', { ascending: true })
    setPhases((phaseData as Phase[]) || [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'judge') {
        router.push('/dashboard')
        return
      }

      setUserRole(profile.role)
      if (profile.role === 'judge') setJudgeId(user.id)

      await loadData(profile.role, user.id)
      setLoading(false)
    }
    init()
  }, [supabase, router, loadData])

  const openAttachment = async (sub: SubmissionRow) => {
    if (sub.submission_kind === 'link' && sub.submission_url) {
      window.open(sub.submission_url, '_blank')
      return
    }
    if (sub.file_path) {
      const url = await getDownloadUrl(sub.file_path)
      if (url) window.open(url, '_blank')
    }
  }

  // Tab filtering
  const filtered = submissions.filter((sub) => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return sub.status === 'pending' || sub.status === 'submitted'
    return sub.phase_id === activeTab
  })

  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'submitted').length

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending:   { label: 'CHỜ CHẤM', cls: 'text-amber-400 border-amber-500/30 bg-amber-950/20' },
      submitted: { label: 'ĐÃ NỘP',   cls: 'text-amber-400 border-amber-500/30 bg-amber-950/20' },
      scored:    { label: 'ĐÃ CHẤM',  cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' },
      rejected:  { label: 'TỪ CHỐI',  cls: 'text-red-400 border-red-500/30 bg-red-950/20' },
    }
    const badge = map[status] ?? { label: status.toUpperCase(), cls: 'text-slate-400 border-slate-500/30 bg-slate-950/20' }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wider ${badge.cls}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) return <Loading text="LOADING SUBMISSIONS RECORD" />

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: submissions.length },
    { key: 'pending', label: 'Chờ chấm', count: pendingCount },
    ...phases.map(p => ({ key: p.id, label: p.title })),
  ]

  return (
    <div className="min-h-screen bg-[#050814] text-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href={userRole === 'admin' ? '/admin' : '/judge'} className="text-xs font-orbitron text-red-400 uppercase mb-8 inline-block hover:text-red-300 transition">
          ← QUAY LẠI PANEL {userRole === 'admin' ? 'ADMIN' : 'JUDGE'}
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl font-extrabold uppercase">📝 QUẢN LÝ BÀI NỘP</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
              {userRole === 'judge' ? 'Bài nộp được phân công cho bạn' : `Tổng: ${submissions.length} bài`}
            </p>
          </div>
          {userRole === 'admin' && (
            <Link
              href="/admin/assign"
              className="text-xs font-orbitron border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-950/20 transition"
            >
              👥 Phân công BGK
            </Link>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-orbitron uppercase tracking-wider transition border ${
                activeTab === tab.key
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                  : 'bg-transparent border-[#1e2d5a] text-slate-400 hover:border-cyan-500/30 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${activeTab === tab.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="tech-panel p-8 text-center text-slate-400 text-sm">
            {activeTab === 'pending' ? 'Không có bài nào đang chờ chấm.' : 'Chưa có bài nộp.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sub) => (
              <div key={sub.id} className="tech-panel p-5 rounded-xl border border-[#1e2d5a]/60 hover:border-cyan-500/30 transition group">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="font-orbitron font-bold uppercase text-white group-hover:text-cyan-400 transition">
                        {sub.teams?.name ?? 'Đội thi'}
                      </h3>
                      {statusBadge(sub.status)}
                      {userRole === 'admin' && assignedIds.size === 0 && (
                        <span className="text-[10px] font-orbitron text-slate-600 border border-slate-800 px-2 py-0.5 rounded">
                          ID: {sub.id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      {phases.find(p => p.id === sub.phase_id)?.title ?? '—'} • {new Date(sub.uploaded_at).toLocaleString('vi-VN')}
                    </p>
                    <p className="text-sm text-slate-300">
                      {sub.submission_kind === 'file' ? `📄 ${sub.file_name}` : `🔗 ${sub.submission_url}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openAttachment(sub)}
                      className="text-xs font-orbitron text-cyan-400 border border-[#1e2d5a] px-3 py-2 rounded-lg hover:bg-cyan-950/20 hover:border-cyan-500/40 transition"
                    >
                      Xem bài →
                    </button>
                    {userRole === 'judge' && (
                      <Link
                        href={`/judge/scoring?submission=${sub.id}`}
                        className="text-xs font-orbitron text-white bg-purple-700 hover:bg-purple-600 px-3 py-2 rounded-lg transition"
                      >
                        Chấm điểm
                      </Link>
                    )}
                    {userRole === 'admin' && (
                      <Link
                        href={`/admin/assign?highlight=${sub.id}`}
                        className="text-xs font-orbitron text-slate-300 border border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-900/60 transition"
                      >
                        Phân công
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
