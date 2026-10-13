import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { PROJECT_STATUS_LABELS } from '../../lib/format'
import {
  hasErrors,
  validateMaxLength,
  validateProjectKey,
  validateProjectName,
  type FieldErrors,
} from '../../lib/validation'
import { PROJECT_STATUSES, type ProjectResponse, type ProjectStatus } from '../../types/api'
import { projectsService } from './projectsService'

interface ProjectFormDialogProps {
  /** When provided the dialog edits this project; otherwise it creates a new one. */
  project?: ProjectResponse
  onSaved: (project: ProjectResponse) => void
  onClose: () => void
}

type Field = 'name' | 'projectKey' | 'description'

export function ProjectFormDialog({ project, onSaved, onClose }: ProjectFormDialogProps) {
  const editing = Boolean(project)
  const [name, setName] = useState(project?.name ?? '')
  const [projectKey, setProjectKey] = useState(project?.projectKey ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'ACTIVE')
  const [errors, setErrors] = useState<FieldErrors<Field>>({})

  const { run, pending, error } = useAction(async () => {
    if (project) {
      return projectsService.update(project.id, { name: name.trim(), description: description.trim(), status })
    }
    return projectsService.create({
      name: name.trim(),
      projectKey: projectKey.trim().toUpperCase(),
      description: description.trim() || undefined,
    })
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const next: FieldErrors<Field> = {
      name: validateProjectName(name),
      projectKey: editing ? undefined : validateProjectKey(projectKey),
      description: validateMaxLength(description, 10000, 'Description'),
    }
    setErrors(next)
    if (hasErrors(next)) return
    const result = await run()
    if (result?.ok) onSaved(result.value)
  }

  // Only owners may archive or restore; everyone else edits the non-archived statuses.
  const statusOptions = PROJECT_STATUSES.filter((value) => value !== 'ARCHIVED' || project?.currentUserRole === 'OWNER')
  const keyConflict = error?.kind === 'conflict' && !editing
  const showBanner = error && !(keyConflict || Object.keys(error.fieldErrors).length > 0)

  return (
    <Modal
      title={editing ? 'Edit project' : 'Create project'}
      description={editing ? undefined : 'Projects group related issues. The key prefixes every issue number.'}
      onClose={onClose}
      locked={pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" variant="primary" loading={pending}>
            {editing ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" className="form" onSubmit={onSubmit} noValidate>
        {showBanner && <Alert tone="error">{error.message}</Alert>}
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name ?? error?.fieldErrors.name}
          maxLength={150}
          required
        />
        <TextField
          label="Key"
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
          error={errors.projectKey ?? (keyConflict ? error.message : error?.fieldErrors.projectKey)}
          hint={editing ? 'The key cannot be changed.' : '2-10 letters or digits, starting with a letter (for example WEB).'}
          disabled={editing}
          maxLength={10}
          required
        />
        <TextAreaField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description ?? error?.fieldErrors.description}
          rows={4}
        />
        {editing && (
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {PROJECT_STATUS_LABELS[value]}
              </option>
            ))}
          </SelectField>
        )}
      </form>
    </Modal>
  )
}
