import { ArrowLeft, CalendarClock, Pencil, Tag, Trash2, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge, PriorityBadge, TypeBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField } from '../../components/ui/Field'
import { Skeleton } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/States'
import { UserChip } from '../../components/ui/Avatar'
import { useToast } from '../../components/ui/useToast'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { toApiError } from '../../lib/api'
import { STATUS_LABELS, formatDate, formatDateTime, formatHours, todayIso } from '../../lib/format'
import { projectPermissions } from '../../lib/permissions'
import { ISSUE_STATUSES, type IssueStatus } from '../../types/api'
import { CommentsSection } from '../comments/CommentsSection'
import { LabelChip } from '../labels/LabelChip'
import { projectsService } from '../projects/projectsService'
import { IssueFormDialog } from './IssueFormDialog'
import { IssueHistory } from './IssueHistory'
import { IssueLabelsDialog } from './IssueLabelsDialog'
import { issuesService } from './issuesService'

type ActivityTab = 'comments' | 'history'

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="details__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function IssueDetail({ issueId }: { issueId: string }) {
  const toast = useToast()
  const navigate = useNavigate()
  const issueState = useAsync((signal) => issuesService.get(issueId, signal), [issueId])
  const issue = issueState.data
  const projectId = issue?.projectId

  const projectState = useAsync(
    async (signal) => (projectId ? projectsService.get(projectId, signal) : null),
    [projectId],
  )
  const membersState = useAsync(
    async (signal) => (projectId ? projectsService.listMembers(projectId, signal) : []),
    [projectId],
  )
  const project = projectState.data ?? undefined

  const [tab, setTab] = useState<ActivityTab>('comments')
  const [activityVersion, setActivityVersion] = useState(0)
  const [editing, setEditing] = useState(false)
  const [editingLabels, setEditingLabels] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [assigneeChoice, setAssigneeChoice] = useState('')

  useDocumentTitle(issue ? `${issue.issueKey} ${issue.title}` : 'Issue')

  const bumpActivity = () => setActivityVersion((v) => v + 1)

  // Mutations report success only after the API resolves; failures surface as toasts.
  const mutate = async (work: () => Promise<void>, success: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await work()
      toast.success(success)
      bumpActivity()
    } catch (caught) {
      toast.error(toApiError(caught).message)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  if (issueState.initialLoading) {
    return (
      <div className="stack" role="status" aria-busy="true">
        <span className="sr-only">Loading issue</span>
        <Skeleton width="50%" height={28} />
        <Skeleton height={220} />
      </div>
    )
  }
  if (issueState.error && !issue) {
    const notFound = issueState.error.kind === 'not_found'
    return (
      <ErrorState
        error={issueState.error}
        onRetry={notFound ? undefined : issueState.reload}
        title={notFound ? 'Issue not found' : 'Could not load issue'}
      />
    )
  }
  if (!issue) return null
  if (projectState.error && !project) {
    return <ErrorState error={projectState.error} onRetry={projectState.reload} title="Could not load the issue's project" />
  }
  if (!project) {
    return (
      <div className="stack" role="status" aria-busy="true">
        <span className="sr-only">Loading issue</span>
        <Skeleton width="50%" height={28} />
        <Skeleton height={220} />
      </div>
    )
  }

  const permissions = projectPermissions(project)
  const members = membersState.data ?? []
  const assignedIds = new Set(issue.assignees.map((a) => a.id))
  const assignable = members.filter((m) => !assignedIds.has(m.user.id))
  const overdue = Boolean(issue.dueDate) && issue.dueDate! < todayIso() && issue.status !== 'DONE' && issue.status !== 'CANCELLED'

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to={`/projects/${project.id}`} className="back-link">
            <ArrowLeft className="icon" aria-hidden="true" />
            {project.name}
          </Link>
        }
        title={issue.title}
        meta={<code className="key">{issue.issueKey}</code>}
        actions={
          <>
            {permissions.canEditIssue && (
              <Button icon={<Pencil className="icon" aria-hidden="true" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {permissions.canDeleteIssue && (
              <Button variant="danger" icon={<Trash2 className="icon" aria-hidden="true" />} onClick={() => setDeleting(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="issue-layout">
        <div className="issue-main stack">
          <section className="card" aria-labelledby="description-heading">
            <h2 id="description-heading" className="card__title">
              Description
            </h2>
            {issue.description ? <p className="prose">{issue.description}</p> : <p className="table__muted">No description provided.</p>}
          </section>

          <section className="card">
            <div className="tabs" role="tablist" aria-label="Issue activity">
              {(['comments', 'history'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`issue-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`issue-panel-${id}`}
                  className={`tabs__tab${tab === id ? ' tabs__tab--active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {id === 'comments' ? 'Comments' : 'History'}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`issue-panel-${tab}`} aria-labelledby={`issue-tab-${tab}`} className="tabpanel">
              {tab === 'comments' ? (
                <CommentsSection issueId={issue.id} project={project} />
              ) : (
                <IssueHistory issueId={issue.id} members={members} version={activityVersion} />
              )}
            </div>
          </section>
        </div>

        <aside className="issue-side card" aria-label="Issue details">
          <SelectField
            label="Status"
            value={issue.status}
            disabled={!permissions.canEditIssue || busy}
            onChange={(event) => {
              const status = event.target.value as IssueStatus
              void mutate(async () => {
                issueState.mutate(await issuesService.changeStatus(issue.id, status))
              }, `Status changed to ${STATUS_LABELS[status]}.`)
            }}
          >
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>

          <dl className="details">
            <Detail label="Priority">
              <PriorityBadge priority={issue.priority} />
            </Detail>
            <Detail label="Type">
              <TypeBadge type={issue.issueType} />
            </Detail>
            <Detail label="Reporter">
              <UserChip name={issue.reporter.fullName} email={issue.reporter.email} />
            </Detail>
            <Detail label="Assignees">
              {issue.assignees.length === 0 ? (
                <span className="table__muted">Unassigned</span>
              ) : (
                <ul className="assignees">
                  {issue.assignees.map((a) => (
                    <li key={a.id} className="assignees__item">
                      <UserChip name={a.fullName} email={a.email} />
                      {permissions.canEditIssue && (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Unassign ${a.fullName}`}
                          disabled={busy}
                          onClick={() =>
                            void mutate(async () => {
                              await issuesService.removeAssignee(issue.id, a.id)
                              issueState.reload()
                            }, `${a.fullName} unassigned.`)
                          }
                        >
                          <X className="icon" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {permissions.canEditIssue && assignable.length > 0 && (
                <div className="assign-row">
                  <label className="sr-only" htmlFor="assignee-select">
                    Assign a member
                  </label>
                  <select
                    id="assignee-select"
                    className="input select input--inline"
                    value={assigneeChoice}
                    onChange={(e) => setAssigneeChoice(e.target.value)}
                  >
                    <option value="">Assign member...</option>
                    {assignable.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.fullName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!assigneeChoice || busy}
                    onClick={() => {
                      const member = members.find((m) => m.user.id === assigneeChoice)
                      void mutate(async () => {
                        await issuesService.addAssignee(issue.id, assigneeChoice)
                        setAssigneeChoice('')
                        issueState.reload()
                      }, `${member?.user.fullName ?? 'Member'} assigned.`)
                    }}
                  >
                    Assign
                  </Button>
                </div>
              )}
            </Detail>
            <Detail label="Labels">
              {issue.labels.length === 0 ? (
                <span className="table__muted">None</span>
              ) : (
                <div className="chip-row">
                  {issue.labels.map((label) => (
                    <LabelChip key={label.id} label={label} />
                  ))}
                </div>
              )}
              {permissions.canEditIssue && (
                <Button size="sm" variant="ghost" icon={<Tag className="icon" aria-hidden="true" />} onClick={() => setEditingLabels(true)}>
                  Edit labels
                </Button>
              )}
            </Detail>
            <Detail label="Due date">
              <span className="inline-flex">
                <CalendarClock className="icon" aria-hidden="true" />
                {formatDate(issue.dueDate)}
                {overdue && <Badge tone="red">Overdue</Badge>}
              </span>
            </Detail>
            <Detail label="Estimate">{formatHours(issue.estimatedHours)}</Detail>
            <Detail label="Created">{formatDateTime(issue.createdAt)}</Detail>
            <Detail label="Updated">{formatDateTime(issue.updatedAt)}</Detail>
          </dl>
        </aside>
      </div>

      {editing && (
        <IssueFormDialog
          issue={issue}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            issueState.mutate(saved)
            bumpActivity()
            toast.success('Issue updated.')
            setEditing(false)
          }}
        />
      )}
      {editingLabels && (
        <IssueLabelsDialog
          issue={issue}
          onClose={() => setEditingLabels(false)}
          onSaved={() => {
            issueState.reload()
            bumpActivity()
            toast.success('Labels updated.')
            setEditingLabels(false)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete issue"
          message={`Delete ${issue.issueKey}? Its comments, assignments and history are deleted too. To keep the record, set the status to Cancelled instead.`}
          confirmLabel="Delete issue"
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await issuesService.remove(issue.id)
            toast.success(`${issue.issueKey} deleted.`)
            navigate(`/projects/${project.id}`, { replace: true })
          }}
        />
      )}
    </>
  )
}

export function IssueDetailPage() {
  const { issueId } = useParams()
  if (!issueId) return null
  return <IssueDetail key={issueId} issueId={issueId} />
}
