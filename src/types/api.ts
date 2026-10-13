// Mirrors the DTOs of devtrack-backend (verified against its source and /v3/api-docs).

export type IssueType = 'TASK' | 'BUG' | 'STORY' | 'EPIC'
export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED'
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
export type ProjectRole = 'VIEWER' | 'MEMBER' | 'MANAGER' | 'OWNER'
export type PlatformRole = 'USER' | 'ADMIN'

export const ISSUE_TYPES: readonly IssueType[] = ['TASK', 'BUG', 'STORY', 'EPIC']
export const ISSUE_STATUSES: readonly IssueStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']
export const ISSUE_PRIORITIES: readonly IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const PROJECT_STATUSES: readonly ProjectStatus[] = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']
export const PROJECT_ROLES: readonly ProjectRole[] = ['VIEWER', 'MEMBER', 'MANAGER', 'OWNER']

export interface UserSummary {
  id: string
  fullName: string
  email: string
}

export interface UserResponse extends UserSummary {
  platformRole: PlatformRole
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  /** Token lifetime in seconds. */
  expiresIn: number
  user: UserResponse
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
}

export interface PageResponse<T> {
  content: T[]
  /** Zero-based page index. */
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageParams {
  page?: number
  size?: number
  /** Spring format: `field,asc|desc`. */
  sort?: string
}

export interface ProjectResponse {
  id: string
  name: string
  projectKey: string
  description: string | null
  status: ProjectStatus
  ownerId: string
  currentUserRole: ProjectRole | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  projectKey: string
  description?: string
}

export interface UpdateProjectRequest {
  name: string
  description?: string
  status?: ProjectStatus
}

export interface MemberResponse {
  user: UserSummary
  role: ProjectRole
  joinedAt: string
}

export interface AddMemberRequest {
  email: string
  role: ProjectRole
}

export interface LabelResponse {
  id: string
  projectId: string
  name: string
  color: string
  createdAt: string
}

export interface LabelRequest {
  name: string
  color?: string
}

export interface IssueResponse {
  id: string
  projectId: string
  issueKey: string
  issueNumber: number
  title: string
  description: string | null
  issueType: IssueType
  status: IssueStatus
  priority: IssuePriority
  reporter: UserSummary
  assignees: UserSummary[]
  labels: LabelResponse[]
  dueDate: string | null
  estimatedHours: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateIssueRequest {
  title: string
  description?: string
  issueType: IssueType
  priority?: IssuePriority
  dueDate?: string
  estimatedHours?: number
}

export interface UpdateIssueRequest {
  title: string
  description?: string
  issueType: IssueType
  priority: IssuePriority
  dueDate?: string
  estimatedHours?: number
}

export interface IssueFilter {
  status?: IssueStatus[]
  priority?: IssuePriority[]
  type?: IssueType[]
  reporterId?: string
  assigneeId?: string
  labelId?: string
  dueBefore?: string
  dueAfter?: string
  q?: string
}

export interface AssigneeResponse {
  user: UserSummary
  assignedAt: string
}

export interface CommentResponse {
  id: string
  issueId: string
  author: UserSummary
  content: string
  createdAt: string
  updatedAt: string
}

export interface IssueHistoryResponse {
  id: string
  issueId: string
  changedBy: UserSummary | null
  fieldName: string
  oldValue: string | null
  newValue: string | null
  changedAt: string
}

export interface FieldViolation {
  field: string
  message: string
}
