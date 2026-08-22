'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  adminApi,
  type AudienceSegment,
  type CampaignAudience,
  type CampaignInput,
} from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Bell, CalendarClock, Send, Trash2, Users, XCircle } from 'lucide-react'

type Campaign = {
  id: string
  title: string
  body: string
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED'
  audience: CampaignAudience
  segment?: AudienceSegment | null
  scheduledAt?: string | null
  sentAt?: string | null
  recipientCount: number
  deliveredCount: number
  failureReason?: string | null
  group?: { id: string; name: string } | null
  createdAt: string
}

type Group = { id: string; name: string; description?: string; _count: { members: number } }

const AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  ALL_USERS: 'Todos os utilizadores',
  ALL_CLIENTS: 'Todos os clientes',
  ALL_TECHNICIANS: 'Todos os técnicos',
  GROUP: 'Grupo',
  SEGMENT: 'Segmento',
}

const STATUS_STYLE: Record<Campaign['status'], { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  SCHEDULED: { label: 'Agendada', className: 'bg-blue-100 text-blue-700' },
  SENDING: { label: 'A enviar', className: 'bg-amber-100 text-amber-700' },
  SENT: { label: 'Enviada', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500' },
  FAILED: { label: 'Falhou', className: 'bg-red-100 text-red-700' },
}

const EMPTY: CampaignInput = { title: '', body: '', audience: 'ALL_CLIENTS' }

export default function NotificationsPage() {
  const [tab, setTab] = useState<'compose' | 'campaigns' | 'groups'>('compose')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  const load = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([adminApi.campaigns(), adminApi.notificationGroups()])
      setCampaigns(c)
      setGroups(g)
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Bell className="h-5 w-5" />
        Notificações
      </h1>

      <div className="flex gap-2 border-b border-gray-200">
        {([
          ['compose', 'Nova'],
          ['campaigns', `Campanhas (${campaigns.length})`],
          ['groups', `Grupos (${groups.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'border-b-2 border-brand-600 px-4 py-2 text-sm font-medium text-brand-600'
                : 'px-4 py-2 text-sm text-gray-500 hover:text-gray-700'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'compose' && <Compose groups={groups} onDone={load} />}
      {tab === 'campaigns' && <CampaignList campaigns={campaigns} onChange={load} />}
      {tab === 'groups' && <GroupList groups={groups} onChange={load} />}
    </div>
  )
}

// ─── Nova notificação ────────────────────────────────────────────────────────

function Compose({ groups, onDone }: { groups: Group[]; onDone: () => void }) {
  const [form, setForm] = useState<CampaignInput>(EMPTY)
  const [segment, setSegment] = useState<AudienceSegment>({})
  const [scheduled, setScheduled] = useState('')
  const [reach, setReach] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const payload = (): CampaignInput => ({
    ...form,
    segment: form.audience === 'SEGMENT' ? cleanSegment(segment) : undefined,
    groupId: form.audience === 'GROUP' ? form.groupId : undefined,
    // O input datetime-local devolve hora local sem fuso; o `new Date` aplica
    // o do browser, que é o que o admin tem em mente ao escolher a hora.
    scheduledAt: scheduled ? new Date(scheduled).toISOString() : null,
  })

  async function preview() {
    try {
      const { audience, groupId, segment: seg } = payload()
      const r = await adminApi.previewAudience({ audience, groupId, segment: seg })
      setReach(r.count)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function submit(mode: 'draft' | 'schedule' | 'now') {
    if (!form.title.trim() || !form.body.trim()) {
      return toast.error('Título e mensagem são obrigatórios')
    }
    if (mode === 'schedule' && !scheduled) {
      return toast.error('Escolhe a data e a hora do envio')
    }

    setBusy(true)
    try {
      const body = payload()
      const created = await adminApi.createCampaign({
        ...body,
        // Enviar já não passa por agendamento: cria-se como rascunho e
        // dispara-se logo a seguir.
        scheduledAt: mode === 'schedule' ? body.scheduledAt : null,
      })

      if (mode === 'now') {
        const sent = await adminApi.sendCampaign(created.id)
        toast.success(`Enviada a ${sent.recipientCount} utilizador(es)`)
      } else {
        toast.success(mode === 'schedule' ? 'Notificação agendada' : 'Rascunho guardado')
      }

      setForm(EMPTY)
      setSegment({})
      setScheduled('')
      setReach(null)
      onDone()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escrever notificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Textarea
          placeholder="Mensagem"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="min-h-24"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Destinatários</label>
          <Select
            value={form.audience}
            onChange={(e) => {
              setForm({ ...form, audience: e.target.value as CampaignAudience })
              setReach(null)
            }}
            options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>

        {form.audience === 'GROUP' && (
          <Select
            value={form.groupId ?? ''}
            onChange={(e) => {
              setForm({ ...form, groupId: e.target.value })
              setReach(null)
            }}
            options={[
              { value: '', label: 'Escolhe um grupo…' },
              ...groups.map((g) => ({ value: g.id, label: `${g.name} (${g._count.members})` })),
            ]}
          />
        )}

        {form.audience === 'SEGMENT' && (
          <SegmentFields
            segment={segment}
            onChange={(s) => {
              setSegment(s)
              setReach(null)
            }}
          />
        )}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={preview} className="bg-gray-100 text-gray-700 hover:bg-gray-200">
            <Users className="mr-1 h-4 w-4" />
            Calcular alcance
          </Button>
          {reach !== null && (
            <span className="text-sm text-gray-600">
              Atinge <strong>{reach}</strong> utilizador(es)
            </span>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Agendar para (opcional)
          </label>
          <Input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => submit('now')} loading={busy} className="bg-brand-600 hover:bg-brand-700">
            <Send className="mr-1 h-4 w-4" />
            Enviar agora
          </Button>
          <Button
            onClick={() => submit('schedule')}
            loading={busy}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <CalendarClock className="mr-1 h-4 w-4" />
            Agendar
          </Button>
          <Button
            onClick={() => submit('draft')}
            loading={busy}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Guardar rascunho
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SegmentFields({
  segment,
  onChange,
}: {
  segment: AudienceSegment
  onChange: (s: AudienceSegment) => void
}) {
  const set = (patch: Partial<AudienceSegment>) => onChange({ ...segment, ...patch })
  const num = (v: string) => (v === '' ? undefined : Number(v))

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        Os critérios combinam-se entre si. Deixar em branco significa "não filtrar por isto".
      </p>

      <Select
        value={segment.role ?? ''}
        onChange={(e) => set({ role: (e.target.value || undefined) as AudienceSegment['role'] })}
        options={[
          { value: '', label: 'Clientes e técnicos' },
          { value: 'CLIENT', label: 'Só clientes' },
          { value: 'TECHNICIAN', label: 'Só técnicos' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Registados há menos de (dias)</label>
          <Input
            type="number"
            min="1"
            placeholder="Ex: 7"
            value={segment.registeredWithinDays ?? ''}
            onChange={(e) => set({ registeredWithinDays: num(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Registados há mais de (dias)</label>
          <Input
            type="number"
            min="1"
            placeholder="Ex: 30"
            value={segment.registeredMoreThanDays ?? ''}
            onChange={(e) => set({ registeredMoreThanDays: num(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Mín. serviços concluídos</label>
          <Input
            type="number"
            min="0"
            placeholder="Ex: 1"
            value={segment.minCompletedServices ?? ''}
            onChange={(e) => set({ minCompletedServices: num(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Máx. serviços concluídos</label>
          <Input
            type="number"
            min="0"
            placeholder="Ex: 0 (nunca usou)"
            value={segment.maxCompletedServices ?? ''}
            onChange={(e) => set({ maxCompletedServices: num(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-600">Distrito (só técnicos)</label>
        <Input
          placeholder="Ex: Lisboa"
          value={segment.district ?? ''}
          onChange={(e) => set({ district: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}

/** Retira os campos vazios: enviá-los como `undefined` explícito polui o JSON. */
function cleanSegment(s: AudienceSegment): AudienceSegment {
  return Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== ''))
}

// ─── Campanhas ───────────────────────────────────────────────────────────────

function CampaignList({ campaigns, onChange }: { campaigns: Campaign[]; onChange: () => void }) {
  async function act(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn()
      toast.success(ok)
      onChange()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? err.message)
    }
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">
          Ainda não há campanhas. Cria a primeira no separador "Nova".
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const style = STATUS_STYLE[c.status]
        const editable = c.status === 'DRAFT' || c.status === 'SCHEDULED'
        return (
          <Card key={c.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{c.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{c.body}</p>
                </div>
                <Badge className={style.className}>{style.label}</Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>{c.group ? `Grupo: ${c.group.name}` : AUDIENCE_LABELS[c.audience]}</span>
                {c.scheduledAt && <span>Agendada: {formatDateTime(c.scheduledAt)}</span>}
                {c.sentAt && (
                  <span>
                    Enviada {formatDateTime(c.sentAt)} · {c.deliveredCount}/{c.recipientCount} entregues
                  </span>
                )}
              </div>

              {c.failureReason && <p className="text-xs text-red-600">{c.failureReason}</p>}

              {editable && (
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => act(() => adminApi.sendCampaign(c.id), 'Notificação enviada')}
                    className="bg-brand-600 text-xs hover:bg-brand-700"
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Enviar agora
                  </Button>
                  {c.status === 'SCHEDULED' && (
                    <Button
                      onClick={() => act(() => adminApi.cancelCampaign(c.id), 'Agendamento cancelado')}
                      className="bg-gray-100 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Cancelar
                    </Button>
                  )}
                  <Button
                    onClick={() => act(() => adminApi.deleteCampaign(c.id), 'Campanha apagada')}
                    className="bg-red-50 text-xs text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Apagar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Grupos ──────────────────────────────────────────────────────────────────

function GroupList({ groups, onChange }: { groups: Group[]; onChange: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) return toast.error('Dá um nome ao grupo')
    setBusy(true)
    try {
      await adminApi.createNotificationGroup({ name, description: description || undefined })
      toast.success('Grupo criado')
      setName('')
      setDescription('')
      onChange()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Novo grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button onClick={create} loading={busy} className="bg-brand-600 hover:bg-brand-700">
            Criar grupo
          </Button>
        </CardContent>
      </Card>

      {groups.map((g) => (
        <Card key={g.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-gray-900">{g.name}</p>
              {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
              <p className="mt-0.5 text-xs text-gray-400">{g._count.members} membro(s)</p>
            </div>
            <Button
              onClick={async () => {
                try {
                  await adminApi.deleteNotificationGroup(g.id)
                  toast.success('Grupo apagado')
                  onChange()
                } catch (err: any) {
                  toast.error(err.message)
                }
              }}
              className="bg-red-50 text-xs text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
