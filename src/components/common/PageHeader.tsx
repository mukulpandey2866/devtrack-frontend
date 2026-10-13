import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  breadcrumb?: ReactNode
  meta?: ReactNode
}

export function PageHeader({ title, description, actions, breadcrumb, meta }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {breadcrumb && <div className="page-header__breadcrumb">{breadcrumb}</div>}
        <div className="page-header__title-row">
          <h1 className="page-header__title">{title}</h1>
          {meta}
        </div>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
