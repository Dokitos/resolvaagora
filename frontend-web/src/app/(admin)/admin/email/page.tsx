'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { Email, EmailTemplate, EmailFolder } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@/lib/utils'
import {
  Mail, Inbox, Send, FileText, Plus, Star, Trash2, X,
  ArrowLeft, MailOpen, Pencil,
} from 'lucide-react'

const PAGE_SIZE = 20
type Tab = 'inbox' | 'sent' | 'templates'

export default function AdminEmailPage() {
  const [tab, setTab] = useState<Tab>('inbox')
  const [composeOpen, setComposeOpen] = useState(false)

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="h-5 w-5" />Email
        </h1>
        <Button onClick={() => setComposeOpen(true)} className="bg-brand-600 hover:bg-brand-700">
          <Plus className="h-4 w-4" />Novo email
        </Button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')} icon={<Inbox className="h-4 w-4" />} label="Entrada" />
        <TabButton active={tab === 'sent'} onClick={() => setTab('sent')} icon={<Send className="h-4 w-4" />} label="Enviados" />
        <TabButton active={tab === 'templates'} onClick={() => setTab('templates')} icon={<FileText className="h-4 w-4" />} label="Templates" />
      </div>

      {tab === 'inbox' && <MailboxView folder="inbox" />}
      {tab === 'sent' && <MailboxView folder="sent" />}
      {tab === 'templates' && <TemplatesView />}

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={() => { setComposeOpen(false); setTab('sent') }}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}{label}
    </button>
  )
}

/* ── Mailbox (inbox / sent) ─────────────────────────────── */

function MailboxView({ folder }: { folder: EmailFolder }) {
  const [items, setItems] = useState<Email[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Email | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.emails(folder, page)
      setItems(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [folder, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const unread = items.filter((e) => !e.isRead).length

  async function openEmail(e: Email) {
    setSelected(e)
    if (folder === 'inbox' && !e.isRead) {
      try {
        await adminApi.updateEmail(e.id, { isRead: true })
        setItems((prev) => prev.map((x) => (x.id === e.id ? { ...x, isRead: true } : x)))
      } catch { /* ignore */ }
    }
  }

  async function toggleStar(e: Email) {
    try {
      const updated = await adminApi.updateEmail(e.id, { isStarred: !e.isStarred })
      setItems((prev) => prev.map((x) => (x.id === e.id ? { ...x, isStarred: updated.isStarred } : x)))
      if (selected?.id === e.id) setSelected({ ...selected, isStarred: updated.isStarred })
    } catch (err: any) { toast.error(err.message) }
  }

  async function toggleRead(e: Email) {
    try {
      const updated = await adminApi.updateEmail(e.id, { isRead: !e.isRead })
      setItems((prev) => prev.map((x) => (x.id === e.id ? { ...x, isRead: updated.isRead } : x)))
      if (selected?.id === e.id) setSelected({ ...selected, isRead: updated.isRead })
    } catch (err: any) { toast.error(err.message) }
  }

  async function trash(e: Email) {
    if (!confirm('Mover este email para o lixo?')) return
    try {
      await adminApi.updateEmail(e.id, { folder: 'trash' })
      toast.success('Movido para o lixo')
      setSelected(null)
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  if (selected) {
    return (
      <EmailDetail
        email={selected}
        folder={folder}
        onBack={() => setSelected(null)}
        onToggleStar={() => toggleStar(selected)}
        onToggleRead={() => toggleRead(selected)}
        onTrash={() => trash(selected)}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {folder === 'inbox' ? 'Entrada' : 'Enviados'}
          {folder === 'inbox' && unread > 0 && <Badge variant="info">{unread} por ler</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">A carregar...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Sem emails.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map((e) => (
              <li
                key={e.id}
                onClick={() => openEmail(e)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  folder === 'inbox' && !e.isRead ? 'bg-blue-50/40' : ''
                }`}
              >
                <button
                  onClick={(ev) => { ev.stopPropagation(); toggleStar(e) }}
                  className="shrink-0 text-gray-300 hover:text-yellow-400"
                >
                  <Star className={`h-4 w-4 ${e.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${folder === 'inbox' && !e.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {folder === 'sent'
                        ? (e.toEmail?.join(', ') || '—')
                        : (e.fromName || e.fromEmail || '—')}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{e.subject || '(sem assunto)'}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{e.receivedAt ? formatDate(e.receivedAt) : ''}</span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>
    </Card>
  )
}

function EmailDetail({
  email, folder, onBack, onToggleStar, onToggleRead, onTrash,
}: {
  email: Email
  folder: EmailFolder
  onBack: () => void
  onToggleStar: () => void
  onToggleRead: () => void
  onTrash: () => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" />Voltar
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onToggleStar} title="Marcar com estrela" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-yellow-500">
              <Star className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
            {folder === 'inbox' && (
              <button onClick={onToggleRead} title={email.isRead ? 'Marcar como não lido' : 'Marcar como lido'} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                {email.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
              </button>
            )}
            <button onClick={onTrash} title="Mover para o lixo" className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <CardTitle>{email.subject || '(sem assunto)'}</CardTitle>
          <div className="mt-2 text-sm text-gray-500 space-y-0.5">
            <p><span className="text-gray-400">De:</span> {email.fromName ? `${email.fromName} ` : ''}&lt;{email.fromEmail}&gt;</p>
            <p><span className="text-gray-400">Para:</span> {email.toEmail?.join(', ') || '—'}</p>
            <p className="text-xs text-gray-400">{email.receivedAt ? formatDate(email.receivedAt) : ''}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SafeHtml html={email.bodyHtml} fallback={email.bodyText} />
      </CardContent>
    </Card>
  )
}

/**
 * Renders third-party HTML inside a sandboxed iframe (no scripts, no
 * same-origin access), so untrusted markup cannot execute JS, read cookies,
 * or reach the parent document. No external hosts are contacted by the app.
 */
function SafeHtml({ html, fallback }: { html?: string; fallback?: string }) {
  const content = (html && html.trim())
    ? html
    : `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(fallback ?? '')}</pre>`
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#374151;margin:0;padding:4px;word-break:break-word}img{max-width:100%;height:auto}a{color:#2563eb}</style></head><body>${content}</body></html>`
  return (
    <iframe
      title="Conteúdo do email"
      sandbox=""
      srcDoc={doc}
      className="w-full min-h-[300px] border border-gray-100 rounded-lg bg-white"
    />
  )
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ── Compose ────────────────────────────────────────────── */

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!to.trim() || !subject.trim() || !html.trim()) {
      return toast.error('Destinatário, assunto e corpo são obrigatórios')
    }
    setSending(true)
    try {
      await adminApi.sendEmail({ to: to.trim(), subject: subject.trim(), html })
      toast.success('Email enviado')
      onSent()
    } catch (err: any) { toast.error(err.message) } finally { setSending(false) }
  }

  return (
    <Overlay onClose={onClose} title="Novo email">
      <div className="space-y-3">
        <Input label="Para" type="email" placeholder="destinatario@exemplo.pt" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input label="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corpo (HTML)</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<p>Olá...</p>"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-600/30 min-h-48"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <Button onClick={send} loading={sending} className="bg-brand-600 hover:bg-brand-700">
          <Send className="h-4 w-4" />Enviar
        </Button>
        <Button variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
      </div>
    </Overlay>
  )
}

/* ── Templates ──────────────────────────────────────────── */

function TemplatesView() {
  const [items, setItems] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setItems(await adminApi.emailTemplates())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function toggleAtivo(t: EmailTemplate) {
    try {
      await adminApi.updateEmailTemplate(t.id, { ativo: !t.ativo })
      setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, ativo: !x.ativo } : x)))
    } catch (err: any) { toast.error(err.message) }
  }

  async function remove(t: EmailTemplate) {
    if (!confirm(`Eliminar o template "${t.nome}"?`)) return
    try {
      await adminApi.deleteEmailTemplate(t.id)
      toast.success('Template eliminado')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Templates ({items.length})</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-brand-600 hover:bg-brand-700">
          <Plus className="h-4 w-4" />Novo template
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">A carregar...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Assunto</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.nome}</td>
                  <td className="px-4 py-3"><code className="text-xs text-gray-500">{t.slug}</code></td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{t.assunto}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAtivo(t)}>
                      <Badge className={t.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(t)} className="text-gray-400 hover:text-gray-700 mr-3"><Pencil className="h-4 w-4 inline" /></button>
                    <button onClick={() => remove(t)} className="text-brand-600 hover:text-brand-700"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sem templates.</td></tr>}
            </tbody>
          </table>
        )}
      </CardContent>

      {(creating || editing) && (
        <TemplateModal
          template={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </Card>
  )
}

function TemplateModal({ template, onClose, onSaved }: { template: EmailTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(template?.nome ?? '')
  const [slug, setSlug] = useState(template?.slug ?? '')
  const [assunto, setAssunto] = useState(template?.assunto ?? '')
  const [bodyHtml, setBodyHtml] = useState(template?.bodyHtml ?? '')
  const [variaveis, setVariaveis] = useState((template?.variaveis ?? []).join(', '))
  const [ativo, setAtivo] = useState(template?.ativo ?? true)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!nome.trim() || !slug.trim() || !assunto.trim()) {
      return toast.error('Nome, slug e assunto são obrigatórios')
    }
    setSaving(true)
    const payload = {
      nome: nome.trim(),
      slug: slug.trim(),
      assunto: assunto.trim(),
      bodyHtml,
      variaveis: variaveis.split(',').map((v) => v.trim()).filter(Boolean),
      ativo,
    }
    try {
      if (template) await adminApi.updateEmailTemplate(template.id, payload)
      else await adminApi.createEmailTemplate(payload)
      toast.success(template ? 'Template atualizado' : 'Template criado')
      onSaved()
    } catch (err: any) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <Overlay onClose={onClose} title={template ? 'Editar template' : 'Novo template'}>
      <div className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: boas-vindas" />
        </div>
        <Input label="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corpo (HTML)</label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="<p>Olá {nome}...</p>"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-600/30 min-h-40"
          />
        </div>
        <Input label="Variáveis (separadas por vírgula)" value={variaveis} onChange={(e) => setVariaveis(e.target.value)} placeholder="nome, codigo, valor" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <span className="text-sm text-gray-700">Template ativo</span>
        </label>
      </div>
      <div className="flex gap-3 pt-4">
        <Button onClick={save} loading={saving} className="bg-brand-600 hover:bg-brand-700">Guardar</Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
      </div>
    </Overlay>
  )
}

/* ── Shared wide overlay ────────────────────────────────── */

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
