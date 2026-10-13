import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, toApiError } from '../lib/api'

export type ActionResult<R> = { ok: true; value: R } | { ok: false; error: ApiError }

/**
 * Wraps a mutation: ignores re-entrant calls while one is pending (no duplicate submissions) and
 * exposes the pending flag and last error. Success is only reported after the API resolves.
 */
export function useAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const actionRef = useRef(action)
  const pendingRef = useRef(false)
  const mountedRef = useRef(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    actionRef.current = action
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async (...args: A): Promise<ActionResult<R> | undefined> => {
    if (pendingRef.current) return undefined
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      const value = await actionRef.current(...args)
      return { ok: true, value }
    } catch (caught) {
      const apiError = toApiError(caught)
      if (mountedRef.current) setError(apiError)
      return { ok: false, error: apiError }
    } finally {
      pendingRef.current = false
      if (mountedRef.current) setPending(false)
    }
  }, [])

  const reset = useCallback(() => setError(null), [])

  return { run, pending, error, reset }
}
