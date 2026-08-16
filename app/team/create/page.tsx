'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Loading from '@/components/loading'

function TeamCreateRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const compId = searchParams.get('competitionId')
    if (compId) {
      router.replace(`/dashboard?competitionId=${encodeURIComponent(compId)}`)
    } else {
      router.replace('/dashboard')
    }
  }, [router, searchParams])

  return <Loading text="Đang chuyển hướng về Bảng điều khiển..." />
}

export default function TeamCreatePage() {
  return (
    <Suspense fallback={<Loading text="Đang tải..." />}>
      <TeamCreateRedirect />
    </Suspense>
  )
}
