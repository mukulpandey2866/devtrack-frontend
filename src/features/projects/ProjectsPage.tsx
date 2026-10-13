import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { ProjectStatusBadge, RoleBadge } from '../../components/ui/Badge'
import { SelectField, TextField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { PROJECT_STATUS_LABELS, formatRelativeTime } from '../../lib/format'
import { PROJECT_STATUSES, type ProjectStatus } from '../../types/api'
import { ProjectFormDialog } from './ProjectFormDialog'
import { projectsService } from './projectsService'

const PAGE_SIZE = 10

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'name,asc', label: 'Name (A-Z)' },
  { value: 'projectKey,asc', label: 'Key (A-Z)' },
]

export function ProjectsPage() {
  useDocumentTitle('Projects')
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [sort, setSort] = useState(SORT_OPTIONS[0].value)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)

  const { data, error, loading, initialLoading, reload } = useAsync(
    (signal) => projectsService.list({ page, size: PAGE_SIZE, sort, status: status || undefined }, signal),
    [page, sort, status],
  )

  // The API has no text search, so this only narrows the page already loaded.
  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!data || !term) return data?.content ?? []
    return data.content.filter((p) => p.name.toLowerCase().includes(term) || p.projectKey.toLowerCase().includes(term))
  }, [data, filter])

  return (
    <>
      <PageHeader
        title="Projects"
        description="Projects you own or have been invited to."
        actions={
          <Button variant="primary" icon={<Plus className="icon" aria-hidden="true" />} onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__search">
          <TextField
            label="Filter this page"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Name or key"
            suffix={<Search className="input-group__icon icon" aria-hidden="true" />}
          />
        </div>
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProjectStatus | '')
            setPage(0)
          }}
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Sort by"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value)
            setPage(0)
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      <section className="card card--flush" aria-busy={loading}>
        {initialLoading ? (
          <SkeletonRows rows={6} label="Loading projects" />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} title="Could not load projects" />
        ) : data && data.totalElements === 0 ? (
          <EmptyState
            title={status ? 'No projects with this status' : 'No projects yet'}
            description={status ? 'Try a different status filter.' : 'Create your first project to start tracking issues.'}
            action={
              !status && (
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Create project
                </Button>
              )
            }
          />
        ) : (
          <>
            {error && <ErrorState error={error} onRetry={reload} title="Could not refresh projects" />}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Key</th>
                    <th scope="col">Status</th>
                    <th scope="col">Your role</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Link className="table__link" to={`/projects/${project.id}`}>
                          {project.name}
                        </Link>
                        {project.description && <p className="table__sub">{project.description}</p>}
                      </td>
                      <td>
                        <code className="key">{project.projectKey}</code>
                      </td>
                      <td>
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td>{project.currentUserRole ? <RoleBadge role={project.currentUserRole} /> : '-'}</td>
                      <td className="table__muted">{formatRelativeTime(project.updatedAt)}</td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="table__empty">
                        No projects on this page match "{filter}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data && (
              <Pagination
                page={data.page}
                size={data.size}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                onPageChange={setPage}
                disabled={loading}
              />
            )}
          </>
        )}
      </section>

      {creating && (
        <ProjectFormDialog
          onClose={() => setCreating(false)}
          onSaved={(project) => {
            toast.success(`Project ${project.projectKey} created.`)
            setCreating(false)
            navigate(`/projects/${project.id}`)
          }}
        />
      )}
    </>
  )
}
