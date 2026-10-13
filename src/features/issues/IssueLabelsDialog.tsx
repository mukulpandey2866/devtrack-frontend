import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/States'
import { SkeletonRows } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/States'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import type { IssueResponse, LabelResponse } from '../../types/api'
import { LabelChip } from '../labels/LabelChip'
import { labelsService } from '../labels/labelsService'

export function IssueLabelsDialog({
  issue,
  onSaved,
  onClose,
}: {
  issue: IssueResponse
  onSaved: (labels: LabelResponse[]) => void
  onClose: () => void
}) {
  const { data, error: loadError, initialLoading, reload } = useAsync((signal) => labelsService.list(issue.projectId, signal), [issue.projectId])
  const [selected, setSelected] = useState(() => new Set(issue.labels.map((l) => l.id)))
  const { run, pending, error } = useAction(() => labelsService.setForIssue(issue.id, [...selected]))

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await run()
    if (result?.ok) onSaved(result.value)
  }

  return (
    <Modal
      title="Edit labels"
      description={`Labels available in this project for ${issue.issueKey}.`}
      size="sm"
      onClose={onClose}
      locked={pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="issue-labels-form" variant="primary" loading={pending} disabled={!data}>
            Save labels
          </Button>
        </>
      }
    >
      <form id="issue-labels-form" className="form" onSubmit={onSubmit}>
        {error && <Alert tone="error">{error.message}</Alert>}
        {initialLoading ? (
          <SkeletonRows rows={3} label="Loading labels" />
        ) : loadError && !data ? (
          <ErrorState error={loadError} onRetry={reload} title="Could not load labels" />
        ) : data && data.length === 0 ? (
          <EmptyState title="No labels in this project" description="A project manager can create labels from the project's Labels tab." />
        ) : (
          <fieldset className="checklist">
            <legend className="sr-only">Labels</legend>
            {data?.map((label) => (
              <label key={label.id} className="checklist__item">
                <input type="checkbox" checked={selected.has(label.id)} onChange={() => toggle(label.id)} />
                <LabelChip label={label} />
              </label>
            ))}
          </fieldset>
        )}
      </form>
    </Modal>
  )
}
