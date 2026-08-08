export interface BookingStep {
  path: string
  label: string
}

// Ordem fixa do wizard — espelha o fluxo de 12 passos da app (otp é condicional,
// mas mantém o seu lugar na sequência quando ativo).
export const BOOKING_STEPS: BookingStep[] = [
  { path: '/booking/category', label: 'Serviço' },
  { path: '/booking/items', label: 'Itens' },
  { path: '/booking/details', label: 'Detalhes' },
  { path: '/booking/schedule', label: 'Horário' },
  { path: '/booking/contact', label: 'Contacto' },
  { path: '/booking/otp', label: 'SMS' },
  { path: '/booking/address', label: 'Morada' },
  { path: '/booking/summary', label: 'Resumo' },
  { path: '/booking/payment', label: 'Pagamento' },
  { path: '/booking/confirm', label: 'Confirmar' },
]

export function stepIndex(pathname: string): number {
  return BOOKING_STEPS.findIndex((s) => pathname.startsWith(s.path))
}

export function nextStepPath(pathname: string, skip: string[] = []): string {
  const idx = stepIndex(pathname)
  for (let i = idx + 1; i < BOOKING_STEPS.length; i++) {
    if (!skip.includes(BOOKING_STEPS[i].path)) return BOOKING_STEPS[i].path
  }
  return '/booking/success'
}

export function prevStepPath(pathname: string, skip: string[] = []): string | null {
  const idx = stepIndex(pathname)
  for (let i = idx - 1; i >= 0; i--) {
    if (!skip.includes(BOOKING_STEPS[i].path)) return BOOKING_STEPS[i].path
  }
  return null
}
