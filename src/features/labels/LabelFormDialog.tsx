import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { hasErrors, validateHexColor, validateLabelName, type FieldErrors } from '../../lib/validation'
import type { LabelResponse } from '../../types/api'
import { labelsService } from './labelsService'

interface LabelFormDialogProps {
  projectId: string
  label?: LabelResponse
  onSaved: (label: LabelResponse) => void
  onClose: () => void
}

const DEFAULT_COLOR = '#4F46E5'

export function LabelFormDialog({ projectId, label, onSaved, onClose }: LabelFormDialogProps) {
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState(label?.color ?? DEFAULT_COLOR)
  const [errors, setErrors] = useState<FieldErrors<'name' | 'color'>>({})

  const { run, pending, error } = useAction(async () => {
    const request = { name: name.trim(), color: color.toUpperCase() }
    return label ? labelsService.update(label.id, request) : labelsService.create(projectId, request)
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const next = { name: validateLabelName(name), color: validateHexColor(color) }
    setErrors(next)
    if (hasErrors(next)) return
    const result = await run()
    if (result?.ok) onSaved(result.value)
  }

  const nameError = errors.name ?? (error?.kind === 'conflict' ? error.message : error?.fieldErrors.name)
  const showBanner = error && !(error.kind === 'conflict' || Object.keys(error.fieldErrors).length > 0)

  return (
    <Modal
      title={label ? 'Edit label' : 'New label'}
      size="sm"
      onClose={onClose}
      locked={pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="label-form" variant="primary" loading={pending}>
            {label ? 'Save changes' : 'Create label'}
          </Button>
        </>
      }
    >
      <form id="label-form" className="form" onSubmit={onSubmit} noValidate>
        {showBanner && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} maxLength={50} required />
        <div className="field">
          <label className="field__label" htmlFor="label-color">
            Color
          </label>
          <div className="color-row">
            <input
              id="label-color-picker"
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : DEFAULT_COLOR}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              aria-label="Pick a color"
              className="color-input"
            />
            <input
              id="label-color"
              className="input"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-invalid={errors.color ? true : undefined}
              aria-describedby={errors.color ? 'label-color-error' : undefined}
              maxLength={7}
            />
          </div>
          {errors.color && (
            <p id="label-color-error" className="field__error" role="alert">
              {errors.color}
            </p>
          )}
        </div>
      </form>
    </Modal>
  )
}
