import { http } from '../../lib/api'
import type {
  AssigneeResponse,
  CreateIssueRequest,
  IssueFilter,
  IssueHistoryResponse,
  IssueResponse,
  IssueStatus,
  PageParams,
  PageResponse,
  UpdateIssueRequest,
} from '../../types/api'

export type IssueListParams = PageParams & IssueFilter

export const issuesService = {
  list: (projectId: string, params: IssueListParams = {}, signal?: AbortSignal) =>
    http.get<PageResponse<IssueResponse>>(`/api/projects/${projectId}/issues`, { params, signal }),
  get: (issueId: string, signal?: AbortSignal) => http.get<IssueResponse>(`/api/issues/${issueId}`, { signal }),
  create: (projectId: string, request: CreateIssueRequest) =>
    http.post<IssueResponse>(`/api/projects/${projectId}/issues`, request),
  update: (issueId: string, request: UpdateIssueRequest) => http.put<IssueResponse>(`/api/issues/${issueId}`, request),
  changeStatus: (issueId: string, status: IssueStatus) =>
    http.patch<IssueResponse>(`/api/issues/${issueId}/status`, { status }),
  remove: (issueId: string) => http.delete(`/api/issues/${issueId}`),
  history: (issueId: string, params: PageParams = {}, signal?: AbortSignal) =>
    http.get<PageResponse<IssueHistoryResponse>>(`/api/issues/${issueId}/history`, { params, signal }),

  listAssignees: (issueId: string, signal?: AbortSignal) =>
    http.get<AssigneeResponse[]>(`/api/issues/${issueId}/assignees`, { signal }),
  addAssignee: (issueId: string, userId: string) =>
    http.post<AssigneeResponse>(`/api/issues/${issueId}/assignees`, { userId }),
  removeAssignee: (issueId: string, userId: string) => http.delete(`/api/issues/${issueId}/assignees/${userId}`),
}
