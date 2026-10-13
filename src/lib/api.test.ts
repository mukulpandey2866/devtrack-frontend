import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, setAccessToken, setUnauthorizedHandler, toApiError } from './api'

function axiosError(status: number | null, data?: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const response =
    status === null ? undefined : { status, statusText: '', headers: {}, config, data }
  return new AxiosError('failed', code, config, null, response)
}

describe('toApiError', () => {
  it('uses the problem detail for non-validation errors', () => {
    const error = toApiError(axiosError(409, { detail: 'An account with this email already exists' }))
    expect(error.kind).toBe('conflict')
    expect(error.status).toBe(409)
    expect(error.message).toBe('An account with this email already exists')
  })

  it('maps validation violations to field errors', () => {
    const error = toApiError(
      axiosError(400, {
        detail: 'Request validation failed',
        errors: [
          { field: 'projectKey', message: 'must be 2-10 letters or digits' },
          { field: 'name', message: 'must not be blank' },
        ],
      }),
    )
    expect(error.kind).toBe('validation')
    expect(error.fieldErrors).toEqual({ projectKey: 'must be 2-10 letters or digits', name: 'must not be blank' })
    expect(error.message).toContain('projectKey: must be 2-10 letters or digits')
  })

  it('reports network failures and timeouts distinctly', () => {
    expect(toApiError(axiosError(null, undefined, 'ERR_NETWORK')).kind).toBe('network')
    expect(toApiError(axiosError(null, undefined, 'ECONNABORTED')).kind).toBe('timeout')
  })

  it('explains gateway errors from a sleeping service', () => {
    const error = toApiError(axiosError(503, '<html>'))
    expect(error.kind).toBe('server')
    expect(error.message).toMatch(/starting up/i)
  })

  it('passes ApiError instances through and wraps unknown values', () => {
    const original = new ApiError('x', { kind: 'forbidden', status: 403 })
    expect(toApiError(original)).toBe(original)
    expect(toApiError('boom').kind).toBe('unknown')
  })
})

describe('api instance', () => {
  afterEach(() => {
    setAccessToken(null)
    setUnauthorizedHandler(null)
  })

  it('serializes list params as repeated keys', () => {
    const uri = api.getUri({ url: '/api/projects/1/issues', params: { status: ['TODO', 'DONE'], q: 'bug' } })
    expect(uri.endsWith('/api/projects/1/issues?status=TODO&status=DONE&q=bug')).toBe(true)
  })

  it('sends the bearer token and omits it when signed out', async () => {
    const seen: (string | undefined)[] = []
    const adapter: AxiosAdapter = async (config) => {
      seen.push(config.headers.get('Authorization') as string | undefined)
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    // baseURL is read from env at import time; give the request a absolute URL for this test.
    const options = { adapter, baseURL: 'https://example.test' }
    setAccessToken('abc')
    await api.get('/x', options)
    setAccessToken(null)
    await api.get('/x', options)
    expect(seen).toEqual(['Bearer abc', undefined])
  })

  it('invokes the unauthorized handler only when a token was sent', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    const adapter: AxiosAdapter = async (config) => {
      throw new AxiosError('401', undefined, config, null, {
        status: 401,
        statusText: '',
        headers: {},
        config,
        data: {},
      })
    }
    const options = { adapter, baseURL: 'https://example.test' }

    await expect(api.get('/x', options)).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(handler).not.toHaveBeenCalled()

    setAccessToken('expired')
    await expect(api.get('/x', options)).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
