import { clientApi } from '@/lib/api/client-api'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import { categoryToSpecialty } from '@/lib/data/services-catalog'
import type { useBookingStore } from '@/lib/store/booking-store'
import type { ServiceRequest } from '@/lib/api/types'

type BookingSnapshot = ReturnType<typeof useBookingStore.getState>

function scheduledDateTime(state: BookingSnapshot): string | undefined {
  if (!state.scheduledDate || state.scheduledHour === null) return undefined
  const [year, month, day] = state.scheduledDate.split('-').map(Number)
  const date = new Date(year, month - 1, day, state.scheduledHour, 0, 0)
  return date.toISOString()
}

/**
 * Executa a sequência exata de submissão usada pela app (booking_provider.dart
 * `submit()`): cria a morada de serviço, guarda o NIF, cria a morada de
 * faturação opcional, envia as fotos, e só depois cria o pedido. Cada etapa
 * auxiliar (NIF, morada de faturação, fotos individuais) é tolerante a falhas
 * — só a criação da morada de serviço e do próprio pedido são bloqueantes.
 */
export async function submitBooking(state: BookingSnapshot): Promise<ServiceRequest> {
  const address = await clientApi.createAddress({
    label: 'Morada do serviço',
    street: state.addressStreet,
    number: state.addressNumber,
    floor: state.addressFloor || undefined,
    postalCode: state.postalCode,
    city: state.city,
    district: state.district,
    isDefault: false,
  })

  if (state.nif.trim()) {
    try {
      await clientApi.updateProfile({ nif: state.nif.trim() })
    } catch {
      // não bloqueia a reserva
    }
  }

  if (state.billingDifferent && state.billingStreet && state.billingNumber) {
    try {
      await clientApi.createAddress({
        label: 'Morada de faturação',
        street: state.billingStreet,
        number: state.billingNumber,
        postalCode: state.billingPostalCode,
        city: state.billingCity,
        district: state.district,
        isDefault: false,
      })
    } catch {
      // não bloqueia a reserva
    }
  }

  const photoUrls: string[] = []
  for (const photo of state.photos) {
    try {
      const { url } = await clientApi.uploadImage(photo.file)
      photoUrls.push(url)
    } catch {
      // continua sem esta foto
    }
  }

  return serviceRequestsApi.create({
    addressId: address.id,
    specialty: categoryToSpecialty(state.categoryId ?? '') as ServiceRequest['specialty'],
    description: state.buildDescription(),
    scheduledDate: scheduledDateTime(state),
    promoCode: state.promoCode.trim() || undefined,
    useFreeVisit: state.useFreeVisit || undefined,
    photoUrls: photoUrls.length ? photoUrls : undefined,
  })
}
