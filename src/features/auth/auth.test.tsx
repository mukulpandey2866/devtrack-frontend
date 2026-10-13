import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, setAccessToken } from '../../lib/api'
import { AuthProvider } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { authService } from './authService'

vi.mock('./authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}))

const login = vi.mocked(authService.login)
const register = vi.mocked(authService.register)

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('authentication pages', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => setAccessToken(null))

  it('shows validation messages and does not call the API for empty login', async () => {
    renderAt('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('toggles password visibility', async () => {
    renderAt('/login')
    const password = screen.getByLabelText(/^Password/)
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('shows the backend error when credentials are rejected', async () => {
    login.mockRejectedValue(new ApiError('Invalid email or password', { kind: 'unauthorized', status: 401 }))
    renderAt('/login')
    await userEvent.type(screen.getByLabelText(/^Email/), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('explains the backend cold start and links to its status when login times out', async () => {
    login.mockRejectedValue(new ApiError('The server took too long to respond.', { kind: 'timeout', status: null }))
    renderAt('/login')
    await userEvent.type(screen.getByLabelText(/^Email/), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('The server may be waking up')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://devtrack-backend-qm3r.onrender.com' })).toHaveAttribute(
      'href',
      'https://devtrack-backend-qm3r.onrender.com',
    )
  })

  it('navigates to the dashboard after a successful login', async () => {
    login.mockResolvedValue({
      accessToken: 't',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: '1', fullName: 'A B', email: 'a@b.co', platformRole: 'USER', createdAt: '2026-01-01T00:00:00Z' },
    })
    renderAt('/login')
    await userEvent.type(screen.getByLabelText(/^Email/), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('dashboard')).toBeInTheDocument()
  })

  it('validates matching passwords on register and never sends confirmPassword', async () => {
    register.mockResolvedValue({ id: '1', fullName: 'A B', email: 'a@b.co', platformRole: 'USER', createdAt: '' })
    renderAt('/register')
    await userEvent.type(screen.getByLabelText(/^Full name/), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText(/^Email/), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(/^Password/), 'password-1')
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'different')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText(/^Confirm password/))
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1))
    expect(register).toHaveBeenCalledWith({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'password-1' })
  })
})
