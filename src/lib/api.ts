import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { FieldViolation } from '../types/api'

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'canceled'
  | 'config'
  | 'unknown'

interface ApiErrorInit {
  kind: ApiErrorKind
  status: number | null
  fieldErrors?: Record<string, string>
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  /** Backend validation messages keyed by the request field name. */
  readonly fieldErrors: Record<string, string>

  constructor(message: string, init: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.fieldErrors = init.fieldErrors ?? {}
  }
}

const REQUEST_TIMEOUT_MS = 60_000 // Render free instances can take ~50s to wake up.

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || undefined

let accessToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

/** The token lives only in module memory; it is never written to browser storage. */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Called when the backend rejects a request that carried a token (expired or invalid session). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export const api = axios.create({
  baseURL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // Repeated keys (status=A&status=B) are what Spring binds to List parameters.
  paramsSerializer: { indexes: null },
})

api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    return Promise.reject(
      new ApiError('The API base URL is not configured. Set VITE_API_BASE_URL and restart the dev server.', {
        kind: 'config',
        status: null,
      }),
    )
  }
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const hadToken = error instanceof AxiosError && Boolean(error.config?.headers?.has('Authorization'))
    if (apiError.kind === 'unauthorized' && hadToken) {
      unauthorizedHandler?.()
    }
    return Promise.reject(apiError)
  },
)

interface ProblemBody {
  detail?: unknown
  title?: unknown
  errors?: unknown
}

function parseViolations(errors: unknown): FieldViolation[] {
  if (!Array.isArray(errors)) return []
  return errors.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { field, message } = item as Partial<Record<keyof FieldViolation, unknown>>
    return typeof field === 'string' && typeof message === 'string' ? [{ field, message }] : []
  })
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status >= 500) return 'server'
  return 'unknown'
}

/** Converts any thrown value into an ApiError with a user-presentable message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isCancel(error)) {
    return new ApiError('The request was canceled.', { kind: 'canceled', status: null })
  }

  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(
        'The server took too long to respond. It may be starting up - please try again in a moment.',
        { kind: 'timeout', status: null },
      )
    }

    const response = error.response
    if (!response) {
      return new ApiError(
        'Unable to reach the server. Check your connection and that the backend allows this origin (CORS); the service may also be starting up.',
        { kind: 'network', status: null },
      )
    }

    const status = response.status
    const kind = kindForStatus(status)
    const body = (typeof response.data === 'object' && response.data !== null ? response.data : {}) as ProblemBody
    const violations = parseViolations(body.errors)
    const fieldErrors: Record<string, string> = {}
    for (const { field, message } of violations) {
      const key = field.split('.').pop() ?? field
      fieldErrors[key] ??= message
    }

    let message: string
    if (violations.length > 0) {
      message = violations.map((v) => `${v.field.split('.').pop()}: ${v.message}`).join('; ')
    } else if (typeof body.detail === 'string' && body.detail) {
      message = body.detail
    } else if (status === 502 || status === 503 || status === 504) {
      message = 'The server is temporarily unavailable (it may be starting up). Please retry.'
    } else {
      message = `Request failed with status ${status}.`
    }
    return new ApiError(message, { kind, status, fieldErrors })
  }

  return new ApiError('An unexpected error occurred.', { kind: 'unknown', status: null })
}

export function isCanceledError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof ApiError && error.kind === 'canceled')
}

type Params = AxiosRequestConfig['params']

/** Thin typed helpers so feature services never touch Axios directly. */
export const http = {
  async get<T>(url: string, options: { params?: Params; signal?: AbortSignal } = {}): Promise<T> {
    return (await api.get<T>(url, options)).data
  },
  async post<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return (await api.post<T>(url, body, { signal })).data
  },
  async put<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return (await api.put<T>(url, body, { signal })).data
  },
  async patch<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return (await api.patch<T>(url, body, { signal })).data
  },
  async delete(url: string, signal?: AbortSignal): Promise<void> {
    await api.delete(url, { signal })
  },
}
