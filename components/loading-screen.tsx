'use client'

import Loading from './loading'

interface LoadingScreenProps {
  text?: string
}

export default function LoadingScreen({ text = 'Đang tải hệ thống...' }: LoadingScreenProps) {
  return <Loading variant="page" text={text} />
}
