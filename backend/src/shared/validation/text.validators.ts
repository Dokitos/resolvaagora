import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
  buildMessage,
  type ValidationOptions,
} from 'class-validator';

/**
 * Validadores de texto partilhados por todos os DTOs.
 *
 * Existem porque os campos de texto só validavam o comprimento: um nome
 * "Douglas😀" ou um NIF com letras passavam, e ficavam gravados, a aparecer em
 * recibos, no painel e nas notificações dos técnicos. A validação vive no
 * servidor porque é o único sítio que não se contorna — a app e o site também
 * bloqueiam à entrada, mas isso é conforto, não segurança.
 */

/**
 * Emoji e afins: pictogramas, seletores de variação e o "zero-width joiner" que
 * cola emojis compostos (👨‍🔧). Bloquear só `Extended_Pictographic` deixava
 * passar os restos invisíveis.
 */
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]/u;

/** Caracteres de controlo, exceto as quebras de linha que o texto livre aceita. */
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/;
const CONTROL_ANY = /[\u0000-\u001F\u007F-\u009F]/;

/** Apara e colapsa espaços repetidos. Não mexe em valores que não sejam texto. */
const trimCollapse = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/[ \t]+/g, ' ') : value,
  );

/**
 * Nome de pessoa: letras de qualquer língua (inclui acentos e ç), espaços,
 * apóstrofo e hífen — "Ana-Maria d'Almeida" passa, "Douglas😀" e "João2" não.
 */
export function IsPersonName(max = 60, options?: ValidationOptions) {
  return applyDecorators(
    trimCollapse(),
    MinLength(1, { message: 'O nome é obrigatório.' }),
    MaxLength(max, { message: `O nome não pode passar de ${max} caracteres.` }),
    Matches(/^\p{L}[\p{L}\p{M}' .-]*$/u, {
      message: 'O nome só pode ter letras, espaços, hífen e apóstrofo.',
      ...options,
    }),
  );
}

/**
 * Texto livre (descrições, mensagens, notas): aceita letras, números e
 * pontuação normal, incluindo €, %, / e afins. Recusa emoji e caracteres de
 * controlo, que partem recibos PDF e emails e servem para esconder conteúdo.
 */
export function IsCleanText(opts: { max: number; allowNewlines?: boolean }, options?: ValidationOptions) {
  const control = opts.allowNewlines ? CONTROL_EXCEPT_NEWLINE : CONTROL_ANY;
  return applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    MaxLength(opts.max),
    ValidateBy(
      {
        name: 'isCleanText',
        validator: {
          validate: (value) =>
            typeof value === 'string' && !EMOJI.test(value) && !control.test(value),
          defaultMessage: buildMessage(
            () => 'O texto não pode conter emojis nem caracteres especiais invisíveis.',
            options,
          ),
        },
      },
      options,
    ),
  );
}

/**
 * Email só em ASCII. O `IsEmail` por omissão aceita caracteres UTF-8 na parte
 * local, o que deixava passar emojis no próprio endereço.
 */
export function IsStrictEmail(options?: ValidationOptions) {
  return applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsEmail(
      { allow_utf8_local_part: false, allow_display_name: false, allow_ip_domain: false },
      { message: 'Email inválido.', ...options },
    ),
    Matches(/^[\x21-\x7E]+$/, { message: 'Email inválido.' }),
    MaxLength(254),
  );
}

/**
 * Código postal português. Aceita "2890-239", "2890239" ou "2890 239" e grava
 * sempre como "2890-239" — o teclado numérico do iOS não tem hífen, e recusar
 * o que o utilizador consegue escrever seria transferir o problema para ele.
 * Os 4 primeiros dígitos sozinhos também passam, porque o fluxo de reserva só
 * pede a zona.
 */
export function IsPostalCodePT(options?: ValidationOptions) {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;
      const v = value.trim();
      // Só normaliza formas reconhecíveis de um código postal. Tirar todos os
      // não-dígitos transformava "28-90" num "2890" válido, aceitando como
      // zona o que era um erro de escrita.
      const full = /^(\d{4})[\s-]?(\d{3})$/.exec(v);
      return full ? `${full[1]}-${full[2]}` : v;
    }),
    Matches(/^\d{4}(-\d{3})?$/, { message: 'Código postal inválido (formato 0000-000).', ...options }),
  );
}

/** Telefone: dígitos, com "+" opcional à frente. Espaços são removidos. */
export function IsPhone(options?: ValidationOptions) {
  return applyDecorators(
    // Texto vazio vira null: as apps enviam "" quando o campo opcional fica em
    // branco, e sem isto o @IsOptional (que só ignora null/ausente) deixava a
    // validação correr e recusava a gravação do perfil inteiro.
    Transform(({ value }) =>
      typeof value === 'string' ? value.replace(/[\s()-]/g, '') || null : value,
    ),
    Matches(/^\+?[0-9]{9,15}$/, { message: 'Número de telefone inválido.', ...options }),
  );
}

/** Valida o dígito de controlo do NIF português (módulo 11). */
export function isValidNif(nif: string): boolean {
  if (!/^[1-9]\d{8}$/.test(nif)) return false;
  const digits = nif.split('').map(Number);
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const check = 11 - (sum % 11);
  return digits[8] === (check >= 10 ? 0 : check);
}

/** NIF português: 9 dígitos com dígito de controlo válido. */
export function IsNifPT(options?: ValidationOptions) {
  return applyDecorators(
    // Vazio vira null pela mesma razão do telefone.
    Transform(({ value }) =>
      typeof value === 'string' ? value.replace(/\s/g, '') || null : value,
    ),
    ValidateBy(
      {
        name: 'isNifPT',
        validator: {
          validate: (value) => typeof value === 'string' && isValidNif(value),
          defaultMessage: buildMessage(() => 'NIF inválido.', options),
        },
      },
      options,
    ),
  );
}

/**
 * Campos curtos de morada (rua, localidade, andar): como texto livre, mas numa
 * só linha.
 */
export function IsAddressText(max: number, options?: ValidationOptions) {
  return IsCleanText({ max, allowNewlines: false }, options);
}
