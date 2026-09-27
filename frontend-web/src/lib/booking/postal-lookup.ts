import { api } from '@/lib/api/client'

/**
 * Pesquisa de código postal no backend (`GET /geo/postal-code`), com os dados
 * dos CTT: rua, concelho e distrito.
 *
 * Substitui uma tabela escrita à mão com ~50 prefixos que, para códigos que
 * não conhecia, recuava para prefixos mais curtos e devolvia a primeira cidade
 * que encontrasse (Viseu aparecia como Coimbra), e punha concelhos no lugar
 * do distrito ("Alcochete"). Como a distribuição de técnicos compara o
 * distrito, esses pedidos iam para a zona errada ou para ninguém.
 */
export type PostalCodeInfo = {
  postalCode: string
  precision: 'street' | 'zone' | 'approximate'
  streets: string[]
  locality: string | null
  municipality: string | null
  district: string | null
  lat: number
  lng: number
}

/** `not-found` trava a reserva; `offline` (falha de rede) não. */
export type PostalLookupResult = PostalCodeInfo | 'not-found' | 'offline'

export async function lookupPostalCode(code: string): Promise<PostalLookupResult> {
  try {
    const res = await api.get(`/geo/postal-code/${encodeURIComponent(code)}`)
    return res.data as PostalCodeInfo
  } catch (err: any) {
    return err?.response?.status === 404 ? 'not-found' : 'offline'
  }
}

/**
 * Formata enquanto se escreve: só dígitos, com o hífen a aparecer sozinho
 * depois do quarto ("2890239" → "2890-239").
 */
export function formatPostalInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 7)
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits
}

export function isPostalComplete(v: string): boolean {
  return /^\d{4}-\d{3}$/.test(v) || /^\d{4}$/.test(v)
}

/**
 * Data local em AAAA-MM-DD. Não usar `toISOString()` para isto: converte para
 * UTC, e em Portugal no horário de verão a meia-noite de dia 25 é 23h00 UTC
 * de dia 24 — a reserva ficava gravada com um dia a menos.
 */
export function toLocalDateString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
