import { FolderKanban, ListChecks, Plus, CircleCheck, UserCheck, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { Alert } from '../../components/ui/Alert'
import { PriorityBadge, ProjectStatusBadge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Loading'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { STATUS_COLORS, STATUS_LABELS, formatRelativeTime } from '../../lib/format'
import { projectPermissions } from '../../lib/permissions'
import { ISSUE_STATUSES, type IssueResponse, type IssueStatus, type ProjectResponse } from '../../types/api'
import { useCurrentUser } from '../auth/useAuth'
import { IssueFormDialog } from '../issues/IssueFormDialog'
import { issuesService } from '../issues/issuesService'
import { ProjectFormDialog } from '../projects/ProjectFormDialog'
import { projectsService } from '../projects/projectsService'

// Bounded fetch: no summary endpoint exists, so figures are derived from these capped pages.
const PROJECT_FETCH_SIZE = 100
const PROJECTS_SUMMARISED = 5
const ISSUES_PER_PROJECT = 100
const OPEN_STATUSES: readonly IssueStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW']

interface DashboardData {
  projects: ProjectResponse[]
  totalProjects: number
  summarised: ProjectResponse[]
  issues: IssueResponse[]
  failedProjects: number
  truncated: boolean
}

async function loadDashboard(signal: AbortSignal): Promise<DashboardData> {
  const page = await projectsService.list({ size: PROJECT_FETCH_SIZE, sort: 'updatedAt,desc' }, signal)
  const summarised = page.content.slice(0, PROJECTS_SUMMARISED)
  const results = await Promise.allSettled(
    summarised.map((project) =>
      issuesService.list(project.id, { size: ISSUES_PER_PROJECT, sort: 'updatedAt,desc' }, signal),
    ),
  )
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  if (results.length > 0 && results.every((r) => r.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason
  }
  const issues: IssueResponse[] = []
  let truncated = false
  let failedProjects = 0
  for (const result of results) {
    if (result.status === 'fulfilled') {
      issues.push(...result.value.content)
      if (result.value.totalElements > result.value.content.length) truncated = true
    } else {
      failedProjects += 1
    }
  }
  return { projects: page.content, totalProjects: page.totalElements, summarised, issues, failedProjects, truncated }
}

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="stat">
      <span className="stat__icon">
        <Icon className="icon" aria-hidden="true" />
      </span>
      <div>
        <p className="stat__label">{label}</p>
        <p className="stat__value">{value}</p>
        {hint && <p className="stat__hint">{hint}</p>}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="stack" role="status" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>
      <div className="stats">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={84} />
        ))}
      </div>
      <div className="dashboard-grid">
        <Skeleton height={260} />
        <Skeleton height={260} />
      </div>
    </div>
  )
}

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, initialLoading, reload } = useAsync(loadDashboard, [])
  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingIssue, setCreatingIssue] = useState(false)

  const stats = useMemo(() => {
    const issues = data?.issues ?? []
    const byStatus = Object.fromEntries(ISSUE_STATUSES.map((s) => [s, 0])) as Record<IssueStatus, number>
    for (const issue of issues) byStatus[issue.status] += 1
    const open = OPEN_STATUSES.reduce((sum, s) => sum + byStatus[s], 0)
    const assigned = issues.filter((i) => OPEN_STATUSES.includes(i.status) && i.assignees.some((a) => a.id === user.id)).length
    const recent = [...issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)
    return { byStatus, open, done: byStatus.DONE, assigned, recent, total: issues.length }
  }, [data, user.id])

  const firstName = user.fullName.split(' ')[0]
  const issueProjects = (data?.projects ?? []).filter((p) => projectPermissions(p).canCreateIssue)

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is what is happening across your projects."
        actions={
          <>
            <Button icon={<Plus className="icon" aria-hidden="true" />} onClick={() => setCreatingProject(true)}>
              New project
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="icon" aria-hidden="true" />}
              onClick={() => setCreatingIssue(true)}
              disabled={issueProjects.length === 0}
              title={issueProjects.length === 0 ? 'You need an active project where you are a member or higher' : undefined}
            >
              New issue
            </Button>
          </>
        }
      />

      {initialLoading ? (
        <DashboardSkeleton />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Could not load your dashboard" />
      ) : data && data.totalProjects === 0 ? (
        <section className="card">
          <EmptyState
            title="Create your first project"
            description="Projects organize issues and teammates. Create one to get started, or ask a teammate to add you to theirs."
            action={
              <Button variant="primary" onClick={() => setCreatingProject(true)}>
                Create project
              </Button>
            }
          />
        </section>
      ) : data ? (
        <div className="stack">
          {error && <ErrorState error={error} onRetry={reload} title="Could not refresh the dashboard" />}
          {data.failedProjects > 0 && (
            <Alert tone="warning" action={<Button size="sm" onClick={reload}>Retry</Button>}>
              Issues could not be loaded for {data.failedProjects} {data.failedProjects === 1 ? 'project' : 'projects'}, so the figures below are incomplete.
            </Alert>
          )}
          <div className="stats">
            <StatCard label="Projects" value={data.totalProjects} icon={FolderKanban} />
            <StatCard label="Assigned to me" value={stats.assigned} icon={UserCheck} hint="Open issues" />
            <StatCard label="Open issues" value={stats.open} icon={ListChecks} hint="To do, in progress, in review" />
            <StatCard label="Completed" value={stats.done} icon={CircleCheck} />
          </div>
          {(data.totalProjects > data.summarised.length || data.truncated) && (
            <p className="note">
              Issue figures cover your {data.summarised.length} most recently updated projects
              {data.truncated ? ` and up to ${ISSUES_PER_PROJECT} recently updated issues in each` : ''}.
            </p>
          )}

          <div className="dashboard-grid">
            <section className="card" aria-labelledby="recent-projects-heading">
              <div className="card__header">
                <h2 id="recent-projects-heading" className="card__title">
                  Recent projects
                </h2>
                <Link to="/projects" className="card__link">
                  View all
                </Link>
              </div>
              <ul className="list">
                {data.summarised.map((project) => (
                  <li key={project.id} className="list__item">
                    <Link to={`/projects/${project.id}`} className="list__main">
                      <span className="list__title">{project.name}</span>
                      <span className="table__muted">
                        <code className="key">{project.projectKey}</code> - updated {formatRelativeTime(project.updatedAt)}
                      </span>
                    </Link>
                    <ProjectStatusBadge status={project.status} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="card" aria-labelledby="status-heading">
              <h2 id="status-heading" className="card__title">
                Issues by status
              </h2>
              {stats.total === 0 ? (
                <EmptyState title="No issues yet" description="Issues you create will be summarised here." />
              ) : (
                <ul className="status-bars">
                  {ISSUE_STATUSES.map((status) => {
                    const count = stats.byStatus[status]
                    return (
                      <li key={status} className="status-bars__row">
                        <span className="status-bars__label">{STATUS_LABELS[status]}</span>
                        <span className="status-bars__track" aria-hidden="true">
                          <span
                            className="status-bars__fill"
                            style={{ width: `${(count / stats.total) * 100}%`, backgroundColor: STATUS_COLORS[status] }}
                          />
                        </span>
                        <span className="status-bars__count">{count}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="card card--flush" aria-labelledby="recent-issues-heading">
            <div className="card__header card__header--padded">
              <h2 id="recent-issues-heading" className="card__title">
                Recently updated issues
              </h2>
              <Link to="/issues" className="card__link">
                Browse issues
              </Link>
            </div>
            {stats.recent.length === 0 ? (
              <EmptyState title="No issues yet" description="Create an issue in one of your projects to see it here." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Key</th>
                      <th scope="col">Title</th>
                      <th scope="col">Status</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((issue) => (
                      <tr key={issue.id}>
                        <td>
                          <Link className="table__link key" to={`/issues/${issue.id}`}>
                            {issue.issueKey}
                          </Link>
                        </td>
                        <td className="table__title">
                          <Link className="table__link" to={`/issues/${issue.id}`}>
                            {issue.title}
                          </Link>
                        </td>
                        <td>
                          <StatusBadge status={issue.status} />
                        </td>
                        <td>
                          <PriorityBadge priority={issue.priority} />
                        </td>
                        <td className="table__muted">{formatRelativeTime(issue.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {creatingProject && (
        <ProjectFormDialog
          onClose={() => setCreatingProject(false)}
          onSaved={(project) => {
            toast.success(`Project ${project.projectKey} created.`)
            setCreatingProject(false)
            navigate(`/projects/${project.id}`)
          }}
        />
      )}
      {creatingIssue && (
        <IssueFormDialog
          projects={issueProjects}
          onClose={() => setCreatingIssue(false)}
          onSaved={(issue) => {
            toast.success(`${issue.issueKey} created.`)
            setCreatingIssue(false)
            navigate(`/issues/${issue.id}`)
          }}
        />
      )}
    </>
  )
}
