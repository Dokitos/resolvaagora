import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { findCategory, findSubcategory } from '@/lib/data/services-catalog'
import { useCatalogStore } from '@/lib/store/catalog-store'
import { formatCurrency } from '@/lib/utils'
import { slotLabel } from '@/components/ui/slot-picker'
import type { PickedPhoto } from '@/components/ui/photo-upload'

interface BookingState {
  categoryId: string | null
  subcategoryId: string | null
  itemQuantities: Record<string, number>
  description: string
  photos: PickedPhoto[] // não persistido (File não serializa)
  postalCode: string
  city: string
  district: string
  scheduledDate: string | null // ISO date (yyyy-mm-dd)
  scheduledHour: number | null
  phone: string
  otpVerified: boolean
  addressStreet: string
  addressNumber: string
  addressFloor: string
  addressObservations: string
  nif: string
  billingDifferent: boolean
  billingStreet: string
  billingNumber: string
  billingPostalCode: string
  billingCity: string
  promoCode: string
  promoDiscount: number
  displacementFee: number
  useFreeVisit: boolean
  createdRequestId: string | null

  setCategory: (categoryId: string) => void
  setSubcategory: (subcategoryId: string) => void
  setItemQuantity: (itemId: string, qty: number) => void
  setDetails: (description: string, photos: PickedPhoto[]) => void
  setLocation: (postalCode: string, city: string, district: string) => void
  setScheduledDate: (date: string) => void
  setScheduledHour: (hour: number) => void
  setContact: (phone: string) => void
  setOtpVerified: (verified: boolean) => void
  setAddress: (data: { street: string; number: string; floor: string; observations: string }) => void
  setPromo: (code: string, discount: number) => void
  setNif: (nif: string) => void
  setBilling: (data: { different: boolean; street?: string; number?: string; postalCode?: string; city?: string }) => void
  setDisplacementFee: (fee: number) => void
  setUseFreeVisit: (value: boolean) => void
  setCreatedRequestId: (id: string | null) => void
  reset: () => void

  itemsTotal: () => number
  grandTotal: () => number
  buildDescription: () => string
}

const initialState = {
  categoryId: null,
  subcategoryId: null,
  itemQuantities: {},
  description: '',
  photos: [],
  postalCode: '',
  city: '',
  district: '',
  scheduledDate: null,
  scheduledHour: null,
  phone: '',
  otpVerified: false,
  addressStreet: '',
  addressNumber: '',
  addressFloor: '',
  addressObservations: '',
  nif: '',
  billingDifferent: false,
  billingStreet: '',
  billingNumber: '',
  billingPostalCode: '',
  billingCity: '',
  promoCode: '',
  promoDiscount: 0,
  displacementFee: 0,
  useFreeVisit: false,
  createdRequestId: null,
} satisfies Partial<BookingState>

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCategory: (categoryId) => set({ categoryId, subcategoryId: null, itemQuantities: {} }),
      setSubcategory: (subcategoryId) => set({ subcategoryId, itemQuantities: {} }),
      setItemQuantity: (itemId, qty) =>
        set((s) => {
          const next = { ...s.itemQuantities }
          if (qty <= 0) delete next[itemId]
          else next[itemId] = qty
          return { itemQuantities: next }
        }),
      setDetails: (description, photos) => set({ description, photos }),
      setLocation: (postalCode, city, district) => set({ postalCode, city, district }),
      setScheduledDate: (scheduledDate) => set({ scheduledDate }),
      setScheduledHour: (scheduledHour) => set({ scheduledHour }),
      setContact: (phone) => set({ phone, otpVerified: false }),
      setOtpVerified: (otpVerified) => set({ otpVerified }),
      setAddress: (data) =>
        set({
          addressStreet: data.street,
          addressNumber: data.number,
          addressFloor: data.floor,
          addressObservations: data.observations,
        }),
      setPromo: (promoCode, promoDiscount) => set({ promoCode, promoDiscount }),
      setNif: (nif) => set({ nif }),
      setBilling: (data) =>
        set({
          billingDifferent: data.different,
          billingStreet: data.street ?? '',
          billingNumber: data.number ?? '',
          billingPostalCode: data.postalCode ?? '',
          billingCity: data.city ?? '',
        }),
      setDisplacementFee: (displacementFee) => set({ displacementFee }),
      setUseFreeVisit: (useFreeVisit) => set({ useFreeVisit }),
      setCreatedRequestId: (createdRequestId) => set({ createdRequestId }),
      reset: () => set(initialState),

      itemsTotal: () => {
        const s = get()
        if (!s.categoryId || !s.subcategoryId) return 0
        const sub = findSubcategory(s.categoryId, s.subcategoryId, useCatalogStore.getState().categories)
        if (!sub) return 0
        return sub.items.reduce((sum, item) => sum + item.price * (s.itemQuantities[item.id] ?? 0), 0)
      },

      grandTotal: () => {
        const s = get()
        const total = s.itemsTotal() + (s.useFreeVisit ? 0 : s.displacementFee) - s.promoDiscount
        return Math.max(0, total)
      },

      buildDescription: () => {
        const s = get()
        const liveCategories = useCatalogStore.getState().categories
        const category = s.categoryId ? findCategory(s.categoryId, liveCategories) : undefined
        const sub = s.categoryId && s.subcategoryId ? findSubcategory(s.categoryId, s.subcategoryId, liveCategories) : undefined
        const lines: string[] = []

        if (s.description.trim()) lines.push(s.description.trim(), '')

        if (category && sub) {
          lines.push(`Serviço: ${category.name} › ${sub.name}`)
        }

        const pickedItems = sub?.items.filter((item) => (s.itemQuantities[item.id] ?? 0) > 0) ?? []
        if (pickedItems.length > 0) {
          lines.push('Itens:')
          for (const item of pickedItems) {
            const qty = s.itemQuantities[item.id]
            lines.push(`- ${qty}x ${item.name} (${formatCurrency(item.price)})`)
          }
          lines.push(`Total estimado: ${formatCurrency(s.itemsTotal())}`)
        }

        if (s.scheduledHour !== null) {
          lines.push(`Horário preferido: ${slotLabel(s.scheduledHour)}`)
        }
        if (s.phone) lines.push(`Contacto: ${s.phone}`)
        if (s.addressObservations.trim()) lines.push(`Observações: ${s.addressObservations.trim()}`)

        return lines.join('\n')
      },
    }),
    {
      name: 'resolvaagora-booking',
      storage: createJSONStorage(() => sessionStorage),
      // Fotos guardam File em memória — não serializam para sessionStorage.
      partialize: ({ photos: _photos, ...rest }) => rest,
    },
  ),
)
