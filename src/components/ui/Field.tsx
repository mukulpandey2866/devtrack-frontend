import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldShellProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

function FieldShell({ id, label, error, hint, required, children }: FieldShellProps) {
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

interface CommonFieldProps {
  label: string
  error?: string
  hint?: string
}

export function TextField({
  label,
  error,
  hint,
  required,
  className,
  suffix,
  ...rest
}: CommonFieldProps & InputHTMLAttributes<HTMLInputElement> & { suffix?: ReactNode }) {
  const id = useId()
  const input = (
    <input
      {...rest}
      id={id}
      required={required}
      className={['input', className].filter(Boolean).join(' ')}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
    />
  )
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      {suffix ? (
        <div className="input-group">
          {input}
          {suffix}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className,
  ...rest
}: CommonFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        {...rest}
        id={id}
        required={required}
        className={['input textarea', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  error,
  hint,
  required,
  className,
  children,
  ...rest
}: CommonFieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <select
        {...rest}
        id={id}
        required={required}
        className={['input select', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      >
        {children}
      </select>
    </FieldShell>
  )
}
