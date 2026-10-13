import { ButtonLink } from '../components/ui/Button'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../features/auth/useAuth'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { isAuthenticated } = useAuth()
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1>Page not found</h1>
      <p className="table__muted">The page you are looking for does not exist or has moved.</p>
      <ButtonLink variant="primary" to={isAuthenticated ? '/dashboard' : '/login'}>
        {isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}
      </ButtonLink>
    </div>
  )
}
