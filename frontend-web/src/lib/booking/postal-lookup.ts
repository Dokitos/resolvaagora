// Lookup de código postal PT → "Cidade, Distrito".
// Porte 1:1 de mobile-technician/lib/core/utils/pt_postal.dart.
//
// Contrato (importante para quem consome isto no wizard de reserva):
// - Match encontrado  -> lookupPostalParts() devolve { city, district } preenchidos.
// - Sem match          -> devolve `null`. Isto NUNCA deve bloquear o avanço no
//   wizard: a ausência de entrada na tabela só significa que ainda não
//   mapeámos aquele prefixo, não que o código postal seja inválido. O
//   formulário consumidor deve, nesse caso, permitir o preenchimento manual
//   de cidade/distrito em vez de impedir a continuação.
//
// Nota: só se faz match pelo prefixo EXATO de 4 dígitos presente na tabela.
// Uma versão anterior tentava "prefixos mais curtos" (ex: só o 1º dígito)
// como fallback, o que produzia matches incorretos entre distritos vizinhos
// (ex: um código de Leiria "24xx" a ser devolvido como Coimbra "3xxx" só
// porque partilhava o dígito inicial mais próximo na tabela). Preferimos
// nenhum match a um match errado.
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
  '2300': 'Tomar, Santarém',
  '2350': 'Torres Novas, Santarém',
  '2400': 'Leiria, Leiria',
  '2410': 'Leiria, Leiria',
  '2415': 'Leiria, Leiria',
  '2420': 'Leiria, Leiria',
  '2430': 'Marinha Grande, Leiria',
  '2440': 'Batalha, Leiria',
  '2450': 'Alcobaça, Leiria',
  '2460': 'Alcobaça, Leiria',
  '2470': 'Porto de Mós, Leiria',
  '2480': 'Alvaiázere, Leiria',
  '2495': 'Fátima, Santarém',
  '2500': 'Caldas da Rainha, Leiria',
  '2520': 'Peniche, Leiria',
  '2530': 'Lourinhã, Lisboa',
  '2560': 'Torres Vedras, Lisboa',
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
  '3030': 'Coimbra, Coimbra',
  '3080': 'Figueira da Foz, Coimbra',
  '3100': 'Pombal, Leiria',
  '3130': 'Soure, Coimbra',
  '3300': 'Arganil, Coimbra',
  '3400': 'Oliveira do Hospital, Coimbra',
  '3500': 'Viseu, Viseu',
  '3510': 'Viseu, Viseu',
  '3600': 'Vila Nova de Paiva, Viseu',
  '3630': 'Castro Daire, Viseu',
  '3660': 'São Pedro do Sul, Viseu',
  '3700': 'São João da Madeira, Aveiro',
  '3720': 'Oliveira de Azeméis, Aveiro',
  '3750': 'Águeda, Aveiro',
  '3780': 'Anadia, Aveiro',
  '3800': 'Aveiro, Aveiro',
  '3810': 'Aveiro, Aveiro',
  '3830': 'Ílhavo, Aveiro',
  '3850': 'Albergaria-a-Velha, Aveiro',
  '3860': 'Estarreja, Aveiro',
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
  '4900': 'Viana do Castelo, Viana do Castelo',
  '4910': 'Caminha, Viana do Castelo',
  '4920': 'Vila Nova de Cerveira, Viana do Castelo',
  '4950': 'Monção, Viana do Castelo',
  '4960': 'Melgaço, Viana do Castelo',
  '4970': 'Arcos de Valdevez, Viana do Castelo',
  '4990': 'Ponte de Lima, Viana do Castelo',
  '5000': 'Vila Real, Vila Real',
  '5300': 'Bragança, Bragança',
  '6000': 'Castelo Branco, Castelo Branco',
  '6300': 'Guarda, Guarda',
  '7000': 'Évora, Évora',
  '7100': 'Estremoz, Évora',
  '7200': 'Reguengos de Monsaraz, Évora',
  '7300': 'Portalegre, Portalegre',
  '7350': 'Elvas, Portalegre',
  '7400': 'Ponte de Sor, Portalegre',
  '7500': 'Santiago do Cacém, Setúbal',
  '7540': 'Sines, Setúbal',
  '7600': 'Odemira, Beja',
  '7700': 'Almodôvar, Beja',
  '7800': 'Beja, Beja',
  '7830': 'Serpa, Beja',
  '7860': 'Moura, Beja',
  '7900': 'Ferreira do Alentejo, Beja',
  '8000': 'Faro, Faro',
  '8100': 'Loulé, Faro',
  '8125': 'Quarteira, Faro',
  '8150': 'São Brás de Alportel, Faro',
  '8200': 'Albufeira, Faro',
  '8300': 'Silves, Faro',
  '8365': 'Armação de Pêra, Faro',
  '8400': 'Lagoa, Faro',
  '8500': 'Portimão, Faro',
  '8550': 'Monchique, Faro',
  '8600': 'Lagos, Faro',
  '8650': 'Vila do Bispo, Faro',
  '8700': 'Olhão, Faro',
  '8800': 'Tavira, Faro',
  '8900': 'Vila Real de Santo António, Faro',
  '9000': 'Funchal, Madeira',
  '9500': 'Ponta Delgada, Açores',
}

/** Devolve "Cidade, Distrito" para um código postal (match exato de 4 dígitos), ou null se não reconhecido. */
export function lookupPostalDisplay(raw: string): string | null {
  const clean = raw.replace(/-/g, '').replace(/\s/g, '')
  if (clean.length < 4) return null
  const prefix = clean.slice(0, 4)
  return PT_POSTAL_PREFIXES[prefix] ?? null
}

/**
 * Devolve cidade/distrito separados para um código postal, ou `null` se o
 * prefixo não estiver na tabela. `null` NÃO significa código postal
 * inválido — o formulário consumidor deve tratar isto como "não
 * reconhecido, por favor preencha manualmente" e continuar a permitir o
 * avanço no wizard assim que o utilizador preencher cidade/distrito à mão.
 */
export function lookupPostalParts(raw: string): { city: string; district: string } | null {
  const display = lookupPostalDisplay(raw)
  if (!display) return null
  const parts = display.split(',').map((s) => s.trim())
  const city = parts[0] ?? ''
  const district = parts[1] ?? city
  return { city, district }
}
