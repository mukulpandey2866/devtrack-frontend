import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../lib/format'
import { useAuth, useCurrentUser } from './useAuth'

export function ProfilePage() {
  useDocumentTitle('Profile')
  const user = useCurrentUser()
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title="Profile" description="Your account details." />
      <div className="stack stack--narrow">
        <section className="card profile">
          <Avatar name={user.fullName} size="lg" />
          <div>
            <h2 className="profile__name">{user.fullName}</h2>
            <p className="table__muted">{user.email}</p>
          </div>
        </section>
        <section className="card">
          <dl className="details">
            <div className="details__row">
              <dt>Full name</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div className="details__row">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="details__row">
              <dt>Platform role</dt>
              <dd>
                <Badge tone={user.platformRole === 'ADMIN' ? 'purple' : 'neutral'}>{user.platformRole === 'ADMIN' ? 'Admin' : 'User'}</Badge>
              </dd>
            </div>
            <div className="details__row">
              <dt>Member since</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </section>
        <Alert tone="info">
          Sessions are short-lived and kept in memory only. Reloading the page or leaving the session idle past its expiry signs you out.
        </Alert>
        <div>
          <Button
            icon={<LogOut className="icon" aria-hidden="true" />}
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </>
  )
}
