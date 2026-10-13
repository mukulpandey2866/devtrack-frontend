import { useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { SkeletonRows } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime } from '../../lib/format'
import type { MemberResponse } from '../../types/api'
import { describeHistory } from './issueHistoryFormat'
import { issuesService } from './issuesService'

const PAGE_SIZE = 20

export function IssueHistory({ issueId, members, version }: { issueId: string; members: MemberResponse[]; version: number }) {
  const [page, setPage] = useState(0)
  const { data, error, loading, initialLoading, reload } = useAsync(
    (signal) => issuesService.history(issueId, { page, size: PAGE_SIZE, sort: 'changedAt,desc' }, signal),
    [issueId, page, version],
  )
  const memberNames = new Map(members.map((m) => [m.user.id, m.user.fullName]))

  if (initialLoading) return <SkeletonRows rows={4} label="Loading history" />
  if (error && !data) return <ErrorState error={error} onRetry={reload} title="Could not load history" />
  if (!data || data.totalElements === 0) return <EmptyState title="No history yet" />

  return (
    <div className="stack" aria-busy={loading}>
      <ol className="timeline">
        {data.content.map((entry) => (
          <li key={entry.id} className="timeline__item">
            <Avatar name={entry.changedBy?.fullName ?? 'Unknown user'} size="sm" />
            <div>
              <p className="timeline__text">
                <strong>{entry.changedBy?.fullName ?? 'A former user'}</strong> {describeHistory(entry, memberNames)}
              </p>
              <time className="table__muted" dateTime={entry.changedAt}>
                {formatDateTime(entry.changedAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>
      <Pagination
        page={data.page}
        size={data.size}
        totalPages={data.totalPages}
        totalElements={data.totalElements}
        onPageChange={setPage}
        disabled={loading}
      />
    </div>
  )
}
