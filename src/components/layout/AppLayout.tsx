import { CircleUser, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../ui/Alert'
import { Avatar } from '../ui/Avatar'
import { Dropdown } from '../ui/Dropdown'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { useAuth } from '../../features/auth/useAuth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/issues', label: 'Issues', icon: ListChecks },
  { to: '/profile', label: 'Profile', icon: CircleUser },
]

export function Brand() {
  return (
    <span className="brand">
      <span className="brand__mark" aria-hidden="true">
        <ListChecks className="icon" />
      </span>
      <span className="brand__name">DevTrack</span>
    </span>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside id="app-sidebar" className={`sidebar${navOpen ? ' sidebar--open' : ''}`} aria-label="Primary">
        <div className="sidebar__top">
          <Brand />
          <button type="button" className="icon-btn icon-btn--inverse sidebar__close" aria-label="Close navigation" onClick={() => setNavOpen(false)}>
            <X className="icon" aria-hidden="true" />
          </button>
        </div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} onClick={() => setNavOpen(false)}>
              <Icon className="icon" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="sidebar__user">
            <Avatar name={user.fullName} />
            <div className="sidebar__user-text">
              <span className="sidebar__user-name">{user.fullName}</span>
              <span className="sidebar__user-email">{user.email}</span>
            </div>
          </div>
        )}
      </aside>
      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar__menu"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            aria-controls="app-sidebar"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="icon" aria-hidden="true" />
          </button>
          <div className="topbar__brand">
            <Brand />
          </div>
          <div className="topbar__spacer" />
          {user && (
            <Dropdown
              label={`Account menu for ${user.fullName}`}
              triggerClassName="account-trigger"
              trigger={
                <>
                  <Avatar name={user.fullName} size="sm" />
                  <span className="account-trigger__name">{user.fullName}</span>
                </>
              }
              items={[
                { label: 'Profile', icon: <CircleUser className="icon" aria-hidden="true" />, onSelect: () => navigate('/profile') },
                { label: 'Sign out', icon: <LogOut className="icon" aria-hidden="true" />, onSelect: signOut },
              ]}
            />
          )}
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export function AuthLayout({ children, notice }: { children: ReactNode; notice?: string }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        {notice && <Alert tone="warning">{notice}</Alert>}
        {children}
      </div>
    </div>
  )
}
