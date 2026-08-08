import toast from 'react-hot-toast'

/**
 * Executa uma chamada assíncrona (tipicamente à API) protegendo o chamador de
 * falhas de rede silenciosas.
 *
 * Sem isto, um `try {} catch {}` vazio (ou a ausência total de `.catch()`)
 * resulta em dois problemas comuns nesta app:
 *   1. O `loading` fica preso a `true` para sempre (spinner eterno), porque o
 *      `setLoading(false)` nunca é alcançado.
 *   2. Quando o `finally` existe mas o erro não, o ecrã cai num estado
 *      "sem dados" (ex: "Ainda não tem pedidos") que é enganoso — o
 *      utilizador não percebe que houve uma falha de rede real.
 *
 * `safeFetch` garante sempre um `toast.error` visível em caso de falha e
 * devolve `null` em vez de propagar a exceção, para que o chamador possa
 * simplesmente fazer `if (data) setState(data)` e, no `finally`, chamar
 * `setLoading(false)`.
 *
 * Uso típico:
 *   setLoading(true)
 *   const data = await safeFetch(() => minhaApi.get(id))
 *   if (data) setEstado(data)
 *   setLoading(false)
 */
export async function safeFetch<T>(
  fn: () => Promise<T>,
  opts?: { onError?: (err: any) => void; message?: string },
): Promise<T | null> {
  try {
    return await fn()
  } catch (err: any) {
    toast.error(err?.message ?? opts?.message ?? 'Erro ao carregar dados')
    opts?.onError?.(err)
    return null
  }
}
