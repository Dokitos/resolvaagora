'use client'

import { cn } from '@/lib/utils'

/**
 * Pontuação simples de força de password (sem dependências externas tipo
 * zxcvbn — não há necessidade dado o âmbito deste formulário).
 *
 * Critérios avaliados (mesma lógica usada no ecrã de registo da app Flutter,
 * em `mobile-technician/lib/features/auth/register_screen.dart`, para manter
 * a UX consistente entre site e app):
 *   - comprimento >= 8
 *   - comprimento >= 12 (bónus)
 *   - contém maiúscula
 *   - contém número
 *   - contém símbolo/carácter especial
 *
 * Pontuação 0-5 → Fraca (0-1) / Média (2-3) / Forte (4-5).
 */
export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong'

export interface PasswordStrengthResult {
  score: number
  maxScore: number
  level: PasswordStrengthLevel
  label: string
  missing: string[]
}

export function scorePasswordStrength(password: string): PasswordStrengthResult {
  const maxScore = 5
  if (!password) {
    return { score: 0, maxScore, level: 'empty', label: '', missing: [] }
  }

  const checks = {
    length8: password.length >= 8,
    length12: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length

  const missing: string[] = []
  if (!checks.length8) missing.push('pelo menos 8 caracteres')
  if (!checks.uppercase) missing.push('uma letra maiúscula')
  if (!checks.number) missing.push('um número')
  if (!checks.symbol) missing.push('um símbolo (ex.: !@#$)')

  const level: PasswordStrengthLevel = score <= 1 ? 'weak' : score <= 3 ? 'medium' : 'strong'
  const label = level === 'weak' ? 'Fraca' : level === 'medium' ? 'Média' : 'Forte'

  return { score, maxScore, level, label, missing }
}

const LEVEL_COLOR: Record<Exclude<PasswordStrengthLevel, 'empty'>, string> = {
  weak: 'bg-red-500',
  medium: 'bg-amber-500',
  strong: 'bg-green-500',
}

const LEVEL_TEXT_COLOR: Record<Exclude<PasswordStrengthLevel, 'empty'>, string> = {
  weak: 'text-red-600',
  medium: 'text-amber-600',
  strong: 'text-green-600',
}

interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const result = scorePasswordStrength(password)

  if (result.level === 'empty') return null
  const level = result.level

  const segments = 3
  const filledSegments = level === 'weak' ? 1 : level === 'medium' ? 2 : 3

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < filledSegments ? LEVEL_COLOR[level] : 'bg-gray-200',
              )}
            />
          ))}
        </div>
        <span className={cn('text-xs font-medium', LEVEL_TEXT_COLOR[level])}>
          {result.label}
        </span>
      </div>
      {result.missing.length > 0 && (
        <p className="text-xs text-gray-500">
          Falta: {result.missing.join(', ')}
        </p>
      )}
    </div>
  )
}
