'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { adminApi } from '@/lib/api/admin'
import {
  catalogContentApi,
  contentFor,
  type CatalogContent,
  type CatalogContentMap,
  type CatalogContentPayload,
} from '@/lib/api/catalog-content'
import { useCatalogStore } from '@/lib/store/catalog-store'
import type { ServiceCategory, ServiceSubcategory } from '@/lib/data/services-catalog'
import { ServicePhoto } from '@/components/catalog/service-photo'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_LINES = 12
const MAX_LINE = 160
const MAX_BADGE = 24

const toLines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/**
 * Apresentação do catálogo: fotografia e selo de cada categoria, e o
 * "Inclui / Não inclui" de cada serviço. Aparece na app e no site.
 */
export default function ServiceContentPage() {
  const categories = useCatalogStore((s) => s.categories)
  const [content, setContent] = useState<CatalogContentMap | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  async function reload() {
    try {
      setContent(await catalogContentApi.get())
    } catch {
      toast.error('Não foi possível carregar o conteúdo do catálogo.')
      setContent({})
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apresentação dos serviços</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Fotografia e selo de cada categoria, e o que cada serviço inclui e não inclui. Os textos começam com um
          rascunho da equipa — reveja-os antes de os considerar finais. As alterações aparecem na app e no site em
          cerca de um minuto.
        </p>
      </div>

      {!content ? (
        <p className="text-sm text-gray-500">A carregar…</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              content={content}
              open={openId === cat.id}
              onToggle={() => setOpenId(openId === cat.id ? null : cat.id)}
              onSaved={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryBlock({
  category,
  content,
  open,
  onToggle,
  onSaved,
}: {
  category: ServiceCategory
  content: CatalogContentMap
  open: boolean
  onToggle: () => void
  onSaved: () => Promise<void>
}) {
  const c = contentFor(content, category.id)
  const edited = category.subcategories.filter((s) => contentFor(content, category.id, s.id).customized).length

  return (
    <Card>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-4 p-4 text-left">
        <ServicePhoto
          categoryId={category.id}
          imageUrl={c.imageUrl}
          className="h-14 w-20 flex-shrink-0 rounded-lg"
          iconClassName="h-6 w-6"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">
            {category.name}
            {category.hidden && <span className="ml-2 text-xs font-normal text-gray-400">(oculta)</span>}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {c.imageUrl ? 'Com fotografia' : 'Sem fotografia'}
            {c.badge && ` · selo “${c.badge}”`} · {edited}/{category.subcategories.length} serviços revistos
          </p>
        </div>
        <ChevronDown className={cn('h-5 w-5 flex-shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <CardContent className="space-y-6 border-t border-gray-100 pt-5">
          <CategoryEditor category={category} content={c} onSaved={onSaved} />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Serviços</h3>
            {category.subcategories.map((sub) => (
              <SubcategoryEditor
                key={sub.id}
                category={category}
                sub={sub}
                content={contentFor(content, category.id, sub.id)}
                onSaved={onSaved}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/** Fotografia e selo da categoria — mostrados nos cartões de destaque. */
function CategoryEditor({
  category,
  content,
  onSaved,
}: {
  category: ServiceCategory
  content: CatalogContent
  onSaved: () => Promise<void>
}) {
  const [badge, setBadge] = useState(content.badge ?? '')
  const [busy, setBusy] = useState(false)

  async function save(payload: CatalogContentPayload, done: string) {
    setBusy(true)
    try {
      await catalogContentApi.save(category.id, null, payload)
      await onSaved()
      toast.success(done)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Não foi possível guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { url } = await adminApi.uploadImage(file)
      setBusy(false)
      await save({ imageUrl: url }, 'Fotografia atualizada.')
    } catch {
      toast.error('Falha no upload da imagem.')
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
      <div>
        <ServicePhoto
          categoryId={category.id}
          imageUrl={content.imageUrl}
          alt={category.name}
          className="aspect-[16/10] w-full rounded-xl"
        />
        <div className="mt-2 flex gap-2">
          <label
            className={cn(
              'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <ImagePlus className="h-4 w-4" />
            {content.imageUrl ? 'Trocar' : 'Carregar fotografia'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
          </label>
          {content.imageUrl && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => save({ imageUrl: null }, 'Fotografia retirada.')}
              aria-label="Retirar fotografia"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">Horizontal, 1600×1000 ou maior. Sem fotografia, fica o fundo da marca.</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700" htmlFor={`badge-${category.id}`}>
          Selo no cartão
        </label>
        <p className="text-xs text-gray-500">Ex: “Mais pedido”, “Novo”. Vazio = sem selo.</p>
        <div className="mt-2 flex gap-2">
          <input
            id={`badge-${category.id}`}
            value={badge}
            maxLength={MAX_BADGE}
            onChange={(e) => setBadge(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
          />
          <Button
            size="sm"
            disabled={busy || badge.trim() === (content.badge ?? '')}
            onClick={() => save({ badge: badge.trim() || null }, 'Selo guardado.')}
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

/** "Inclui / Não inclui" de um serviço, um ponto por linha. */
function SubcategoryEditor({
  category,
  sub,
  content,
  onSaved,
}: {
  category: ServiceCategory
  sub: ServiceSubcategory
  content: CatalogContent
  onSaved: () => Promise<void>
}) {
  const [includes, setIncludes] = useState(content.includes.join('\n'))
  const [excludes, setExcludes] = useState(content.excludes.join('\n'))
  const [busy, setBusy] = useState(false)

  // Depois de "repor rascunho" o servidor devolve outros textos: acompanha-os.
  useEffect(() => {
    setIncludes(content.includes.join('\n'))
    setExcludes(content.excludes.join('\n'))
  }, [content])

  const inc = toLines(includes)
  const exc = toLines(excludes)
  const tooLong = [...inc, ...exc].some((l) => l.length > MAX_LINE)
  const tooMany = inc.length > MAX_LINES || exc.length > MAX_LINES
  const dirty = inc.join('\n') !== content.includes.join('\n') || exc.join('\n') !== content.excludes.join('\n')

  async function save(payload: CatalogContentPayload, done: string) {
    setBusy(true)
    try {
      await catalogContentApi.save(category.id, sub.id, payload)
      await onSaved()
      toast.success(done)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Não foi possível guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-gray-900">{sub.name}</p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            content.customized ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
          )}
        >
          {content.customized ? 'Revisto' : 'Rascunho'}
        </span>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <ListField label="Inclui" value={includes} onChange={setIncludes} count={inc.length} />
        <ListField label="Não inclui" value={excludes} onChange={setExcludes} count={exc.length} />
      </div>

      {(tooLong || tooMany) && (
        <p className="mt-2 text-xs text-red-600">
          Máximo de {MAX_LINES} pontos por lista e {MAX_LINE} caracteres por ponto.
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {content.customized && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => save({ resetText: true }, 'Rascunho reposto.')}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Repor rascunho
          </Button>
        )}
        <Button
          size="sm"
          disabled={busy || tooLong || tooMany || (!dirty && content.customized)}
          onClick={() => save({ includes: inc, excludes: exc }, 'Textos guardados.')}
        >
          {dirty || content.customized ? 'Guardar' : 'Marcar como revisto'}
        </Button>
      </div>
    </div>
  )
}

function ListField({
  label,
  value,
  onChange,
  count,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  count: number
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm font-medium text-gray-700">
        {label}
        <span className="text-xs font-normal text-gray-400">
          {count}/{MAX_LINES} · um por linha
        </span>
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(Math.max(count + 1, 4), 10)}
        className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-accent-500 focus:outline-none"
      />
    </label>
  )
}
