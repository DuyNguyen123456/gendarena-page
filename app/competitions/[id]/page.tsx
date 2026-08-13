import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import CompetitionDetailView from './CompetitionDetailView'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: competition } = await supabase
    .from('competitions')
    .select('title, description')
    .eq('id', id)
    .single()

  if (!competition) {
    return {
      title: 'Chi tiết cuộc thi',
      description: 'Thông tin chi tiết các hạng mục và thể lệ cuộc thi GenD Arena 2026.',
    }
  }

  const rawDesc = competition.description || 'Thông tin chi tiết cuộc thi tại GenD Arena 2026.'
  const description = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}...` : rawDesc

  return {
    title: competition.title,
    description: description,
    openGraph: {
      title: `${competition.title} | GenD Arena 2026`,
      description: description,
    },
  }
}

export default async function CompetitionDetailPage({ params }: Props) {
  const { id } = await params
  return <CompetitionDetailView id={id} />
}