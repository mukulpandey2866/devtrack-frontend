import { http } from '../../lib/api'
import type { LabelRequest, LabelResponse } from '../../types/api'

export const labelsService = {
  list: (projectId: string, signal?: AbortSignal) =>
    http.get<LabelResponse[]>(`/api/projects/${projectId}/labels`, { signal }),
  create: (projectId: string, request: LabelRequest) =>
    http.post<LabelResponse>(`/api/projects/${projectId}/labels`, request),
  update: (labelId: string, request: LabelRequest) => http.put<LabelResponse>(`/api/labels/${labelId}`, request),
  remove: (labelId: string) => http.delete(`/api/labels/${labelId}`),
  /** Replaces the full label set of an issue. */
  setForIssue: (issueId: string, labelIds: string[]) =>
    http.put<LabelResponse[]>(`/api/issues/${issueId}/labels`, { labelIds }),
}
