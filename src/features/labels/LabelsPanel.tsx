import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SkeletonRows } from '../../components/ui/Loading'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/useToast'
import { useAsync } from '../../hooks/useAsync'
import { projectPermissions } from '../../lib/permissions'
import type { LabelResponse, ProjectResponse } from '../../types/api'
import { LabelChip } from './LabelChip'
import { LabelFormDialog } from './LabelFormDialog'
import { labelsService } from './labelsService'

export function LabelsPanel({ project }: { project: ProjectResponse }) {
  const toast = useToast()
  const { canManageLabels } = projectPermissions(project)
  const { data, error, initialLoading, reload } = useAsync((signal) => labelsService.list(project.id, signal), [project.id])
  const [editing, setEditing] = useState<LabelResponse | 'new' | null>(null)
  const [deleting, setDeleting] = useState<LabelResponse | null>(null)

  return (
    <section className="card" aria-labelledby="labels-heading">
      <div className="card__header">
        <h2 id="labels-heading" className="card__title">
          Labels
        </h2>
        {canManageLabels && (
          <Button size="sm" variant="primary" icon={<Plus className="icon" aria-hidden="true" />} onClick={() => setEditing('new')}>
            New label
          </Button>
        )}
      </div>
      {initialLoading ? (
        <SkeletonRows rows={3} label="Loading labels" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Could not load labels" />
      ) : data && data.length === 0 ? (
        <EmptyState
          title="No labels yet"
          description={canManageLabels ? 'Create labels to categorize issues in this project.' : 'Project managers can create labels for this project.'}
        />
      ) : (
        <ul className="list">
          {data?.map((label) => (
            <li key={label.id} className="list__item">
              <LabelChip label={label} />
              {canManageLabels && (
                <span className="list__actions">
                  <IconButton label={`Edit label ${label.name}`} onClick={() => setEditing(label)}>
                    <Pencil className="icon" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete label ${label.name}`} onClick={() => setDeleting(label)}>
                    <Trash2 className="icon" aria-hidden="true" />
                  </IconButton>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <LabelFormDialog
          projectId={project.id}
          label={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.success(editing === 'new' ? 'Label created.' : 'Label updated.')
            setEditing(null)
            reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete label"
          message={`Delete "${deleting.name}"? It will be removed from every issue that uses it.`}
          confirmLabel="Delete label"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await labelsService.remove(deleting.id)
            toast.success('Label deleted.')
            reload()
          }}
        />
      )}
    </section>
  )
}
