'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import FaqWidget from './FaqWidget'

// Excluded dashboard and internal admin paths
const EXCLUDED_PREFIXES = ['/admin', '/dashboard', '/judge']

export default function FaqWidgetWrapper() {
  const pathname = usePathname()

  if (!pathname) return <FaqWidget />

  const isExcluded = EXCLUDED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isExcluded) {
    return null
  }

  return <FaqWidget />
}
