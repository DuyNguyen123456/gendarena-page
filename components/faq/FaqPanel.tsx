'use client'

import React, { useState, useMemo } from 'react'
import { FAQ_DATA, FaqCategory, FaqItem } from '@/data/faqs'

interface FaqPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function FaqPanel({ isOpen, onClose }: FaqPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Filter items by category & search query
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return FAQ_DATA.map((category) => {
      // Category filter match check
      if (selectedCategoryId !== 'all' && category.id !== selectedCategoryId) {
        return null
      }

      if (!query) {
        return category
      }

      // Filter items inside category based on search query
      const matchingItems = category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      )

      if (matchingItems.length === 0) return null

      return {
        ...category,
        items: matchingItems,
      }
    }).filter((cat): cat is FaqCategory => cat !== null)
  }, [searchQuery, selectedCategoryId])

  const totalResults = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0)
  }, [filteredCategories])

  if (!isOpen) return null

  const toggleItem = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gen D Arena 2026 FAQ Widget"
      className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 sm:w-[440px] max-h-[82vh] sm:max-h-[640px] z-50 flex flex-col rounded-2xl bg-[#070d1e]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      {/* Cyber Decorative Header Line */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

      {/* Header */}
      <div className="p-4 pb-3 border-b border-cyan-900/50 bg-[#0a122c]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            🤖
          </div>
          <div>
            <h2 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              HỎI ĐÁP ARENA 2026
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                FAQ
              </span>
            </h2>
            <p className="text-slate-400 text-xs">
              Trợ lý giải đáp thắc mắc cuộc thi Gen D Arena
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Đóng panel"
          className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/60 flex items-center justify-center transition"
        >
          ✕
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-3 bg-[#081026]/90 border-b border-cyan-900/40">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/70 text-xs font-mono">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm câu hỏi (ví dụ: đối tượng, giải thưởng)..."
            className="w-full bg-[#050917] text-white text-xs pl-8 pr-8 py-2 rounded-lg border border-cyan-900/60 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills horizontal scroll */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition font-medium ${
              selectedCategoryId === 'all'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'bg-[#0b1430] border-cyan-900/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({FAQ_DATA.reduce((a, b) => a + b.items.length, 0)})
          </button>
          {FAQ_DATA.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition font-medium flex items-center gap-1 ${
                selectedCategoryId === cat.id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'bg-[#0b1430] border-cyan-900/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.title.replace(/^\d+\.\s*/, '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accordion Content Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-h-[50vh] sm:max-h-[420px] custom-scrollbar">
        {totalResults === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-xs font-semibold text-slate-300">
              Không tìm thấy câu hỏi phù hợp với "{searchQuery}"
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Thử từ khóa khác hoặc bấm nút bên dưới để xem tất cả câu hỏi
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategoryId('all')
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-medium hover:bg-cyan-900/40 transition"
            >
              Xem tất cả câu hỏi
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-orbitron text-xs font-bold tracking-wider uppercase border-b border-cyan-900/40 pb-1.5">
                <span>{category.icon}</span>
                <span>{category.title}</span>
              </div>

              <div className="space-y-2">
                {category.items.map((item: FaqItem) => {
                  const isExpanded = expandedItemId === item.id

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-[#0d1738]/90 border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                          : 'bg-[#09112a]/70 border-cyan-900/40 hover:border-cyan-700/50'
                      }`}
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full p-3 text-left flex items-start justify-between gap-2 focus:outline-none"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                          {item.question}
                        </span>
                        <span
                          className={`text-cyan-400 text-xs font-bold transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-cyan-900/40 text-slate-300 text-xs leading-relaxed whitespace-pre-line bg-[#060c21]/60">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Support Banner */}
      <div className="p-3 bg-[#060b1c] border-t border-cyan-900/50 text-center text-[11px] text-slate-400 flex items-center justify-between">
        <span>Vẫn còn thắc mắc chưa giải đáp?</span>
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 font-semibold hover:underline flex items-center gap-1"
        >
          Liên hệ BTC →
        </a>
      </div>
    </div>
  )
}
