import { Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { PriorityBadge, StatusBadge, TypeBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAsync } from '../../hooks/useAsync'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS, formatDate, formatRelativeTime } from '../../lib/format'
import { projectPermissions } from '../../lib/permissions'
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, type ProjectResponse } from '../../types/api'
import { LabelChip } from '../labels/LabelChip'
import { labelsService } from '../labels/labelsService'
import { projectsService } from '../projects/projectsService'
import {
  ISSUE_SORT_OPTIONS,
  countActiveFilters,
  parseIssueSearch,
  toListParams,
  writeIssueSearch,
  type IssueListState,
} from './issueFilters'
import { IssueFormDialog } from './IssueFormDialog'
import { issuesService } from './issuesService'

function ToggleGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onChange,
}: {
  legend: string
  options: readonly T[]
  labels: Record<T, string>
  selected: T[]
  onChange: (next: T[]) => void
}) {
  return (
    <fieldset className="toggle-group">
      <legend className="toggle-group__legend">{legend}</legend>
      <div className="toggle-group__options">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              className={`chip${active ? ' chip--active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange(active ? selected.filter((value) => value !== option) : [...selected, option])}
            >
              {labels[option]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Issue list for one project; filter, sort and page state live in the URL query string. */
export function ProjectIssues({ project }: { project: ProjectResponse }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parseIssueSearch(params), [params])
  const { canCreateIssue } = projectPermissions(project)
  const [creating, setCreating] = useState(false)

  const update = (patch: Partial<IssueListState>) => {
    setParams(
      (previous) => {
        const current = parseIssueSearch(previous)
        const resetsPage = !('page' in patch)
        return writeIssueSearch(previous, { ...current, ...patch, page: resetsPage ? 0 : (patch.page ?? 0) })
      },
      { replace: true },
    )
  }

  const updateRef = useRef(update)
  const currentQRef = useRef(state.q)
  useEffect(() => {
    updateRef.current = update
    currentQRef.current = state.q
  })

  const [qInput, setQInput] = useState(state.q)
  const debouncedQ = useDebouncedValue(qInput)
  useEffect(() => {
    if (debouncedQ.trim() !== currentQRef.current.trim()) updateRef.current({ q: debouncedQ })
  }, [debouncedQ])

  const members = useAsync((signal) => projectsService.listMembers(project.id, signal), [project.id])
  const labels = useAsync((signal) => labelsService.list(project.id, signal), [project.id])

  const queryKey = JSON.stringify(toListParams(state))
  const { data, error, loading, initialLoading, reload } = useAsync(
    (signal) => issuesService.list(project.id, toListParams(state), signal),
    // queryKey fully describes `state`
    [project.id, queryKey],
  )

  const activeFilters = countActiveFilters(state)
  const clearFilters = () => {
    setQInput('')
    setParams(
      (previous) =>
        writeIssueSearch(previous, { ...parseIssueSearch(new URLSearchParams()), sort: parseIssueSearch(previous).sort }),
      { replace: true },
    )
  }

  return (
    <div className="stack">
      <div className="filters card">
        <div className="filters__row">
          <div className="filters__search">
            <TextField
              label="Search titles"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              maxLength={100}
              placeholder="Search issues"
              suffix={<Search className="input-group__icon icon" aria-hidden="true" />}
            />
          </div>
          <SelectField label="Assignee" value={state.assigneeId} onChange={(e) => update({ assigneeId: e.target.value })}>
            <option value="">Anyone</option>
            {members.data?.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.fullName}
              </option>
            ))}
          </SelectField>
          <SelectField label="Reporter" value={state.reporterId} onChange={(e) => update({ reporterId: e.target.value })}>
            <option value="">Anyone</option>
            {members.data?.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.fullName}
              </option>
            ))}
          </SelectField>
          <SelectField label="Label" value={state.labelId} onChange={(e) => update({ labelId: e.target.value })}>
            <option value="">Any label</option>
            {labels.data?.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Sort by" value={state.sort} onChange={(e) => update({ sort: e.target.value })}>
            {ISSUE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="filters__row filters__row--chips">
          <ToggleGroup legend="Status" options={ISSUE_STATUSES} labels={STATUS_LABELS} selected={state.status} onChange={(status) => update({ status })} />
          <ToggleGroup legend="Priority" options={ISSUE_PRIORITIES} labels={PRIORITY_LABELS} selected={state.priority} onChange={(priority) => update({ priority })} />
          <ToggleGroup legend="Type" options={ISSUE_TYPES} labels={TYPE_LABELS} selected={state.type} onChange={(type) => update({ type })} />
        </div>
        <div className="filters__footer">
          {activeFilters > 0 ? (
            <Button size="sm" variant="ghost" icon={<X className="icon" aria-hidden="true" />} onClick={clearFilters}>
              Clear {activeFilters} {activeFilters === 1 ? 'filter' : 'filters'}
            </Button>
          ) : (
            <span />
          )}
          {canCreateIssue && (
            <Button variant="primary" icon={<Plus className="icon" aria-hidden="true" />} onClick={() => setCreating(true)}>
              New issue
            </Button>
          )}
        </div>
      </div>

      <section className="card card--flush" aria-busy={loading} aria-label="Issues">
        {initialLoading ? (
          <SkeletonRows rows={6} label="Loading issues" />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} title="Could not load issues" />
        ) : data && data.totalElements === 0 ? (
          <EmptyState
            title={activeFilters > 0 ? 'No issues match these filters' : 'No issues yet'}
            description={
              activeFilters > 0
                ? 'Try removing some filters.'
                : canCreateIssue
                  ? 'Create the first issue for this project.'
                  : 'Issues created in this project will appear here.'
            }
            action={
              activeFilters > 0 ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : canCreateIssue ? (
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Create issue
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {error && <ErrorState error={error} onRetry={reload} title="Could not refresh issues" />}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Title</th>
                    <th scope="col">Status</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Type</th>
                    <th scope="col">Assignees</th>
                    <th scope="col">Due</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.content.map((issue) => (
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
                        {issue.labels.length > 0 && (
                          <div className="chip-row">
                            {issue.labels.map((label) => (
                              <LabelChip key={label.id} label={label} />
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={issue.status} />
                      </td>
                      <td>
                        <PriorityBadge priority={issue.priority} />
                      </td>
                      <td>
                        <TypeBadge type={issue.issueType} />
                      </td>
                      <td>
                        {issue.assignees.length === 0 ? (
                          <span className="table__muted">Unassigned</span>
                        ) : (
                          <span className="avatar-stack" title={issue.assignees.map((a) => a.fullName).join(', ')}>
                            {issue.assignees.slice(0, 3).map((a) => (
                              <Avatar key={a.id} name={a.fullName} size="sm" />
                            ))}
                            {issue.assignees.length > 3 && <span className="avatar-stack__more">+{issue.assignees.length - 3}</span>}
                            <span className="sr-only">{issue.assignees.map((a) => a.fullName).join(', ')}</span>
                          </span>
                        )}
                      </td>
                      <td className="table__muted">{formatDate(issue.dueDate)}</td>
                      <td className="table__muted">{formatRelativeTime(issue.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && (
              <Pagination
                page={data.page}
                size={data.size}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                onPageChange={(page) => update({ page })}
                disabled={loading}
              />
            )}
          </>
        )}
      </section>

      {creating && (
        <IssueFormDialog
          project={project}
          onClose={() => setCreating(false)}
          onSaved={(issue) => {
            toast.success(`${issue.issueKey} created.`)
            setCreating(false)
            navigate(`/issues/${issue.id}`)
          }}
        />
      )}
    </div>
  )
}
