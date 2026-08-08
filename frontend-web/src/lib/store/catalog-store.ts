import { create } from 'zustand'
import { SERVICE_CATEGORIES, mergeServicePrices, type ServiceCategory } from '@/lib/data/services-catalog'
import { servicePricesApi } from '@/lib/api/service-prices'

interface CatalogState {
  categories: ServiceCategory[]
  pricesLoaded: boolean
  loadPrices: () => Promise<void>
}

/**
 * Catálogo de serviços com os preços atuais (edições do admin sobrepostas
 * aos valores por omissão). Começa com os valores por omissão do catálogo
 * em código e atualiza-se assim que os preços chegam da API — todos os
 * componentes que leem `categories` daqui re-renderizam automaticamente.
 */
export const useCatalogStore = create<CatalogState>()((set, get) => ({
  categories: SERVICE_CATEGORIES,
  pricesLoaded: false,

  loadPrices: async () => {
    if (get().pricesLoaded) return
    try {
      const prices = await servicePricesApi.get()
      set({ categories: mergeServicePrices(prices), pricesLoaded: true })
    } catch (err) {
      // Sem backend/erro de rede — mantém os valores por omissão, mas NÃO
      // marca `pricesLoaded: true`. Se marcássemos, a sessão inteira ficava
      // presa aos preços por omissão porque `loadPrices()` faz early-return
      // quando `pricesLoaded` já é `true`. Ao deixá-lo `false`, a próxima
      // chamada (ex: navegação para outra página que também chama
      // `loadPrices()`) tenta novamente buscar os preços reais.
      console.error('[catalog-store] falha ao carregar preços, a tentar novamente na próxima chamada:', err)
    }
  },
}))
