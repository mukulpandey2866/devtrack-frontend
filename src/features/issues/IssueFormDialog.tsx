import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { PRIORITY_LABELS, TYPE_LABELS, todayIso } from '../../lib/format'
import {
  hasErrors,
  validateDueDate,
  validateEstimatedHours,
  validateMaxLength,
  validateTitle,
  type FieldErrors,
} from '../../lib/validation'
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  type CreateIssueRequest,
  type IssuePriority,
  type IssueResponse,
  type IssueType,
  type ProjectResponse,
} from '../../types/api'
import { issuesService } from './issuesService'

interface IssueFormDialogProps {
  /** Edit mode when provided. */
  issue?: IssueResponse
  /** Fixed project for creation. */
  project?: ProjectResponse
  /** Selectable projects for creation when no fixed project is given (callers pass writable ones). */
  projects?: ProjectResponse[]
  onSaved: (issue: IssueResponse) => void
  onClose: () => void
}

type Field = 'title' | 'description' | 'dueDate' | 'estimatedHours' | 'projectId'

export function IssueFormDialog({ issue, project, projects, onSaved, onClose }: IssueFormDialogProps) {
  const editing = Boolean(issue)
  const [projectId, setProjectId] = useState(project?.id ?? projects?.[0]?.id ?? '')
  const [title, setTitle] = useState(issue?.title ?? '')
  const [description, setDescription] = useState(issue?.description ?? '')
  const [issueType, setIssueType] = useState<IssueType>(issue?.issueType ?? 'TASK')
  const [priority, setPriority] = useState<IssuePriority>(issue?.priority ?? 'MEDIUM')
  const [dueDate, setDueDate] = useState(issue?.dueDate ?? '')
  const [estimatedHours, setEstimatedHours] = useState(issue?.estimatedHours?.toString() ?? '')
  const [errors, setErrors] = useState<FieldErrors<Field>>({})

  const { run, pending, error } = useAction(async () => {
    const hours = estimatedHours.trim() ? Number(estimatedHours) : undefined
    const common = {
      title: title.trim(),
      description: description.trim(),
      issueType,
      dueDate: dueDate || undefined,
      estimatedHours: hours,
    }
    if (issue) return issuesService.update(issue.id, { ...common, priority })
    const request: CreateIssueRequest = { ...common, priority }
    return issuesService.create(projectId, request)
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const next: FieldErrors<Field> = {
      projectId: editing || projectId ? undefined : 'Select a project.',
      title: validateTitle(title),
      description: validateMaxLength(description, 20000, 'Description'),
      dueDate: validateDueDate(dueDate, issue?.dueDate),
      estimatedHours: validateEstimatedHours(estimatedHours),
    }
    setErrors(next)
    if (hasErrors(next)) return
    const result = await run()
    if (result?.ok) onSaved(result.value)
  }

  const showBanner = error && Object.keys(error.fieldErrors).length === 0
  const fieldError = (field: Field) => errors[field] ?? error?.fieldErrors[field]

  return (
    <Modal
      title={editing ? `Edit ${issue?.issueKey}` : 'Create issue'}
      size="lg"
      onClose={onClose}
      locked={pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="issue-form" variant="primary" loading={pending}>
            {editing ? 'Save changes' : 'Create issue'}
          </Button>
        </>
      }
    >
      <form id="issue-form" className="form" onSubmit={onSubmit} noValidate>
        {showBanner && <Alert tone="error">{error.message}</Alert>}
        {!editing && !project && (
          <SelectField label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} error={errors.projectId} required>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectKey} - {p.name}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldError('title')} maxLength={200} required />
        <TextAreaField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldError('description')}
          rows={5}
        />
        <div className="form__row">
          <SelectField label="Type" value={issueType} onChange={(e) => setIssueType(e.target.value as IssueType)}>
            {ISSUE_TYPES.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
            {ISSUE_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="form__row">
          <TextField
            label="Due date"
            type="date"
            value={dueDate}
            min={editing ? undefined : todayIso()}
            onChange={(e) => setDueDate(e.target.value)}
            error={fieldError('dueDate')}
          />
          <TextField
            label="Estimated hours"
            inputMode="decimal"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            error={fieldError('estimatedHours')}
            placeholder="e.g. 4.5"
          />
        </div>
        {!editing && <p className="field__hint">Assignees and labels can be added from the issue page after it is created.</p>}
      </form>
    </Modal>
  )
}
