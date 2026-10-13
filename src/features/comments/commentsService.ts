import { http } from '../../lib/api'
import type { CommentResponse, PageParams, PageResponse } from '../../types/api'

export const commentsService = {
  list: (issueId: string, params: PageParams = {}, signal?: AbortSignal) =>
    http.get<PageResponse<CommentResponse>>(`/api/issues/${issueId}/comments`, { params, signal }),
  create: (issueId: string, content: string) =>
    http.post<CommentResponse>(`/api/issues/${issueId}/comments`, { content }),
  update: (commentId: string, content: string) => http.put<CommentResponse>(`/api/comments/${commentId}`, { content }),
  remove: (commentId: string) => http.delete(`/api/comments/${commentId}`),
}
