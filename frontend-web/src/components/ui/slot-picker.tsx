'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mesmas regras do wizard de reserva na app: de amanhã até 2 meses, sem
// domingos, 13 janelas horárias das 07h às 21h com intervalo de almoço 12h-13h.
// O backend recusa datas fora desta janela (IsBookableDate).
const MORNING_HOURS = [7, 8, 9, 10, 11]
const AFTERNOON_HOURS = [13, 14, 15, 16, 17, 18, 19, 20]
export const SLOT_HOURS = [...MORNING_HOURS, ...AFTERNOON_HOURS]

/** Até quantos meses à frente se pode marcar — igual ao backend e à app. */
export const BOOKING_WINDOW_MONTHS = 2

export function slotLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function bookingWindow(): { first: Date; last: Date } {
  const today = startOfDay(new Date())
  const first = new Date(today)
  first.setDate(first.getDate() + 1)
  const last = new Date(today)
  last.setMonth(last.getMonth() + BOOKING_WINDOW_MONTHS)
  return { first, last }
}

export function isBookable(d: Date): boolean {
  const { first, last } = bookingWindow()
  const x = startOfDay(d)
  return x >= first && x <= last && x.getDay() !== 0
}

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // segunda a domingo

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Grelha mensal, segunda a domingo, só com os dias marcáveis ativos. */
function MonthCalendar({ selected, onSelect }: { selected: Date | null; onSelect: (d: Date) => void }) {
  const { first, last } = bookingWindow()
  const [month, setMonth] = useState(() => {
    const base = selected && isBookable(selected) ? selected : first
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth()
  const canPrev = monthIndex(month) > monthIndex(first)
  const canNext = monthIndex(month) < monthIndex(last)

  // getDay(): domingo = 0. Com a semana a começar à segunda, o desvio da
  // primeira célula é (getDay() + 6) % 7.
  const offset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ]

  const shift = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {capitalise(month.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }))}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          aria-label="Mês seguinte"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1 text-xs font-medium text-gray-400">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`vazio-${i}`} />
          const enabled = isBookable(day)
          // Compara a data inteira, não só o dia do mês — senão o dia 24 de
          // um mês marcava também o 24 do seguinte.
          const active = selected?.toDateString() === day.toDateString()
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(day)}
              className={cn(
                'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors',
                active && 'bg-blue-600 font-semibold text-white',
                !active && enabled && 'text-gray-800 hover:bg-blue-50',
                !enabled && 'cursor-not-allowed text-gray-300',
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface SlotPickerProps {
  selectedDate: Date | null
  selectedHour: number | null
  onSelectDate: (date: Date) => void
  onSelectHour: (hour: number) => void
}

export function SlotPicker({ selectedDate, selectedHour, onSelectDate, onSelectHour }: SlotPickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Escolha o dia</p>
        <MonthCalendar selected={selectedDate} onSelect={onSelectDate} />
        <p className="mt-2 text-xs text-gray-400">
          Marcações de amanhã até {BOOKING_WINDOW_MONTHS} meses. Aos domingos não há serviço.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          {selectedDate
            ? capitalise(selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }))
            : 'Escolha a hora'}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {SLOT_HOURS.map((hour) => {
            const active = selectedHour === hour
            return (
              <button
                key={hour}
                type="button"
                onClick={() => onSelectHour(hour)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-sm transition-colors',
                  active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                )}
              >
                {slotLabel(hour)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
