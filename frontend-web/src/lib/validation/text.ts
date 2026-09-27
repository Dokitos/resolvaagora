import { z } from 'zod'

/**
 * Regras de texto do site — as mesmas do servidor
 * (backend/src/shared/validation/text.validators.ts) e da app.
 *
 * O servidor é quem garante; isto dá a mensagem certa ao utilizador antes de
 * enviar, e limpa o que é colado.
 *
 * As expressões são construídas com `new RegExp` porque o tsconfig do site
 * aponta a ES5, que não aceita a flag `u` em literais. Os browsers suportam-na
 * desde 2016.
 */

/** Emoji, seletores de variação e o "zero-width joiner" dos emojis compostos. */
const EMOJI_SRC = String.raw`[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]`
const CONTROL_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g

export const NAME_RE = new RegExp(String.raw`^\p{L}[\p{L}\p{M}' .-]*$`, 'u')
const NOT_NAME_CHAR = new RegExp(String.raw`[^\p{L}\p{M}' .-]`, 'gu')

/** Retira emoji e caracteres de controlo — para usar no onChange de campos de texto. */
export function stripEmoji(v: string): string {
  return v.replace(new RegExp(EMOJI_SRC, 'gu'), '').replace(CONTROL_RE, '')
}

/** Nomes: só letras, espaço, hífen, apóstrofo e ponto. */
export function sanitizeName(v: string): string {
  return v.replace(NOT_NAME_CHAR, '').slice(0, 60)
}

export function hasEmoji(v: string): boolean {
  return new RegExp(EMOJI_SRC, 'u').test(v)
}

export const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} obrigatório`)
    .max(60, `${label} demasiado longo`)
    .regex(NAME_RE, `${label} só pode ter letras, espaços, hífen e apóstrofo`)

export const strictEmail = z
  .string()
  .trim()
  .email('Email inválido')
  .regex(/^[\x21-\x7E]+$/, 'Email inválido')

export const phone = z
  .string()
  .trim()
  .regex(/^(\+?[0-9]{9,15})?$/, 'Telefone inválido')

export function validateName(v: string, label = 'O nome'): string | undefined {
  const s = v.trim()
  if (!s) return `${label} é obrigatório.`
  if (!NAME_RE.test(s)) return `${label} só pode ter letras, espaços, hífen e apóstrofo.`
  return undefined
}
