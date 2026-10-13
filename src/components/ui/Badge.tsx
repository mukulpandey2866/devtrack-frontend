import type { ReactNode } from 'react'
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, ROLE_LABELS, STATUS_LABELS, TYPE_LABELS } from '../../lib/format'
import type { IssuePriority, IssueStatus, IssueType, ProjectRole, ProjectStatus } from '../../types/api'

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

const STATUS_TONES: Record<IssueStatus, string> = {
  TODO: 'neutral',
  IN_PROGRESS: 'blue',
  IN_REVIEW: 'purple',
  DONE: 'green',
  CANCELLED: 'muted',
}

const PRIORITY_TONES: Record<IssuePriority, string> = {
  LOW: 'muted',
  MEDIUM: 'blue',
  HIGH: 'orange',
  CRITICAL: 'red',
}

const TYPE_TONES: Record<IssueType, string> = {
  TASK: 'neutral',
  BUG: 'red',
  STORY: 'green',
  EPIC: 'purple',
}

const PROJECT_STATUS_TONES: Record<ProjectStatus, string> = {
  ACTIVE: 'green',
  ON_HOLD: 'orange',
  COMPLETED: 'blue',
  ARCHIVED: 'muted',
}

const ROLE_TONES: Record<ProjectRole, string> = {
  VIEWER: 'muted',
  MEMBER: 'neutral',
  MANAGER: 'blue',
  OWNER: 'purple',
}

export const StatusBadge = ({ status }: { status: IssueStatus }) => (
  <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
)
export const PriorityBadge = ({ priority }: { priority: IssuePriority }) => (
  <Badge tone={PRIORITY_TONES[priority]}>{PRIORITY_LABELS[priority]}</Badge>
)
export const TypeBadge = ({ type }: { type: IssueType }) => <Badge tone={TYPE_TONES[type]}>{TYPE_LABELS[type]}</Badge>
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <Badge tone={PROJECT_STATUS_TONES[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
)
export const RoleBadge = ({ role }: { role: ProjectRole }) => <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>
