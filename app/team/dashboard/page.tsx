'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '@/components/loading'

export default function TeamDashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return <Loading text="Đang chuyển hướng về Bảng điều khiển..." />
}
