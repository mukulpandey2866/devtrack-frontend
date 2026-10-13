import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './auth-context'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

/** For components that only render inside protected routes, where a user is guaranteed. */
export function useCurrentUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser requires an authenticated user')
  return user
}
