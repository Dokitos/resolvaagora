// Lookup de código postal PT → "Cidade, Distrito".
// Porte 1:1 de mobile-technician/lib/core/utils/pt_postal.dart.

const PT_POSTAL_PREFIXES: Record<string, string> = {
  '1000': 'Lisboa, Lisboa',
  '1100': 'Lisboa, Lisboa',
  '1200': 'Lisboa, Lisboa',
  '1250': 'Lisboa, Lisboa',
  '1300': 'Lisboa, Lisboa',
  '1400': 'Lisboa, Lisboa',
  '1500': 'Lisboa, Lisboa',
  '1600': 'Lisboa, Lisboa',
  '1700': 'Lisboa, Lisboa',
  '1800': 'Lisboa, Lisboa',
  '1900': 'Lisboa, Lisboa',
  '1990': 'Lisboa, Lisboa',
  '2000': 'Santarém, Santarém',
  '2100': 'Coruche, Santarém',
  '2600': 'Vila Franca de Xira, Lisboa',
  '2700': 'Amadora, Lisboa',
  '2800': 'Almada, Setúbal',
  '2830': 'Barreiro, Setúbal',
  '2840': 'Seixal, Setúbal',
  '2850': 'Moita, Setúbal',
  '2860': 'Moita, Setúbal',
  '2870': 'Montijo, Setúbal',
  '2880': 'Alcochete, Setúbal',
  '2890': 'Samouco, Alcochete',
  '2900': 'Setúbal, Setúbal',
  '3000': 'Coimbra, Coimbra',
  '4000': 'Porto, Porto',
  '4100': 'Porto, Porto',
  '4150': 'Porto, Porto',
  '4200': 'Porto, Porto',
  '4250': 'Porto, Porto',
  '4300': 'Porto, Porto',
  '4400': 'Vila Nova de Gaia, Porto',
  '4430': 'Vila Nova de Gaia, Porto',
  '4450': 'Matosinhos, Porto',
  '4460': 'Matosinhos, Porto',
  '4470': 'Maia, Porto',
  '4480': 'Vila do Conde, Porto',
  '4700': 'Braga, Braga',
  '4710': 'Braga, Braga',
  '4800': 'Guimarães, Braga',
  '5000': 'Vila Real, Vila Real',
  '6000': 'Castelo Branco, Castelo Branco',
  '7000': 'Évora, Évora',
  '8000': 'Faro, Faro',
  '8100': 'Loulé, Faro',
  '8200': 'Albufeira, Faro',
  '8500': 'Portimão, Faro',
  '9000': 'Funchal, Madeira',
  '9500': 'Ponta Delgada, Açores',
}

/** Devolve "Cidade, Distrito" para um código postal (ou prefixo de 4+ dígitos), ou null. */
export function lookupPostalDisplay(raw: string): string | null {
  const clean = raw.replace(/-/g, '').replace(/\s/g, '')
  if (clean.length < 4) return null
  const prefix = clean.slice(0, 4)
  const exact = PT_POSTAL_PREFIXES[prefix]
  if (exact) return exact
  // Tenta prefixos progressivamente mais curtos.
  for (let len = prefix.length - 1; len >= 1; len--) {
    const sub = prefix.slice(0, len)
    const match = Object.entries(PT_POSTAL_PREFIXES).find(([key]) => key.startsWith(sub))
    if (match) return match[1]
  }
  return null
}

/** Devolve cidade/distrito separados para um código postal, ou null. */
export function lookupPostalParts(raw: string): { city: string; district: string } | null {
  const display = lookupPostalDisplay(raw)
  if (!display) return null
  const parts = display.split(',').map((s) => s.trim())
  const city = parts[0] ?? ''
  const district = parts[1] ?? city
  return { city, district }
}
