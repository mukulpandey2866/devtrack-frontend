import { Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TextAreaField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime } from '../../lib/format'
import { projectPermissions, roleAtLeast } from '../../lib/permissions'
import { validateComment } from '../../lib/validation'
import type { CommentResponse, ProjectResponse } from '../../types/api'
import { useCurrentUser } from '../auth/useAuth'
import { commentsService } from './commentsService'

const PAGE_SIZE = 20

function CommentItem({
  comment,
  canEdit,
  canDelete,
  onChanged,
  onDelete,
}: {
  comment: CommentResponse
  canEdit: boolean
  canDelete: boolean
  onChanged: () => void
  onDelete: () => void
}) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.content)
  const [validation, setValidation] = useState<string>()
  const { run, pending, error } = useAction(() => commentsService.update(comment.id, text.trim()))

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const message = validateComment(text)
    setValidation(message)
    if (message) return
    const result = await run()
    if (result?.ok) {
      toast.success('Comment updated.')
      setEditing(false)
      onChanged()
    }
  }

  const edited = comment.updatedAt !== comment.createdAt

  return (
    <li className="comment">
      <Avatar name={comment.author.fullName} />
      <div className="comment__main">
        <div className="comment__meta">
          <strong>{comment.author.fullName}</strong>
          <span className="table__muted">
            {formatDateTime(comment.createdAt)}
            {edited && ' (edited)'}
          </span>
          <span className="comment__actions">
            {canEdit && !editing && (
              <IconButton label="Edit comment" onClick={() => setEditing(true)}>
                <Pencil className="icon" aria-hidden="true" />
              </IconButton>
            )}
            {canDelete && (
              <IconButton label="Delete comment" onClick={onDelete}>
                <Trash2 className="icon" aria-hidden="true" />
              </IconButton>
            )}
          </span>
        </div>
        {editing ? (
          <form className="form" onSubmit={save} noValidate>
            {error && <Alert tone="error">{error.message}</Alert>}
            <TextAreaField label="Edit comment" value={text} onChange={(e) => setText(e.target.value)} error={validation} rows={3} />
            <div className="form__actions">
              <Button
                size="sm"
                onClick={() => {
                  setEditing(false)
                  setText(comment.content)
                  setValidation(undefined)
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" variant="primary" loading={pending}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <p className="comment__body">{comment.content}</p>
        )}
      </div>
    </li>
  )
}

export function CommentsSection({ issueId, project, onChanged }: { issueId: string; project: ProjectResponse; onChanged?: () => void }) {
  const toast = useToast()
  const currentUser = useCurrentUser()
  const { canComment } = projectPermissions(project)
  const writable = project.status !== 'ARCHIVED'
  const [page, setPage] = useState(0)
  const [draft, setDraft] = useState('')
  const [validation, setValidation] = useState<string>()
  const [deleting, setDeleting] = useState<CommentResponse | null>(null)

  const { data, error, loading, initialLoading, reload } = useAsync(
    (signal) => commentsService.list(issueId, { page, size: PAGE_SIZE, sort: 'createdAt,asc' }, signal),
    [issueId, page],
  )
  const create = useAction(() => commentsService.create(issueId, draft.trim()))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const message = validateComment(draft)
    setValidation(message)
    if (message) return
    const result = await create.run()
    if (result?.ok) {
      setDraft('')
      toast.success('Comment added.')
      const total = (data?.totalElements ?? 0) + 1
      const lastPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0)
      if (lastPage === page) reload()
      else setPage(lastPage)
      onChanged?.()
    }
  }

  const refresh = () => {
    reload()
    onChanged?.()
  }

  return (
    <section aria-labelledby="comments-heading" className="stack">
      <h2 id="comments-heading" className="card__title">
        Comments {data ? <span className="table__muted">({data.totalElements})</span> : null}
      </h2>
      {initialLoading ? (
        <SkeletonRows rows={3} label="Loading comments" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Could not load comments" />
      ) : data && data.totalElements === 0 ? (
        <EmptyState title="No comments yet" description={canComment ? 'Start the conversation below.' : undefined} />
      ) : (
        <>
          <ul className="comments" aria-busy={loading}>
            {data?.content.map((comment) => {
              const isAuthor = comment.author.id === currentUser.id
              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  canEdit={isAuthor && canComment}
                  canDelete={writable && (isAuthor ? canComment : roleAtLeast(project.currentUserRole, 'MANAGER'))}
                  onChanged={refresh}
                  onDelete={() => setDeleting(comment)}
                />
              )
            })}
          </ul>
          {data && (
            <Pagination
              page={data.page}
              size={data.size}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              onPageChange={setPage}
              disabled={loading}
            />
          )}
        </>
      )}

      {canComment ? (
        <form className="form card" onSubmit={submit} noValidate>
          {create.error && <Alert tone="error">{create.error.message}</Alert>}
          <TextAreaField
            label="Add a comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            error={validation}
            rows={3}
            maxLength={5000}
          />
          <div className="form__actions">
            <Button type="submit" variant="primary" loading={create.pending}>
              Comment
            </Button>
          </div>
        </form>
      ) : (
        <Alert tone="info">{writable ? 'Viewers can read comments but cannot add them.' : 'This project is archived, so comments are read-only.'}</Alert>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete comment"
          message="Delete this comment? This cannot be undone."
          confirmLabel="Delete comment"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await commentsService.remove(deleting.id)
            toast.success('Comment deleted.')
            if (data && data.content.length === 1 && page > 0) setPage(page - 1)
            else reload()
            onChanged?.()
          }}
        />
      )}
    </section>
  )
}
