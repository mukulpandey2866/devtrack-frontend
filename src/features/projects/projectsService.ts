import { http } from '../../lib/api'
import type {
  AddMemberRequest,
  CreateProjectRequest,
  MemberResponse,
  PageParams,
  PageResponse,
  ProjectResponse,
  ProjectRole,
  ProjectStatus,
  UpdateProjectRequest,
} from '../../types/api'

export interface ProjectListParams extends PageParams {
  status?: ProjectStatus
}

export const projectsService = {
  list: (params: ProjectListParams = {}, signal?: AbortSignal) =>
    http.get<PageResponse<ProjectResponse>>('/api/projects', { params, signal }),
  get: (projectId: string, signal?: AbortSignal) => http.get<ProjectResponse>(`/api/projects/${projectId}`, { signal }),
  create: (request: CreateProjectRequest) => http.post<ProjectResponse>('/api/projects', request),
  update: (projectId: string, request: UpdateProjectRequest) =>
    http.put<ProjectResponse>(`/api/projects/${projectId}`, request),
  /** The backend archives rather than deletes; archived projects become read-only. */
  archive: (projectId: string) => http.delete(`/api/projects/${projectId}`),

  listMembers: (projectId: string, signal?: AbortSignal) =>
    http.get<MemberResponse[]>(`/api/projects/${projectId}/members`, { signal }),
  addMember: (projectId: string, request: AddMemberRequest) =>
    http.post<MemberResponse>(`/api/projects/${projectId}/members`, request),
  changeMemberRole: (projectId: string, userId: string, role: ProjectRole) =>
    http.put<MemberResponse>(`/api/projects/${projectId}/members/${userId}`, { role }),
  removeMember: (projectId: string, userId: string) => http.delete(`/api/projects/${projectId}/members/${userId}`),
}
