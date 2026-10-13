import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setAccessToken, setUnauthorizedHandler } from '../../lib/api'
import type { LoginRequest, RegisterRequest, UserResponse } from '../../types/api'
import { AuthContext, type AuthContextValue } from './auth-context'
import { authService } from './authService'

/**
 * Session lifecycle: the backend issues a short-lived bearer token with no refresh endpoint. The token is
 * kept in memory only (see lib/api.ts), so a page reload or token expiry ends the session and the user
 * signs in again.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const expiryTimer = useRef<number | undefined>(undefined)

  const clearSession = useCallback(() => {
    window.clearTimeout(expiryTimer.current)
    setAccessToken(null)
    setUser(null)
  }, [])

  const expireSession = useCallback(() => {
    clearSession()
    setSessionExpired(true)
  }, [clearSession])

  useEffect(() => {
    setUnauthorizedHandler(expireSession)
    return () => setUnauthorizedHandler(null)
  }, [expireSession])

  useEffect(() => () => window.clearTimeout(expiryTimer.current), [])

  const login = useCallback(
    async (request: LoginRequest) => {
      const response = await authService.login(request)
      setAccessToken(response.accessToken)
      setUser(response.user)
      setSessionExpired(false)
      window.clearTimeout(expiryTimer.current)
      expiryTimer.current = window.setTimeout(expireSession, Math.max(response.expiresIn, 1) * 1000)
    },
    [expireSession],
  )

  const register = useCallback((request: RegisterRequest) => authService.register(request), [])

  const logout = useCallback(() => {
    clearSession()
    setSessionExpired(false)
  }, [clearSession])

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      sessionExpired,
      login,
      register,
      logout,
      dismissSessionExpired,
    }),
    [user, sessionExpired, login, register, logout, dismissSessionExpired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
