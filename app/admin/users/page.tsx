'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Search, CheckCircle, AlertCircle, Shield, ShieldCheck } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface UserRow {
  id: string
  full_name: string
  email: string
  phone?: string
  organization?: string
  university?: string
  faculty?: string
  major?: string
  role?: string
  created_at: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, organization, university, faculty, major, role, created_at')
      .order('created_at', { ascending: false })
    setUsers((data as UserRow[]) || [])
  }, [supabase])

  useEffect(() => {
    let isMounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!isMounted) return
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      await loadUsers()
      if (!isMounted) return
      setLoading(false)
    }
    init()
    return () => { isMounted = false }
  }, [supabase, router, loadUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles').update({ role: newRole } as never).eq('id', userId)
    if (error) {
      setMessage({ type: 'error', text: 'Lỗi cập nhật quyền: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Đã cập nhật quyền người dùng thành công.' })
      await loadUsers()
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.organization?.toLowerCase().includes(search.toLowerCase()) ||
    u.university?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading text="Đang tải danh sách người dùng..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
      </div>

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-[150ms] mb-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại Control Center
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý người dùng & phân quyền
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Giám sát danh sách thành viên, cập nhật quyền hạn quản trị viên và thí sinh
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info" size="md">Tổng số: {users.length} thành viên</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Status Message */}
        {message && (
          <div
            role={message.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, email, trường, đơn vị..."
            leftIcon={<Search className="size-4" />}
          />
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden p-0 border-surface-border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-overlay text-text-secondary font-medium text-xs">
                  <th scope="col" className="px-5 py-3.5">Họ và tên</th>
                  <th scope="col" className="px-5 py-3.5">Email</th>
                  <th scope="col" className="px-5 py-3.5">SĐT</th>
                  <th scope="col" className="px-5 py-3.5">Trường / Đơn vị</th>
                  <th scope="col" className="px-5 py-3.5">Quyền truy cập</th>
                  <th scope="col" className="px-5 py-3.5">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-overlay/50 transition-colors duration-150">
                    <td className="px-5 py-4 font-medium text-text-primary whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {u.role === 'admin' ? (
                          <ShieldCheck className="size-4 text-semantic-warning shrink-0" />
                        ) : (
                          <Shield className="size-4 text-text-tertiary shrink-0" />
                        )}
                        <span>{u.full_name || 'Chưa cập nhật'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="px-5 py-4 text-text-tertiary whitespace-nowrap">
                      {u.phone || '—'}
                    </td>
                    <td className="px-5 py-4 text-text-tertiary whitespace-nowrap">
                      {u.university || u.organization || '—'}
                      {u.major ? ` (${u.major})` : ''}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <select
                        value={u.role || 'participant'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="h-8 rounded-md border border-surface-border bg-surface-raised px-2.5 text-xs text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors cursor-pointer"
                      >
                        <option value="participant">Thí sinh</option>
                        <option value="admin">Quản trị viên (BTC)</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-text-tertiary text-xs whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-text-tertiary">
              <Users className="size-10 text-text-disabled mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-medium text-text-secondary">Không tìm thấy người dùng</p>
              <p className="text-xs text-text-tertiary mt-1">Không có kết quả nào phù hợp với từ khóa tìm kiếm.</p>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  )
}
