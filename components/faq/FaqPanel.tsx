'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { MASCOT_IMAGE_CONFIG } from '@/data/faqs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

interface FaqPanelProps {
  isOpen: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessage = {
  role: 'model',
  text: 'Xin chào! 👋 Mình là trợ lý hỏi đáp Gen D Arena 2026. Bạn có thể hỏi mình bất kỳ câu hỏi nào về cuộc thi nhé!',
}

const MAX_TURNS = 10 // 10 user + 10 bot = 20 messages

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BotAvatar({ error, onError }: { error: boolean; onError: () => void }) {
  if (!error) {
    return (
      <div className="w-7 h-7 rounded-full border border-cyan-500/60 overflow-hidden shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
        <Image
          src={MASCOT_IMAGE_CONFIG.path}
          alt={MASCOT_IMAGE_CONFIG.alt}
          width={28}
          height={28}
          className="w-full h-full object-cover"
          onError={onError}
        />
      </div>
    )
  }
  return (
    <div className="w-7 h-7 rounded-full border border-cyan-500/60 bg-gradient-to-br from-cyan-900 to-indigo-950 flex items-center justify-center shrink-0 text-sm shadow-[0_0_8px_rgba(0,240,255,0.3)]">
      🤖
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="w-7 h-7 rounded-full border border-cyan-500/40 bg-gradient-to-br from-cyan-900 to-indigo-950 flex items-center justify-center shrink-0 text-sm">
        🤖
      </div>
      <div className="bg-[#0d1738]/90 border border-cyan-800/50 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="max-w-[80%] bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white text-xs sm:text-sm leading-relaxed rounded-2xl rounded-br-sm px-4 py-2.5 shadow-[0_2px_12px_rgba(0,200,255,0.25)] border border-cyan-400/20">
        {text}
      </div>
    </div>
  )
}

function BotBubble({ text, avatarError, onAvatarError }: { text: string; avatarError: boolean; onAvatarError: () => void }) {
  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <BotAvatar error={avatarError} onError={onAvatarError} />
      <div className="max-w-[80%] bg-[#0d1738]/90 border border-cyan-800/50 text-slate-200 text-xs sm:text-sm leading-relaxed rounded-2xl rounded-bl-sm px-4 py-2.5 whitespace-pre-line shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
        {text}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FaqPanel({ isOpen, onClose }: FaqPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Build history for the API (exclude welcome message, keep last MAX_TURNS turns)
  function buildHistory(): { role: 'user' | 'model'; text: string }[] {
    // Skip the static welcome message (index 0)
    return messages.slice(1).slice(-(MAX_TURNS * 2 - 2))
  }

  async function sendMessage() {
    const question = inputValue.trim()
    if (!question || isLoading) return

    const userMsg: ChatMessage = { role: 'user', text: question }
    setMessages((prev) => {
      // Trim oldest turn pair if exceeding MAX_TURNS
      const updated = [...prev, userMsg]
      // Count user messages
      const userCount = updated.filter((m) => m.role === 'user').length
      if (userCount > MAX_TURNS) {
        // Remove oldest user+bot pair (after welcome)
        const firstUserIdx = updated.findIndex((m, i) => i > 0 && m.role === 'user')
        if (firstUserIdx !== -1) {
          // Remove that user message and the bot reply right after it
          updated.splice(firstUserIdx, 2)
        }
      }
      return updated
    })
    setInputValue('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/faq-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: buildHistory() }),
      })

      const data = await res.json()
      const botMsg: ChatMessage = {
        role: 'model',
        text: data.answer || 'Mình chưa tìm thấy thông tin chính xác cho câu hỏi này. Bạn vui lòng liên hệ BTC để được hỗ trợ nhé! 💙',
      }
      setMessages((prev) => [...prev, botMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Mình đang gặp sự cố kết nối. Vui lòng thử lại hoặc liên hệ BTC để được hỗ trợ nhé! 💙',
        },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gen D Arena 2026 FAQ Chatbot"
      className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 sm:w-[440px] max-h-[82vh] sm:max-h-[640px] z-50 flex flex-col rounded-2xl bg-[#070d1e]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      {/* Cyber Decorative Header Line */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shrink-0" />

      {/* Header */}
      <div className="p-4 pb-3 border-b border-cyan-900/50 bg-[#0a122c]/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            🤖
          </div>
          <div>
            <h2 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              HỎI ĐÁP ARENA 2026
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                AI
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

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 custom-scrollbar min-h-0">
        {messages.map((msg, idx) =>
          msg.role === 'user' ? (
            <UserBubble key={idx} text={msg.text} />
          ) : (
            <BotBubble
              key={idx}
              text={msg.text}
              avatarError={avatarError}
              onAvatarError={() => setAvatarError(true)}
            />
          )
        )}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="shrink-0 border-t border-cyan-900/50 bg-[#060b1c] p-3">
        {/* Fallback FAQ link */}
        <div className="flex items-center justify-end mb-2">
          <a
            href="#faq"
            onClick={onClose}
            className="text-[11px] text-cyan-500/70 hover:text-cyan-400 transition flex items-center gap-1"
          >
            Xem toàn bộ FAQ ↗
          </a>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            id="faq-chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Nhập câu hỏi của bạn… (Enter để gửi)"
            rows={1}
            className="flex-1 bg-[#050917] text-white text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-cyan-900/60 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500 transition resize-none leading-relaxed disabled:opacity-50 max-h-28 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            id="faq-chat-send"
            onClick={sendMessage}
            disabled={isLoading || inputValue.trim().length === 0}
            aria-label="Gửi câu hỏi"
            className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(0,200,255,0.4)] hover:shadow-[0_0_20px_rgba(0,200,255,0.6)] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>

        <p className="text-[10px] text-slate-600 mt-2 text-center">
          Trả lời dựa trên FAQ chính thức · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  )
}
