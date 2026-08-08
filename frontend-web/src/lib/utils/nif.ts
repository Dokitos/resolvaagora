// Validação de NIF português (número de contribuinte).
//
// Formato: 9 dígitos. O 9º dígito é um dígito de controlo calculado por
// módulo 11 sobre os primeiros 8 dígitos, com pesos 9,8,7,6,5,4,3,2:
//   soma = d1*9 + d2*8 + d3*7 + d4*6 + d5*5 + d6*4 + d7*3 + d8*2
//   resto = soma % 11
//   controlo = resto < 2 ? 0 : 11 - resto

/**
 * Valida um NIF português (9 dígitos + dígito de controlo módulo 11).
 * Aceita o valor com ou sem espaços/traços. Uma string vazia é considerada
 * inválida por esta função — cabe ao chamador decidir se um campo vazio
 * (opcional) deve ou não ser validado.
 */
export function isValidNif(nif: string): boolean {
  const clean = nif.replace(/\s/g, '').replace(/-/g, '')
  if (!/^\d{9}$/.test(clean)) return false

  const digits = clean.split('').map(Number)
  const sum = digits.slice(0, 8).reduce((acc, digit, index) => acc + digit * (9 - index), 0)
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 0 : 11 - remainder

  return checkDigit === digits[8]
}
