'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useBookingStore } from '@/lib/store/booking-store'
import { usePublicSettings } from '@/lib/hooks/use-public-settings'
import { otpApi } from '@/lib/api/otp'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ContactPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const phone = useBookingStore((s) => s.phone)
  const setContact = useBookingStore((s) => s.setContact)
  const { settings } = usePublicSettings()
  const [localPhone, setLocalPhone] = useState(phone)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!categoryId) router.replace('/booking/category')
  }, [categoryId, router])

  const valid = localPhone.replace(/\D/g, '').length >= 9
  const otpRequired = Boolean(settings?.smsVerificationEnabled && settings?.smsConfigured)

  async function handleContinue() {
    setContact(localPhone)
    if (!otpRequired) {
      router.push('/booking/address')
      return
    }
    setLoading(true)
    try {
      await otpApi.send(localPhone)
      router.push('/booking/otp')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">O seu contacto</h1>
        <p className="text-sm text-gray-500 mt-1">Para o técnico o poder contactar antes da visita.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-600">
          🇵🇹 +351
        </div>
        <Input
          className="flex-1"
          placeholder="912 345 678"
          value={localPhone}
          onChange={(e) => setLocalPhone(e.target.value)}
        />
      </div>

      <Button className="w-full" size="lg" disabled={!valid} loading={loading} onClick={handleContinue}>
        Continuar
      </Button>
    </div>
  )
}
