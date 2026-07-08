import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ServiceStatus, Specialty, AlertLevel } from './api/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  DRAFT: 'Rascunho',
  AWAITING_PAYMENT: 'Aguarda Pagamento',
  PAID: 'Pago',
  IN_DISTRIBUTION: 'A atribuir',
  ASSIGNED: 'Técnico atribuído',
  IN_TRANSIT: 'Técnico a caminho',
  ARRIVED: 'Técnico chegou',
  IN_DIAGNOSIS: 'Em diagnóstico',
  QUOTE_SENT: 'Orçamento enviado',
  QUOTE_APPROVED: 'Orçamento aprovado',
  IN_EXECUTION: 'Em execução',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  QUOTE_REJECTED: 'Orçamento rejeitado',
  EXPIRED: 'Expirado',
}

export const STATUS_COLORS: Record<ServiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  AWAITING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  IN_DISTRIBUTION: 'bg-purple-100 text-purple-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-700',
  ARRIVED: 'bg-teal-100 text-teal-700',
  IN_DIAGNOSIS: 'bg-orange-100 text-orange-700',
  QUOTE_SENT: 'bg-amber-100 text-amber-700',
  QUOTE_APPROVED: 'bg-lime-100 text-lime-700',
  IN_EXECUTION: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  QUOTE_REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
}

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  ELECTRICITY: 'Eletricidade',
  PLUMBING: 'Canalização',
  HVAC: 'AVAC / Climatização',
  APPLIANCES: 'Eletrodomésticos',
  PAINTING: 'Pintura',
  FURNITURE: 'Montagem de Móveis',
  CLEANING: 'Limpeza',
  LOCKSMITH: 'Serralharia',
  GARDEN: 'Jardinagem',
  FLOORING: 'Revestimentos',
  TV_ANTENNA: 'TV e Antenas',
}

export const SPECIALTY_ICONS: Record<Specialty, string> = {
  ELECTRICITY: '⚡',
  PLUMBING: '🔧',
  HVAC: '❄️',
  APPLIANCES: '🔌',
  PAINTING: '🎨',
  FURNITURE: '🪑',
  CLEANING: '🧹',
  LOCKSMITH: '🔑',
  GARDEN: '🌳',
  FLOORING: '🧱',
  TV_ANTENNA: '📺',
}

export const ALERT_LABELS: Record<AlertLevel, string> = {
  WARNING: 'Aviso',
  CRITICAL: 'Crítico',
}

export const SLA_METRIC_LABELS: Record<string, string> = {
  FIRST_RESPONSE: 'Primeira resposta',
  ARRIVAL: 'Chegada ao local',
  RESOLUTION: 'Resolução total',
  QUOTE_EXPIRY: 'Expiração de orçamento',
}
