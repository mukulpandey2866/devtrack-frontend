import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AppLayout'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { useAction } from '../../hooks/useAction'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import {
  hasErrors,
  validateEmail,
  validateFullName,
  validateNewPassword,
  type FieldErrors,
} from '../../lib/validation'
import { PasswordField } from './PasswordField'
import { useAuth } from './useAuth'

type Field = 'fullName' | 'email' | 'password' | 'confirmPassword'

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<Field>>({})
  const { run, pending, error, reset } = useAction(register)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: FieldErrors<Field> = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirmPassword: !confirmPassword
        ? 'Confirm your password.'
        : confirmPassword !== password
          ? 'Passwords do not match.'
          : undefined,
    }
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    // confirmPassword is frontend-only and is never sent to the API.
    const result = await run({ fullName: fullName.trim(), email: email.trim(), password })
    if (result?.ok) navigate('/login', { replace: true, state: { registered: true } })
  }

  const serverEmailError = error?.kind === 'conflict' ? error.message : error?.fieldErrors.email
  const showBanner = error && !(error.kind === 'conflict' || Object.keys(error.fieldErrors).length > 0)

  return (
    <AuthLayout>
      <div className="auth-card__heading">
        <h1>Create your account</h1>
        <p>Start tracking projects and issues in minutes.</p>
      </div>
      {showBanner && <Alert tone="error">{error.message}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value)
            reset()
          }}
          error={errors.fullName ?? error?.fieldErrors.fullName}
          required
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            reset()
          }}
          error={errors.email ?? serverEmailError}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            reset()
          }}
          hint="At least 8 characters."
          error={errors.password ?? error?.fieldErrors.password}
          required
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          required
        />
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="auth-card__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
