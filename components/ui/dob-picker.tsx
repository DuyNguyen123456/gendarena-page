'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, dobToDbFormat, dobToUiFormat } from '@/lib/utils'

interface DobPickerProps {
  value?: string // DD/MM/YYYY or YYYY-MM-DD
  onChange?: (val: string) => void
  name?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: boolean
}

const MONTHS_VN = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]

const DAYS_OF_WEEK_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export default function DobPicker({
  value = '',
  onChange,
  name,
  placeholder = 'Chọn ngày sinh',
  disabled = false,
  className,
  error = false,
}: DobPickerProps) {
  const [open, setOpen] = useState(false)

  // Parse initial date or default to 2004-01-01 (typical student age)
  const initialParsed = (() => {
    if (!value) return null
    const db = dobToDbFormat(value)
    if (!db) return null
    const [y, m, d] = db.split('-').map(Number)
    if (!y || !m || !d) return null
    return { year: y, month: m - 1, day: d }
  })()

  const [selectedDate, setSelectedDate] = useState<{
    year: number
    month: number
    day: number
  } | null>(initialParsed)

  const [viewYear, setViewYear] = useState<number>(initialParsed?.year ?? 2004)
  const [viewMonth, setViewMonth] = useState<number>(initialParsed?.month ?? 0)

  const mobileInputRef = useRef<HTMLInputElement>(null)

  // Sync when value prop changes externally
  useEffect(() => {
    if (!value) {
      setSelectedDate(null)
      return
    }
    const db = dobToDbFormat(value)
    if (db) {
      const [y, m, d] = db.split('-').map(Number)
      if (y && m && d) {
        setSelectedDate({ year: y, month: m - 1, day: d })
        setViewYear(y)
        setViewMonth(m - 1)
      }
    }
  }, [value])

  // Generate Year options (e.g. from 1960 to current year - 10)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1960 - 8 }, (_, i) => currentYear - 10 - i)

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Day of week for 1st of the month: Monday = 0, ..., Sunday = 6
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth)
  const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)
  const firstDayIndex = getFirstDayOfMonth(viewYear, viewMonth)

  const handleSelectDay = (day: number) => {
    const newSelected = { year: viewYear, month: viewMonth, day }
    setSelectedDate(newSelected)
    const formattedDD = String(day).padStart(2, '0')
    const formattedMM = String(viewMonth + 1).padStart(2, '0')
    const uiFormatted = `${formattedDD}/${formattedMM}/${viewYear}`

    if (onChange) {
      onChange(uiFormatted)
    }
    setOpen(false)
  }

  const handleMobileNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value // YYYY-MM-DD
    if (!rawVal) {
      setSelectedDate(null)
      if (onChange) onChange('')
      return
    }
    const uiFormatted = dobToUiFormat(rawVal)
    const [y, m, d] = rawVal.split('-').map(Number)
    setSelectedDate({ year: y, month: m - 1, day: d })
    setViewYear(y)
    setViewMonth(m - 1)
    if (onChange) {
      onChange(uiFormatted)
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleClear = () => {
    setSelectedDate(null)
    if (onChange) onChange('')
    setOpen(false)
  }

  const displayString = selectedDate
    ? `${String(selectedDate.day).padStart(2, '0')}/${String(
        selectedDate.month + 1
      ).padStart(2, '0')}/${selectedDate.year}`
    : value
    ? dobToUiFormat(value)
    : ''

  const nativeIsoValue = selectedDate
    ? `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(
        selectedDate.day
      ).padStart(2, '0')}`
    : dobToDbFormat(value) || ''

  return (
    <div className={cn('relative w-full', className)}>
      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={displayString} />}

      {/* ─── MOBILE NATIVE DATE PICKER (Scroll Wheel on iOS / Android) ───── */}
      {/* On touch/mobile devices, this transparent input intercepts taps and invokes the OS native 3D wheel roller */}
      <input
        ref={mobileInputRef}
        type="date"
        disabled={disabled}
        max={`${currentYear - 10}-12-31`}
        min="1960-01-01"
        value={nativeIsoValue}
        onChange={handleMobileNativeChange}
        tabIndex={-1}
        aria-hidden="true"
        className="md:hidden absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer pointer-events-auto"
      />

      {/* ─── DESKTOP POPOVER CALENDAR BOX ────────────────────────────────── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 rounded-md border flex items-center justify-between text-sm transition-colors text-left bg-surface-raised cursor-pointer',
              error
                ? 'border-semantic-danger focus:border-semantic-danger focus:ring-2 focus:ring-semantic-danger/20'
                : 'border-surface-border hover:border-surface-border-hover focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20',
              disabled && 'opacity-50 cursor-not-allowed',
              displayString ? 'text-text-primary font-medium' : 'text-text-tertiary'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarIcon className="size-4 text-brand-cyan shrink-0" />
              <span className="truncate">
                {displayString || placeholder}
              </span>
            </div>

            {displayString && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-full hover:bg-surface-overlay transition"
                title="Xóa ngày đã chọn"
              >
                <X className="size-3.5" />
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[310px] p-3.5 bg-surface-raised border border-surface-border shadow-elevation-3 rounded-xl z-[120]"
        >
          {/* Header Controls: Month Select & Year Select */}
          <div className="flex items-center justify-between gap-1.5 mb-3 pb-2.5 border-b border-surface-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="size-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition"
              title="Tháng trước"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-7 px-2 text-xs font-semibold rounded-lg bg-surface-overlay border border-surface-border text-text-primary outline-none focus:border-brand-cyan cursor-pointer"
              >
                {MONTHS_VN.map((mName, idx) => (
                  <option key={idx} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-7 px-2 text-xs font-semibold rounded-lg bg-surface-overlay border border-surface-border text-text-primary outline-none focus:border-brand-cyan cursor-pointer"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="size-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition"
              title="Tháng sau"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK_VN.map((dow, i) => (
              <span
                key={i}
                className={cn(
                  'text-[11px] font-semibold py-1',
                  i >= 5 ? 'text-brand-cyan/80' : 'text-text-tertiary'
                )}
              >
                {dow}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous Month Padded Days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1
              return (
                <div
                  key={`prev-${i}`}
                  className="size-8 flex items-center justify-center text-[12px] text-text-tertiary/40 select-none"
                >
                  {dayNum}
                </div>
              )
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const dayNum = i + 1
              const isSelected =
                selectedDate &&
                selectedDate.year === viewYear &&
                selectedDate.month === viewMonth &&
                selectedDate.day === dayNum

              return (
                <button
                  key={`curr-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={cn(
                    'size-8 rounded-lg flex items-center justify-center text-[12px] font-medium transition cursor-pointer',
                    isSelected
                      ? 'bg-brand-cyan text-surface-base font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                      : 'text-text-primary hover:bg-surface-overlay hover:text-brand-cyan'
                  )}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>

          {/* Quick Footer */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-surface-border text-xs">
            <button
              type="button"
              onClick={() => {
                setViewYear(2004)
                setViewMonth(0)
              }}
              className="text-[11px] text-text-tertiary hover:text-brand-cyan flex items-center gap-1 transition"
            >
              <RotateCcw className="size-3" /> Về năm 2004
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-brand-cyan hover:underline transition"
            >
              Xong
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
