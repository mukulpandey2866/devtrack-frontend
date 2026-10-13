import { http } from '../../lib/api'
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '../../types/api'

export const authService = {
  login: (request: LoginRequest, signal?: AbortSignal) => http.post<AuthResponse>('/api/auth/login', request, signal),
  register: (request: RegisterRequest, signal?: AbortSignal) =>
    http.post<UserResponse>('/api/auth/register', request, signal),
  me: (signal?: AbortSignal) => http.get<UserResponse>('/api/auth/me', { signal }),
}
