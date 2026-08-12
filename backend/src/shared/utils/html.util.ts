/**
 * Faz "encode-on-output" de caracteres especiais de HTML — usar sempre que
 * texto potencialmente escrito por um utilizador (nome, morada, descrição,
 * "Observações", etc.) é interpolado dentro de uma string HTML (ex.: corpo
 * de email), para impedir XSS armazenado (ex.: `<script>` num campo livre).
 *
 * Não usar em campos já seguros por construção (números, datas formatadas,
 * strings fixas/enum) nem para "sanitizar" o valor guardado na BD — a
 * abordagem correta é sempre validar/guardar o texto tal como foi escrito
 * (para não corromper nomes como "O'Brien") e só escapar no momento em que
 * entra num contexto HTML.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa HTML e converte quebras de linha em `<br>` — útil para texto livre
 * (ex.: descrições) que deve preservar formatação de parágrafos no email. */
export function escapeHtmlWithLineBreaks(input: string): string {
  return escapeHtml(input).replace(/\r\n|\r|\n/g, '<br>');
}
