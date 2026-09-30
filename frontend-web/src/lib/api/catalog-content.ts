import { api } from './client'

/** Conteúdo de apresentação de uma categoria (`CAT`) ou serviço (`CAT:sub`). */
export interface CatalogContent {
  imageUrl: string | null
  badge: string | null
  includes: string[]
  excludes: string[]
  /** false = os textos são o rascunho por omissão do servidor. */
  customized: boolean
}

export type CatalogContentMap = Record<string, CatalogContent>

export interface CatalogContentPayload {
  imageUrl?: string | null
  badge?: string | null
  includes?: string[]
  excludes?: string[]
  resetText?: boolean
}

export const EMPTY_CONTENT: CatalogContent = {
  imageUrl: null,
  badge: null,
  includes: [],
  excludes: [],
  customized: false,
}

export function contentFor(map: CatalogContentMap | null | undefined, categoryId: string, subcategoryId?: string) {
  const key = subcategoryId ? `${categoryId}:${subcategoryId}` : categoryId
  return map?.[key] ?? EMPTY_CONTENT
}

export const catalogContentApi = {
  get: () => api.get<CatalogContentMap>('/service-content').then((r) => r.data),
  save: (categoryId: string, subcategoryId: string | null, payload: CatalogContentPayload) =>
    api
      .put(
        subcategoryId
          ? `/admin/service-content/${categoryId}/${subcategoryId}`
          : `/admin/service-content/${categoryId}`,
        payload,
      )
      .then((r) => r.data),
}
