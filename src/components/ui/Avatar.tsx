import { initials } from '../../lib/format'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function UserChip({ name, email }: { name: string; email?: string }) {
  return (
    <span className="user-chip" title={email}>
      <Avatar name={name} size="sm" />
      <span className="user-chip__name">{name}</span>
    </span>
  )
}
