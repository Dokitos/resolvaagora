/**
 * Distritos exatamente como os técnicos os têm na cobertura (ver
 * `kPortugalDistricts` na app e o formulário de técnicos no painel).
 *
 * A distribuição automática compara o distrito da morada com a cobertura dos
 * técnicos por igualdade de texto. Um distrito escrito de outra forma — ou um
 * concelho no lugar do distrito, como a antiga tabela da app fazia com
 * "Alcochete" — faz o pedido nunca ser atribuído a ninguém.
 */
export const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real',
  'Viseu', 'Açores', 'Madeira',
] as const;

/** ISO 3166-2:PT, que o Nominatim devolve e é mais fiável do que o nome. */
const ISO_DISTRICT: Record<string, string> = {
  'PT-01': 'Aveiro', 'PT-02': 'Beja', 'PT-03': 'Braga', 'PT-04': 'Bragança',
  'PT-05': 'Castelo Branco', 'PT-06': 'Coimbra', 'PT-07': 'Évora', 'PT-08': 'Faro',
  'PT-09': 'Guarda', 'PT-10': 'Leiria', 'PT-11': 'Lisboa', 'PT-12': 'Portalegre',
  'PT-13': 'Porto', 'PT-14': 'Santarém', 'PT-15': 'Setúbal', 'PT-16': 'Viana do Castelo',
  'PT-17': 'Vila Real', 'PT-18': 'Viseu', 'PT-20': 'Açores', 'PT-30': 'Madeira',
};

const fold = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const AZORES = ['acores', 'sao miguel', 'terceira', 'faial', 'pico', 'flores', 'graciosa', 'santa maria', 'sao jorge', 'corvo'];

/**
 * Converte o que a fonte devolver num dos 20 distritos da lista, ou `null`
 * se não for reconhecível — nunca inventa um distrito.
 */
export function normalizeDistrict(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const f = fold(raw);
  const exact = DISTRICTS.find((d) => fold(d) === f);
  if (exact) return exact;
  // Nas ilhas os dados dos CTT trazem a ilha ("Ilha de São Miguel") em vez do
  // distrito, e os técnicos têm "Açores" / "Madeira".
  if (f.includes('madeira') || f.includes('porto santo')) return 'Madeira';
  if (AZORES.some((a) => f.includes(a))) return 'Açores';
  return null;
}

export function districtFromIso(code: string | null | undefined): string | null {
  return code ? ISO_DISTRICT[code] ?? null : null;
}
