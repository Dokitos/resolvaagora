'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, Lock, Camera } from 'lucide-react'
import { clientApi } from '@/lib/api/client-api'
import type { ClientProfile } from '@/lib/api/types'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [nif, setNif] = useState('')

  useEffect(() => {
    clientApi.getProfile().then((p) => {
      setProfile(p)
      setFirstName(p.firstName)
      setLastName(p.lastName)
      setPhone(p.phone ?? '')
      setNif(p.nif ?? '')
      setPhotoUrl(p.photoUrl)
    }).finally(() => setLoading(false))
  }, [])

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const { photoUrl: url } = await clientApi.uploadPhoto(file)
      setPhotoUrl(url)
      toast.success('Foto atualizada')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingPhoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Nome e apelido são obrigatórios')
      return
    }
    setSaving(true)
    try {
      await clientApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        nif: nif.trim() || undefined,
      })
      toast.success('Perfil atualizado com sucesso')
      router.push('/account')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar perfil</h1>
      </div>

      <div className="flex justify-center">
        <div className="relative">
          <Avatar src={photoUrl} name={`${firstName} ${lastName}`} size="lg" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -right-1 -bottom-1 bg-accent-600 rounded-full p-1.5 text-white"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Email</label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3.5 py-2.5">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="flex-1 text-sm text-gray-700">{profile.email}</span>
          <Lock className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>

      <Input label="Nome" placeholder="O teu nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <Input label="Apelido" placeholder="O teu apelido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <Input label="Telefone" placeholder="9XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      <Input label="NIF" placeholder="Número de contribuinte" value={nif} onChange={(e) => setNif(e.target.value.replace(/\D/g, ''))} />

      <Button className="w-full" size="lg" loading={saving} onClick={handleSave}>
        Guardar alterações
      </Button>
    </div>
  )
}
