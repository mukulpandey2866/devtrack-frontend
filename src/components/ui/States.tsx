import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApiError } from '../../lib/api'
import { Button } from './Button'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="state">
      <span className="state__icon">
        <Inbox className="icon icon--lg" aria-hidden="true" />
      </span>
      <h3 className="state__title">{title}</h3>
      {description && <p className="state__text">{description}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: { error: ApiError | Error; onRetry?: () => void; title?: string }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon state__icon--error">
        <TriangleAlert className="icon icon--lg" aria-hidden="true" />
      </span>
      <h3 className="state__title">{title}</h3>
      <p className="state__text">{error.message}</p>
      {onRetry && (
        <div className="state__action">
          <Button onClick={onRetry} icon={<RefreshCw className="icon" aria-hidden="true" />}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
