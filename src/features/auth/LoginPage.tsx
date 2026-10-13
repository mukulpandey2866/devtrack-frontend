import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AppLayout'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { useAction } from '../../hooks/useAction'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { ApiError } from '../../lib/api'
import { hasErrors, validateEmail, validateLoginPassword, type FieldErrors } from '../../lib/validation'
import { PasswordField } from './PasswordField'
import { useAuth } from './useAuth'

interface LocationState {
  from?: string
  registered?: boolean
}

const BACKEND_STATUS_URL = 'https://devtrack-backend-qm3r.onrender.com'

// Render stops idle backends; the first request wakes it, which can take around 2 minutes.
const isColdStartError = (error: ApiError) =>
  error.kind === 'timeout' || error.kind === 'network' || error.status === 502 || error.status === 503 || error.status === 504

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { login, sessionExpired, dismissSessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({})
  const { run, pending, error, reset } = useAction(login)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = { email: validateEmail(email), password: validateLoginPassword(password) }
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    dismissSessionExpired()
    const result = await run({ email: email.trim(), password })
    if (result?.ok) navigate(state.from ?? '/dashboard', { replace: true })
  }

  return (
    <AuthLayout notice={sessionExpired ? 'Your session has expired. Please sign in again.' : undefined}>
      <div className="auth-card__heading">
        <h1>Sign in</h1>
        <p>Welcome back. Enter your details to continue.</p>
      </div>
      {state.registered && !error && <Alert tone="success">Account created. Sign in to get started.</Alert>}
      {error && isColdStartError(error) ? (
        <Alert tone="warning" title="The server may be waking up">
          DevTrack&apos;s backend is shut down when idle. The first request starts it, which can take around 2 minutes, so sign-in
          may time out meanwhile. Check the backend status at{' '}
          <a href={BACKEND_STATUS_URL} target="_blank" rel="noopener noreferrer">
            {BACKEND_STATUS_URL}
          </a>{' '}
          and try again once it responds.
        </Alert>
      ) : (
        error && <Alert tone="error">{error.fieldErrors.email || error.fieldErrors.password ? 'Please check your details.' : error.message}</Alert>
      )}
      <form className="form" onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Test@test.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            reset()
          }}
          error={errors.email ?? error?.fieldErrors.email}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Test1234"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            reset()
          }}
          error={errors.password ?? error?.fieldErrors.password}
          required
        />
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <p className="auth-card__footer">
        New to DevTrack? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
