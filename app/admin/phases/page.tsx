'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { CompetitionPhase, PhaseFormData, PhaseStatus } from '@/types/phase'
import { getPhases, createPhase, updatePhase, deletePhase } from '@/services/phases'
import { Book, Microscope, Trophy, Flag, Star, Circle, Calendar, Target, ClipboardList, PenTool, Edit2, Trash2, Plus } from 'lucide-react'

function StatusBadge({ status }: { status: PhaseStatus }) {
  if (status === 'active') {
    return <span className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">● ĐANG MỞ</span>
  }
  if (status === 'completed') {
    return <span className="bg-blue-950/50 border border-blue-500/40 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">✓ ĐÃ KẾT THÚC</span>
  }
  return <span className="bg-slate-800/60 border border-slate-600/40 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-orbitron">SẮP TỚI</span>
}

export default function AdminPhasesPage() {
  const [phases, setPhases] = useState<CompetitionPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<PhaseFormData>({
    phase_number: 1,
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'upcoming',
    icon: 'circle',
    display_order: 1
  })

  const router = useRouter()
  const supabase = createClient()

  const loadData = async () => {
    try {
      const data = await getPhases()
      setPhases(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      
      await loadData()
      setLoading(false)
    }
    init()
  }, [router, supabase])

  const handleOpenModal = (phase?: CompetitionPhase) => {
    if (phase) {
      setEditingId(phase.id)
      setFormData({
        phase_number: phase.phase_number,
        title: phase.title,
        description: phase.description,
        start_date: phase.start_date ? phase.start_date.substring(0, 10) : '',
        end_date: phase.end_date ? phase.end_date.substring(0, 10) : '',
        status: phase.status,
        icon: phase.icon,
        display_order: phase.display_order
      })
    } else {
      setEditingId(null)
      setFormData({
        phase_number: phases.length + 1,
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'upcoming',
        icon: 'circle',
        display_order: phases.length + 1
      })
    }
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá phase này không?')) return
    try {
      await deletePhase(id)
      await loadData()
    } catch (e) {
      console.error('Lỗi khi xoá phase', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: PhaseFormData = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null as any,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null as any,
      }
      if (editingId) {
        await updatePhase(editingId, payload)
      } else {
        await createPhase(payload)
      }
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Lỗi lưu phase', error)
      alert('Đã xảy ra lỗi khi lưu phase.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center font-orbitron tracking-widest">
      <p className="animate-pulse">⏳ LOADING TIMELINE DATA...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg text-white py-12 px-4 relative scanline-container">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#1e2d5a] pb-6">
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              🗓️ QUẢN LÝ LỊCH TRÌNH
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 uppercase">
              TIMELINE CONFIGURATION TERMINAL
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 text-sm font-orbitron bg-cyan-950/50 border border-cyan-500/50 px-4 py-2 rounded-lg text-cyan-400 hover:bg-cyan-900/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
          >
            <Plus className="w-4 h-4" />
            THÊM PHASE MỚI
          </button>
        </div>

        {/* Phase List */}
        <div className="grid gap-4">
          {phases.length === 0 ? (
            <div className="tech-panel p-8 text-center text-slate-400 text-sm">
              Chưa có phase nào. Hãy thêm phase mới!
            </div>
          ) : (
            phases.map((phase) => (
              <div key={phase.id} className="tech-panel p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center border-[#1e2d5a]/60 hover:border-cyan-500/30 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-[#0b1124] border border-[#1e2d5a] flex items-center justify-center font-orbitron font-bold text-cyan-500">
                    {phase.phase_number}
                  </div>
                  <div>
                    <h3 className="font-orbitron font-bold text-white tracking-wide uppercase flex items-center gap-2">
                      {phase.title}
                      <StatusBadge status={phase.status} />
                    </h3>
                    <div className="text-xs text-slate-400 mt-1 flex gap-3">
                      <span>Order: {phase.display_order}</span>
                      <span>Icon: {phase.icon}</span>
                      {phase.start_date && (
                        <span>
                          {new Date(phase.start_date).toLocaleDateString('vi-VN')}
                          {phase.end_date ? ` - ${new Date(phase.end_date).toLocaleDateString('vi-VN')}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(phase)} className="p-2 bg-blue-950/30 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-900/50 transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(phase.id)} className="p-2 bg-red-950/30 border border-red-500/30 rounded text-red-400 hover:bg-red-900/50 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b1124] border border-cyan-500/30 p-6 rounded-xl max-w-2xl w-full shadow-[0_0_30px_rgba(0,240,255,0.1)] relative">
            <h2 className="font-orbitron text-xl font-bold text-white uppercase mb-6 tracking-wide border-b border-[#1e2d5a] pb-3">
              {editingId ? 'CHỈNH SỬA PHASE' : 'THÊM PHASE MỚI'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Phase Number</label>
                  <input type="number" required value={formData.phase_number} onChange={e => setFormData({...formData, phase_number: Number(e.target.value)})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Display Order</label>
                  <input type="number" required value={formData.display_order} onChange={e => setFormData({...formData, display_order: Number(e.target.value)})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Tiêu đề</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none" placeholder="VD: VÒNG SƠ KHẢO" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Mô tả</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none h-20" placeholder="Chi tiết vòng thi..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Ngày bắt đầu</label>
                  <input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Ngày kết thúc</label>
                  <input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Trạng thái</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as PhaseStatus})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none">
                    <option value="upcoming">SẮP TỚI</option>
                    <option value="active">ĐANG MỞ</option>
                    <option value="completed">ĐÃ KẾT THÚC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Icon (Lucide name)</label>
                  <input type="text" required value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="w-full bg-[#131e3d] border border-[#1e2d5a] rounded p-2 text-white text-sm focus:border-cyan-500/50 outline-none" placeholder="book, trophy, target..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#1e2d5a]">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition">
                  Huỷ bỏ
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wide transition disabled:opacity-50">
                  {submitting ? 'ĐANG LƯU...' : 'LƯU PHASE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
