'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api/admin'
import type { HomeBanner } from '@/lib/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const emptyBanner: Partial<HomeBanner> = {
  imageUrl: '', title: '', subtitle: '', actionType: '', actionTarget: '', sortOrder: 0, isActive: true,
  startsAt: null, endsAt: null,
}

type ScheduleStatus = 'active' | 'scheduled' | 'expired'

function getScheduleStatus(b: HomeBanner): ScheduleStatus {
  const now = Date.now()
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'scheduled'
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return 'expired'
  return 'active'
}

const SCHEDULE_LABEL: Record<ScheduleStatus, string> = {
  active: 'Ativo agora',
  scheduled: 'Agendado',
  expired: 'Expirado',
}

const SCHEDULE_BADGE_VARIANT: Record<ScheduleStatus, 'success' | 'warning' | 'default'> = {
  active: 'success',
  scheduled: 'warning',
  expired: 'default',
}

/** Formata uma data ISO para o formato aceite por <input type="datetime-local">. */
function toDatetimeLocal(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<HomeBanner> | null>(null)

  function load() {
    setLoading(true)
    adminApi.banners().then(setBanners).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function remove(id: string) {
    if (!confirm('Remover este banner?')) return
    await adminApi.deleteBanner(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners da Página Inicial</h1>
          <p className="text-sm text-gray-500 mt-0.5">{banners.length} banner(s) — apenas os ativos aparecem na app</p>
        </div>
        <button onClick={() => setEditing({ ...emptyBanner })}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800">
          + Novo banner
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">Ainda não há banners. Cria o primeiro.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b) => (
            <Card key={b.id}>
              <CardContent className="py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.title ?? ''} className="w-full h-32 object-cover rounded-lg mb-3" />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{b.title || '(sem título)'}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Ativo' : 'Inativo'}</Badge>
                    {b.isActive && (
                      <Badge variant={SCHEDULE_BADGE_VARIANT[getScheduleStatus(b)]}>{SCHEDULE_LABEL[getScheduleStatus(b)]}</Badge>
                    )}
                  </div>
                </div>
                {b.subtitle && <p className="text-xs text-gray-500 mt-1">{b.subtitle}</p>}
                <p className="text-xs text-gray-400 mt-1">Ordem: {b.sortOrder}{b.actionType ? ` · ${b.actionType}` : ''}</p>
                {(b.startsAt || b.endsAt) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {b.startsAt ? `Desde ${new Date(b.startsAt).toLocaleDateString('pt-PT')}` : 'Sem início definido'}
                    {' · '}
                    {b.endsAt ? `Até ${new Date(b.endsAt).toLocaleDateString('pt-PT')}` : 'Sem fim definido'}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setEditing(b)} className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800">Editar</button>
                  <button onClick={() => remove(b.id)} className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Remover</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <BannerEditor banner={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

function BannerEditor({ banner, onClose, onSaved }: { banner: Partial<HomeBanner>; onClose: () => void; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState(banner.imageUrl ?? '')
  const [title, setTitle] = useState(banner.title ?? '')
  const [subtitle, setSubtitle] = useState(banner.subtitle ?? '')
  const [actionType, setActionType] = useState(banner.actionType ?? '')
  const [actionTarget, setActionTarget] = useState(banner.actionTarget ?? '')
  const [sortOrder, setSortOrder] = useState(String(banner.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(banner.isActive ?? true)
  const [durationDays, setDurationDays] = useState('')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(banner.startsAt))
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(banner.endsAt))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const { url } = await adminApi.uploadImage(file)
      setImageUrl(url)
    } catch { setError('Falha no upload da imagem.') }
    finally { setUploading(false) }
  }

  async function save() {
    if (!imageUrl) { setError('Adiciona uma imagem.'); return }
    setSaving(true); setError('')

    // "Publicar por X dias" tem prioridade sobre as datas escolhidas manualmente:
    // define o início agora (se ainda não houver um) e calcula o fim a partir daí.
    let finalStartsAt = startsAt ? new Date(startsAt).toISOString() : null
    let finalEndsAt = endsAt ? new Date(endsAt).toISOString() : null
    const days = Number(durationDays)
    if (durationDays.trim() && days > 0) {
      const start = finalStartsAt ? new Date(finalStartsAt) : new Date()
      finalStartsAt = start.toISOString()
      finalEndsAt = new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
    }

    const payload = {
      imageUrl,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      actionType: actionType || null,
      actionTarget: actionTarget.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
      startsAt: finalStartsAt,
      endsAt: finalEndsAt,
    }
    try {
      if ((banner as HomeBanner).id) await adminApi.updateBanner((banner as HomeBanner).id, payload)
      else await adminApi.createBanner(payload)
      onSaved()
    } catch { setError('Não foi possível guardar.'); setSaving(false) }
  }

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm'
  const label = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{(banner as HomeBanner).id ? 'Editar banner' : 'Novo banner'}</h2>
        <div className="space-y-3">
          <div>
            <label className={label}>Imagem *</label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="w-full h-36 object-cover rounded-lg mb-2" />
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="text-sm" />
            {uploading && <p className="text-xs text-gray-400 mt-1">A carregar…</p>}
          </div>
          <div>
            <label className={label}>Título</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={label}>Subtítulo</label>
            <input className={field} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Ação ao tocar</label>
              <select className={field} value={actionType} onChange={(e) => setActionType(e.target.value)}>
                <option value="">Nenhuma</option>
                <option value="category">Abrir categoria</option>
                <option value="subscription">Plano Premium</option>
                <option value="url">Abrir link</option>
              </select>
            </div>
            <div>
              <label className={label}>Destino (id categoria / url)</label>
              <input className={field} value={actionTarget} onChange={(e) => setActionTarget(e.target.value)}
                placeholder={actionType === 'category' ? 'ex: ELECTRICITY' : actionType === 'url' ? 'https://…' : '—'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={label}>Ordem</label>
              <input className={field} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Ativo (visível na app)
            </label>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className={label}>Publicar por quantos dias (a partir de agora)</label>
            <input className={field} type="number" min="1" value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="ex: 7 — deixa em branco para escolher datas manualmente" />
            <p className="text-xs text-gray-400 mt-1">
              Se preenchido, substitui as datas abaixo: início agora e fim daqui a X dias.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Início (opcional)</label>
              <input className={field} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className={label}>Fim (opcional)</label>
              <input className={field} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving || uploading}
            className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
