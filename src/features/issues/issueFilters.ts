import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
} from '../../types/api'
import type { IssueListParams } from './issuesService'

export const ISSUE_PAGE_SIZE = 15

export const ISSUE_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'issueNumber,asc', label: 'Issue number (low to high)' },
  { value: 'issueNumber,desc', label: 'Issue number (high to low)' },
  { value: 'dueDate,asc', label: 'Due date (soonest)' },
  { value: 'title,asc', label: 'Title (A-Z)' },
]

export interface IssueListState {
  /** Zero-based page index. */
  page: number
  sort: string
  q: string
  status: IssueStatus[]
  priority: IssuePriority[]
  type: IssueType[]
  assigneeId: string
  reporterId: string
  labelId: string
}

export const DEFAULT_ISSUE_LIST_STATE: IssueListState = {
  page: 0,
  sort: ISSUE_SORT_OPTIONS[0].value,
  q: '',
  status: [],
  priority: [],
  type: [],
  assigneeId: '',
  reporterId: '',
  labelId: '',
}

function pickEnum<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return allowed.filter((value) => values.includes(value))
}

export function parseIssueSearch(params: URLSearchParams): IssueListState {
  const page = Number.parseInt(params.get('page') ?? '1', 10)
  const sort = params.get('sort')
  return {
    page: Number.isFinite(page) && page > 0 ? page - 1 : 0,
    sort: ISSUE_SORT_OPTIONS.some((option) => option.value === sort) ? (sort as string) : DEFAULT_ISSUE_LIST_STATE.sort,
    q: params.get('q') ?? '',
    status: pickEnum(params.getAll('status'), ISSUE_STATUSES),
    priority: pickEnum(params.getAll('priority'), ISSUE_PRIORITIES),
    type: pickEnum(params.getAll('type'), ISSUE_TYPES),
    assigneeId: params.get('assignee') ?? '',
    reporterId: params.get('reporter') ?? '',
    labelId: params.get('label') ?? '',
  }
}

/** Writes the list state into a copy of `base`, preserving unrelated params such as `project` or `tab`. */
export function writeIssueSearch(base: URLSearchParams, state: IssueListState): URLSearchParams {
  const next = new URLSearchParams(base)
  for (const key of ['page', 'sort', 'q', 'status', 'priority', 'type', 'assignee', 'reporter', 'label']) {
    next.delete(key)
  }
  if (state.page > 0) next.set('page', String(state.page + 1))
  if (state.sort !== DEFAULT_ISSUE_LIST_STATE.sort) next.set('sort', state.sort)
  if (state.q.trim()) next.set('q', state.q.trim())
  state.status.forEach((value) => next.append('status', value))
  state.priority.forEach((value) => next.append('priority', value))
  state.type.forEach((value) => next.append('type', value))
  if (state.assigneeId) next.set('assignee', state.assigneeId)
  if (state.reporterId) next.set('reporter', state.reporterId)
  if (state.labelId) next.set('label', state.labelId)
  return next
}

export function toListParams(state: IssueListState): IssueListParams {
  return {
    page: state.page,
    size: ISSUE_PAGE_SIZE,
    sort: state.sort,
    q: state.q.trim() || undefined,
    status: state.status.length ? state.status : undefined,
    priority: state.priority.length ? state.priority : undefined,
    type: state.type.length ? state.type : undefined,
    assigneeId: state.assigneeId || undefined,
    reporterId: state.reporterId || undefined,
    labelId: state.labelId || undefined,
  }
}

export function countActiveFilters(state: IssueListState): number {
  return (
    (state.q.trim() ? 1 : 0) +
    (state.status.length ? 1 : 0) +
    (state.priority.length ? 1 : 0) +
    (state.type.length ? 1 : 0) +
    (state.assigneeId ? 1 : 0) +
    (state.reporterId ? 1 : 0) +
    (state.labelId ? 1 : 0)
  )
}
