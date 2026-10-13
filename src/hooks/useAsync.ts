import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { ApiError, isCanceledError, toApiError } from '../lib/api'

interface AsyncState<T> {
  status: 'loading' | 'success' | 'error'
  data: T | undefined
  error: ApiError | null
}

export interface AsyncResult<T> {
  data: T | undefined
  error: ApiError | null
  /** True while a request is in flight (including background reloads). */
  loading: boolean
  /** True only before the first successful response. */
  initialLoading: boolean
  reload: () => void
  /** Replaces the cached data with a confirmed server response (e.g. the body of a PUT). */
  mutate: (data: T) => void
}

/**
 * Runs `fetcher` whenever `deps` change or `reload()` is called. The in-flight request is aborted on
 * change/unmount, so a stale response can never overwrite newer state.
 */
export function useAsync<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: DependencyList): AsyncResult<T> {
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: undefined, error: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marking the request as started
    setState((previous) => (previous.status === 'loading' ? previous : { ...previous, status: 'loading', error: null }))
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: null })
      },
      (error: unknown) => {
        if (controller.signal.aborted || isCanceledError(error)) return
        setState((previous) => ({ status: 'error', data: previous.data, error: toApiError(error) }))
      },
    )
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are supplied by the caller
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const mutate = useCallback((data: T) => setState({ status: 'success', data, error: null }), [])

  return {
    data: state.data,
    error: state.error,
    loading: state.status === 'loading',
    initialLoading: state.status === 'loading' && state.data === undefined,
    reload,
    mutate,
  }
}
