'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useBookingStore } from '@/lib/store/booking-store'
import { otpApi } from '@/lib/api/otp'
import { Button } from '@/components/ui/button'

export default function OtpPage() {
  const router = useRouter()
  const phone = useBookingStore((s) => s.phone)
  const setOtpVerified = useBookingStore((s) => s.setOtpVerified)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!phone) router.replace('/booking/contact')
  }, [phone, router])

  async function handleVerify() {
    setLoading(true)
    try {
      const { valid } = await otpApi.verify(code)
      if (!valid) {
        toast.error('Código inválido. Tente novamente.')
        return
      }
      setOtpVerified(true)
      router.push('/booking/address')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await otpApi.send(phone)
      toast.success('Código reenviado.')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Confirme o seu número</h1>
        <p className="text-sm text-gray-500 mt-1">Enviámos um código de 6 dígitos por SMS para +351 {phone}.</p>
      </div>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        placeholder="000000"
        className="w-full text-center text-2xl tracking-[0.5em] rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <Button className="w-full" size="lg" disabled={code.length !== 6} loading={loading} onClick={handleVerify}>
        Confirmar
      </Button>

      <button
        onClick={handleResend}
        disabled={resending}
        className="w-full text-center text-sm text-blue-600 font-medium disabled:opacity-50"
      >
        Reenviar código
      </button>
    </div>
  )
}
