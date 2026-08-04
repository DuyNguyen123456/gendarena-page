'use client'

import React, { useState, useEffect } from 'react'
import FaqMascotTrigger from './FaqMascotTrigger'
import FaqPanel from './FaqPanel'

export default function FaqWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close panel on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!mounted) return null

  return (
    <>
      <FaqPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <FaqMascotTrigger isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} />
    </>
  )
}
