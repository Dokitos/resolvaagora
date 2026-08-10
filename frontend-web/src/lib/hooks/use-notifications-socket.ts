'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { io, type Socket } from 'socket.io-client'

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api/v1').replace(/\/api\/v1\/?$/, '')

export interface ServiceStatusUpdatedPayload {
  serviceRequestId: string
  newStatus: string
}

export interface QuoteReceivedPayload {
  serviceRequestId: string
}

export interface QuotePaymentConfirmedPayload {
  serviceRequestId: string
}

export interface SlaAlertPayload {
  serviceRequestId: string
  metric: string
  level: string
}

export interface SupportMessagePayload {
  id: string
  body: string
  senderRole: string
  serviceRequestId?: string
  createdAt: string
}

export interface NotificationPayload {
  title: string
  body: string
}

interface NotificationsSocketHandlers {
  onServiceStatusUpdated?: (data: ServiceStatusUpdatedPayload) => void
  onQuoteReceived?: (data: QuoteReceivedPayload) => void
  onQuotePaymentConfirmed?: (data: QuotePaymentConfirmedPayload) => void
  onSlaAlert?: (data: SlaAlertPayload) => void
  onSupportMessage?: (data: SupportMessagePayload) => void
  onNotification?: (data: NotificationPayload) => void
}

/**
 * Liga ao namespace /notifications (socket.io) autenticado com o accessToken
 * da sessão — mesmo padrão usado no sino de notificações do admin. Uma única
 * ligação por montagem do hook; os handlers são lidos de uma ref para não
 * forçar reconexão a cada render.
 */
export function useNotificationsSocket(handlers: NotificationsSocketHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const { data: session } = useSession()
  const token = session?.user?.accessToken

  useEffect(() => {
    if (!token) return

    const socket: Socket = io(`${WS_BASE}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('service-status-updated', (data: ServiceStatusUpdatedPayload) => handlersRef.current.onServiceStatusUpdated?.(data))
    socket.on('quote-received', (data: QuoteReceivedPayload) => handlersRef.current.onQuoteReceived?.(data))
    socket.on('quote-payment-confirmed', (data: QuotePaymentConfirmedPayload) => handlersRef.current.onQuotePaymentConfirmed?.(data))
    socket.on('sla-alert', (data: SlaAlertPayload) => handlersRef.current.onSlaAlert?.(data))
    socket.on('support-message', (data: SupportMessagePayload) => handlersRef.current.onSupportMessage?.(data))
    socket.on('notification', (data: NotificationPayload) => handlersRef.current.onNotification?.(data))

    return () => {
      socket.disconnect()
    }
  }, [token])
}
