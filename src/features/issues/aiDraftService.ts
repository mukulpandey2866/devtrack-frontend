import { http } from '../../lib/api'
import type { AiIssueDraftRequest, AiIssueDraftResponse } from '../../types/api'

export const aiDraftService = {
  /** Generates a draft only; nothing is saved by this call. */
  draftIssue: async (request: AiIssueDraftRequest): Promise<AiIssueDraftResponse> => {
    const response = await http.post<Partial<AiIssueDraftResponse>>('/api/ai/issues/draft', request)
    return {
      title: response.title ?? '',
      description: response.description ?? '',
      acceptanceCriteria: response.acceptanceCriteria ?? [],
      suggestedLabels: response.suggestedLabels ?? [],
    }
  },
}
