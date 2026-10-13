import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

interface AlertProps {
  tone?: 'error' | 'success' | 'info' | 'warning'
  title?: string
  children: ReactNode
  action?: ReactNode
}

const ICONS = { error: CircleAlert, success: CircleCheck, info: Info, warning: TriangleAlert }

export function Alert({ tone = 'info', title, children, action }: AlertProps) {
  const Icon = ICONS[tone]
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="icon alert__icon" aria-hidden="true" />
      <div className="alert__body">
        {title && <strong className="alert__title">{title}</strong>}
        <div>{children}</div>
      </div>
      {action && <div className="alert__action">{action}</div>}
    </div>
  )
}
