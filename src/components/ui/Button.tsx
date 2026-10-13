import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export function ButtonLink({
  variant = 'secondary',
  className,
  ...rest
}: LinkProps & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <Link {...rest} className={['btn', `btn--${variant}`, className].filter(Boolean).join(' ')} />
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : '', className].filter(Boolean).join(' ')
  return (
    <button {...rest} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <LoaderCircle className="icon spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  children,
  className,
  type = 'button',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string }) {
  return (
    <button {...rest} type={type} className={['icon-btn', className].filter(Boolean).join(' ')} aria-label={label} title={label}>
      {children}
    </button>
  )
}
