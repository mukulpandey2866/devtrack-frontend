import { createContext } from 'react'
import type { LoginRequest, RegisterRequest, UserResponse } from '../../types/api'

export interface AuthContextValue {
  user: UserResponse | null
  isAuthenticated: boolean
  /** Set when the session ended because the token expired or the backend rejected it. */
  sessionExpired: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<UserResponse>
  logout: () => void
  dismissSessionExpired: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
