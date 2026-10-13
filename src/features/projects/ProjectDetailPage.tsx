import { Archive, ArchiveRestore, ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { Alert } from '../../components/ui/Alert'
import { ProjectStatusBadge, RoleBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDateTime } from '../../lib/format'
import { projectPermissions } from '../../lib/permissions'
import { LabelsPanel } from '../labels/LabelsPanel'
import { ProjectIssues } from '../issues/ProjectIssues'
import { MembersPanel } from './MembersPanel'
import { ProjectFormDialog } from './ProjectFormDialog'
import { projectsService } from './projectsService'

const TABS = [
  { id: 'issues', label: 'Issues' },
  { id: 'members', label: 'Members' },
  { id: 'labels', label: 'Labels' },
  { id: 'about', label: 'About' },
] as const

type TabId = (typeof TABS)[number]['id']

function ProjectDetail({ projectId }: { projectId: string }) {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const tab: TabId = TABS.some((t) => t.id === requestedTab) ? (requestedTab as TabId) : 'issues'
  const { data: project, error, initialLoading, reload, mutate } = useAsync((signal) => projectsService.get(projectId, signal), [projectId])
  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useDocumentTitle(project?.name ?? 'Project')

  if (initialLoading) {
    return (
      <div className="stack" role="status" aria-busy="true">
        <span className="sr-only">Loading project</span>
        <Skeleton width="40%" height={28} />
        <Skeleton width="25%" height={16} />
        <Skeleton height={240} />
      </div>
    )
  }
  if (error && !project) {
    const notFound = error.kind === 'not_found'
    return (
      <ErrorState
        error={error}
        onRetry={notFound ? undefined : reload}
        title={notFound ? 'Project not found' : 'Could not load project'}
      />
    )
  }
  if (!project) return null

  const permissions = projectPermissions(project)

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/projects" className="back-link">
            <ArrowLeft className="icon" aria-hidden="true" />
            All projects
          </Link>
        }
        title={project.name}
        meta={
          <span className="page-header__badges">
            <code className="key">{project.projectKey}</code>
            <ProjectStatusBadge status={project.status} />
            {project.currentUserRole && <RoleBadge role={project.currentUserRole} />}
          </span>
        }
        description={project.description ?? undefined}
        actions={
          <>
            {permissions.canEditProject || permissions.isOwner ? (
              <Button icon={<Pencil className="icon" aria-hidden="true" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : null}
            {permissions.canArchive && (
              <Button variant="danger" icon={<Archive className="icon" aria-hidden="true" />} onClick={() => setArchiving(true)}>
                Archive
              </Button>
            )}
            {permissions.canRestore && (
              <Button icon={<ArchiveRestore className="icon" aria-hidden="true" />} onClick={() => setRestoring(true)}>
                Restore
              </Button>
            )}
          </>
        }
      />

      {project.status === 'ARCHIVED' && (
        <Alert tone="warning" title="This project is archived">
          It is read-only until an owner restores it.
        </Alert>
      )}

      <div className="tabs" role="tablist" aria-label="Project sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`tabs__tab${tab === t.id ? ' tabs__tab--active' : ''}`}
            onClick={() => setParams(t.id === 'issues' ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel">
        {tab === 'issues' && <ProjectIssues project={project} />}
        {tab === 'members' && <MembersPanel project={project} />}
        {tab === 'labels' && <LabelsPanel project={project} />}
        {tab === 'about' && (
          <section className="card">
            <dl className="details">
              <div>
                <dt>Name</dt>
                <dd>{project.name}</dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd>{project.projectKey}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{project.description ?? 'No description'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(project.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateTime(project.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      {editing && (
        <ProjectFormDialog
          project={project}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            mutate(saved)
            toast.success('Project updated.')
            setEditing(false)
          }}
        />
      )}
      {archiving && (
        <ConfirmDialog
          title="Archive project"
          message={`Archive ${project.name}? It becomes read-only until an owner restores it.`}
          confirmLabel="Archive project"
          onClose={() => setArchiving(false)}
          onConfirm={async () => {
            await projectsService.archive(project.id)
            toast.success('Project archived.')
            reload()
          }}
        />
      )}
      {restoring && (
        <ConfirmDialog
          title="Restore project"
          message={`Restore ${project.name} to Active?`}
          confirmLabel="Restore project"
          tone="primary"
          onClose={() => setRestoring(false)}
          onConfirm={async () => {
            await projectsService.update(project.id, {
              name: project.name,
              description: project.description ?? undefined,
              status: 'ACTIVE',
            })
            toast.success('Project restored.')
            reload()
          }}
        />
      )}
    </>
  )
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  if (!projectId) return null
  return <ProjectDetail key={projectId} projectId={projectId} />
}
