'use client'

import { cn } from '@/lib/utils'

// Mesmas regras do wizard de reserva na app: próximos 4 dias não-domingo,
// 13 janelas horárias das 07h às 21h com intervalo de almoço 12h-13h.
const MORNING_HOURS = [7, 8, 9, 10, 11]
const AFTERNOON_HOURS = [13, 14, 15, 16, 17, 18, 19, 20]
export const SLOT_HOURS = [...MORNING_HOURS, ...AFTERNOON_HOURS]

export function slotLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`
}

export function nextAvailableDays(count = 4): Date[] {
  const days: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() + 1) // a partir de amanhã

  while (days.length < count) {
    if (cursor.getDay() !== 0) days.push(new Date(cursor)) // salta domingo
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

interface SlotPickerProps {
  selectedDate: Date | null
  selectedHour: number | null
  onSelectDate: (date: Date) => void
  onSelectHour: (hour: number) => void
}

export function SlotPicker({ selectedDate, selectedHour, onSelectDate, onSelectHour }: SlotPickerProps) {
  const days = nextAvailableDays()

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Escolha o dia</p>
        <div className="grid grid-cols-4 gap-2">
          {days.map((day) => {
            const active = selectedDate?.toDateString() === day.toDateString()
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  'flex flex-col items-center rounded-lg border px-2 py-3 text-sm transition-colors',
                  active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className="text-xs uppercase text-gray-400">
                  {day.toLocaleDateString('pt-PT', { weekday: 'short' })}
                </span>
                <span className="font-semibold">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Escolha a hora</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
