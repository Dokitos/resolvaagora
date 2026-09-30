import type { ServiceCategory, ServiceSubcategory } from './services-catalog'

/** Sem acentos e em minúsculas: "Máquina" e "maquina" dão o mesmo resultado. */
export function foldText(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export interface CatalogHit {
  category: ServiceCategory
  sub: ServiceSubcategory
  score: number
}

/**
 * Pesquisa nos serviços, pelas mesmas regras da app (search_page.dart): pesa
 * mais o nome do serviço, depois os itens, depois a categoria, e todas as
 * palavras têm de aparecer algures — "fuga cozinha" não devolve tudo o que
 * tenha só "cozinha".
 */
export function searchCatalog(categories: ServiceCategory[], raw: string): CatalogHit[] {
  const terms = foldText(raw)
    .split(/\s+/)
    .filter((t) => t.length >= 2)
  if (!terms.length) return []

  const hits: CatalogHit[] = []
  for (const category of categories.filter((c) => !c.hidden)) {
    const catText = foldText(`${category.name} ${category.description}`)
    for (const sub of category.subcategories) {
      const subText = foldText(`${sub.name} ${sub.description}`)
      const itemTexts = sub.items.filter((i) => !i.hidden).map((i) => foldText(i.name))

      let score = 0
      for (const t of terms) {
        let found = false
        if (subText.includes(t)) {
          score += 3
          found = true
        }
        for (const it of itemTexts) {
          if (it.includes(t)) {
            score += 2
            found = true
          }
        }
        if (catText.includes(t)) {
          score += 1
          found = true
        }
        if (!found) {
          score = 0
          break
        }
      }
      if (score > 0) hits.push({ category, sub, score })
    }
  }
  return hits.sort((a, b) => b.score - a.score)
}
