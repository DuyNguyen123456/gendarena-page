'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getScoringRounds,
  createOrUpdateScoringRound,
  saveScoringCriterion,
  deleteScoringCriterion,
  type ScoringRound,
} from '@/services/scoring'
import { ArrowLeft, Scale, Plus, Trash2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AdminScoringPage() {
  const [loading, setLoading] = useState(true)
  const [rounds, setRounds] = useState<ScoringRound[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [newRoundTitle, setNewRoundTitle] = useState('')
  const [newRoundDescription, setNewRoundDescription] = useState('')
  const [newCriterionName, setNewCriterionName] = useState('')
  const [newCriterionWeight, setNewCriterionWeight] = useState(0)
  const [newCriterionMaxScore, setNewCriterionMaxScore] = useState(10)
  const [roundOpen, setRoundOpen] = useState(false)
  const [roundRubricUrl, setRoundRubricUrl] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [creatingRound, setCreatingRound] = useState(false)
  const [addingCriterion, setAddingCriterion] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadAll = useCallback(async () => {
    const roundsData = await getScoringRounds()
    setRounds(roundsData)
    if (!selectedRoundId && roundsData.length > 0) {
      const defaultRound = roundsData.find((round) => round.scoring_open) ?? roundsData[0]
      setSelectedRoundId(defaultRound.id)
      setRoundOpen(defaultRound.scoring_open)
      setRoundRubricUrl(defaultRound.rubric_url ?? '')
    }
  }, [selectedRoundId])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUserId(user.id)
      await loadAll()
      setLoading(false)
    }
    init()
  }, [router, supabase, loadAll])

  // Sync selected round settings into local state
  useEffect(() => {
    if (!selectedRoundId) return
    const cur = rounds.find(r => r.id === selectedRoundId)
    if (cur) {
      setRoundOpen(cur.scoring_open)
      setRoundRubricUrl(cur.rubric_url ?? '')
    }
  }, [selectedRoundId, rounds])

  const selectedRound = rounds.find((round) => round.id === selectedRoundId)
  const totalRoundWeight = selectedRound?.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) ?? 0

  const handleCreateRound = async () => {
    if (!userId) return
    if (!newRoundTitle.trim()) {
      setMessage({ text: 'Vui lòng nhập tên vòng chấm.', ok: false })
      return
    }

    setCreatingRound(true)
    const result = await createOrUpdateScoringRound({
      title: newRoundTitle.trim(),
      description: newRoundDescription.trim() || null,
      sort_order: rounds.length,
      is_active: true,
    })
    setCreatingRound(false)

    if (!result.ok) {
      setMessage({ text: result.error, ok: false })
      return
    }

    setMessage({ text: 'Đã tạo vòng chấm mới thành công.', ok: true })
    setNewRoundTitle('')
    setNewRoundDescription('')
    await loadAll()
    setSelectedRoundId(result.id)
  }

  const handleAddCriterion = async () => {
    if (!userId || !selectedRoundId) return
    if (!newCriterionName.trim()) {
      setMessage({ text: 'Vui lòng nhập tên tiêu chí.', ok: false })
      return
    }
    if (newCriterionWeight <= 0 || newCriterionWeight > 100) {
      setMessage({ text: 'Trọng số phải lớn hơn 0 và không quá 100%.', ok: false })
      return
    }

    setAddingCriterion(true)
    const result = await saveScoringCriterion({
      round_id: selectedRoundId,
      name: newCriterionName.trim(),
      weight: newCriterionWeight,
      max_score: newCriterionMaxScore,
      sort_order: selectedRound?.criteria.length ?? 0,
    })
    setAddingCriterion(false)

    if (!result.ok) {
      setMessage({ text: result.error, ok: false })
      return
    }

    setMessage({ text: 'Đã thêm tiêu chí chấm điểm thành công.', ok: true })
    setNewCriterionName('')
    setNewCriterionWeight(0)
    setNewCriterionMaxScore(10)
    await loadAll()
  }

  const handleDeleteCriterion = async (criterionId: string) => {
    const result = await deleteScoringCriterion(criterionId)
    if (!result.ok) {
      setMessage({ text: result.error, ok: false })
      return
    }
    setMessage({ text: 'Đã xoá tiêu chí thành công.', ok: true })
    await loadAll()
  }

  const handleSaveRoundSettings = async () => {
    if (!userId || !selectedRound) return

    setSavingSettings(true)
    const result = await createOrUpdateScoringRound({
      id: selectedRound.id,
      phase_id: selectedRound.phase_id,
      title: selectedRound.title,
      description: selectedRound.description,
      rubric_url: roundRubricUrl.trim() || null,
      scoring_open: roundOpen,
      sort_order: selectedRound.sort_order,
      is_active: selectedRound.is_active,
    })
    setSavingSettings(false)

    if (!result.ok) {
      setMessage({ text: result.error, ok: false })
      return
    }
    setMessage({ text: 'Đã lưu cài đặt vòng chấm thành công.', ok: true })
    await loadAll()
  }

  if (loading) return <Loading text="Đang tải cấu hình chấm điểm..." />

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
      </div>

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
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
                <Scale className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Cấu hình vòng chấm & tiêu chí
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Quản lý các vòng chấm điểm, trọng số tiêu chí và liên kết barem điểm chính thức
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="md">Tổng số: {rounds.length} vòng chấm</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Status Message */}
        {message && (
          <div
            role={message.ok ? 'status' : 'alert'}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              message.ok
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {message.ok ? <CheckCircle className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Round Settings Card */}
        {selectedRound && (
          <Card className="border-surface-border">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="size-4 text-brand-cyan" />
                    Cài đặt vòng chấm: <span className="text-brand-cyan">{selectedRound.title}</span>
                  </CardTitle>
                  <CardDescription>
                    Cấu hình trạng thái mở cổng chấm và đường dẫn barem điểm chính thức
                  </CardDescription>
                </div>
                <Badge variant={roundOpen ? 'success' : 'default'} size="sm">
                  {roundOpen ? 'Đang mở chấm' : 'Đang đóng'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scoring open toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-surface-border bg-surface-overlay">
                  <div>
                    <label htmlFor="round-open-toggle" className="text-sm font-medium text-text-primary block cursor-pointer">
                      Mở cổng chấm điểm
                    </label>
                    <span className="text-xs text-text-tertiary">Bật để kích hoạt tính năng chấm điểm</span>
                  </div>
                  <input
                    id="round-open-toggle"
                    type="checkbox"
                    checked={roundOpen}
                    onChange={(e) => setRoundOpen(e.target.checked)}
                    className="size-4 rounded border-surface-border text-brand-cyan focus:ring-brand-cyan/20 cursor-pointer"
                  />
                </div>

                {/* Rubric URL */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="rubric-url-input" className="block text-xs font-medium text-text-secondary">
                      URL barem điểm (PDF / Drive)
                    </label>
                    {roundRubricUrl && (
                      <a
                        href={roundRubricUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline"
                      >
                        <span>Xem thử</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <input
                    id="rubric-url-input"
                    type="url"
                    value={roundRubricUrl}
                    onChange={(e) => setRoundRubricUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={savingSettings}
                  onClick={handleSaveRoundSettings}
                >
                  {savingSettings ? 'Đang lưu...' : 'Lưu cài đặt vòng'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Round & Configure Criteria */}
        <Card className="border-surface-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Cấu hình vòng và tiêu chí chấm điểm
            </CardTitle>
            <CardDescription>
              Thiết lập trọng số cho từng tiêu chí chấm (tổng trọng số nên đạt 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Left Column: Create Round & Selector */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-surface-border bg-surface-overlay space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tạo vòng chấm mới
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={newRoundTitle}
                      onChange={(e) => setNewRoundTitle(e.target.value)}
                      placeholder="Tên vòng chấm (VD: Vòng Sơ Loại)"
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                    <input
                      value={newRoundDescription}
                      onChange={(e) => setNewRoundDescription(e.target.value)}
                      placeholder="Mô tả vòng chấm..."
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="size-3.5" />}
                    isLoading={creatingRound}
                    onClick={handleCreateRound}
                  >
                    {creatingRound ? 'Đang tạo...' : 'Tạo vòng mới'}
                  </Button>
                </div>

                {rounds.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="round-select-box" className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Chọn vòng chấm để chỉnh sửa
                      </label>
                      <Badge
                        variant={totalRoundWeight === 100 ? 'success' : 'warning'}
                        size="sm"
                      >
                        Tổng trọng số: {totalRoundWeight}%
                      </Badge>
                    </div>
                    <select
                      id="round-select-box"
                      value={selectedRoundId ?? ''}
                      onChange={(e) => setSelectedRoundId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors cursor-pointer"
                    >
                      {rounds.map((round) => (
                        <option key={round.id} value={round.id}>{round.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Right Column: Add Criterion */}
              <div className="p-4 rounded-lg border border-surface-border bg-surface-overlay space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Thêm tiêu chí vào vòng
                </p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="crit-name" className="block text-xs font-medium text-text-secondary mb-1">
                      Tên tiêu chí *
                    </label>
                    <input
                      id="crit-name"
                      value={newCriterionName}
                      onChange={(e) => setNewCriterionName(e.target.value)}
                      placeholder="VD: Tính sáng tạo & Đổi mới"
                      className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="crit-weight" className="block text-xs font-medium text-text-secondary mb-1">
                        Trọng số (%) *
                      </label>
                      <input
                        id="crit-weight"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={newCriterionWeight}
                        onChange={(e) => setNewCriterionWeight(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="crit-max" className="block text-xs font-medium text-text-secondary mb-1">
                        Điểm tối đa *
                      </label>
                      <input
                        id="crit-max"
                        type="number"
                        min={1}
                        step={1}
                        value={newCriterionMaxScore}
                        onChange={(e) => setNewCriterionMaxScore(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-md border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
                      />
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="size-3.5" />}
                    isLoading={addingCriterion}
                    disabled={!selectedRoundId}
                    onClick={handleAddCriterion}
                    className="w-full mt-1"
                  >
                    {addingCriterion ? 'Đang thêm...' : 'Thêm tiêu chí'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Criteria List for Selected Round */}
            {selectedRound && (
              <div className="pt-2 border-t border-surface-border">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  Danh sách tiêu chí của vòng: <span className="text-text-primary">{selectedRound.title}</span>
                </h3>
                {selectedRound.criteria.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 border border-dashed border-surface-border rounded-xl text-center text-text-tertiary">
                    <Scale className="size-8 text-text-disabled mb-2" />
                    <p className="text-sm font-medium text-text-secondary">Chưa có tiêu chí nào</p>
                    <p className="text-xs text-text-tertiary mt-0.5">Thêm tiêu chí chấm điểm và thiết lập trọng số ở khung bên cạnh.</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedRound.criteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-surface-border bg-surface-overlay hover:border-surface-border-strong transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-text-primary truncate">{criterion.name}</p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            Trọng số: <span className="text-brand-cyan font-mono">{criterion.weight}%</span> · Tối đa: <span className="text-text-secondary font-mono">{criterion.max_score}đ</span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="size-3.5" />}
                          onClick={() => handleDeleteCriterion(criterion.id)}
                          className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger shrink-0"
                        >
                          Xoá
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
