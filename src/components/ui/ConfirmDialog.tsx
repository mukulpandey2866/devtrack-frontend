import { useAction } from '../../hooks/useAction'
import { Alert } from './Alert'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  /** Resolve to confirm success; the dialog closes only after the API call succeeds. */
  onConfirm: () => Promise<unknown>
  onClose: () => void
  tone?: 'danger' | 'primary'
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose, tone = 'danger' }: ConfirmDialogProps) {
  const { run, pending, error } = useAction(onConfirm)

  const confirm = async () => {
    const result = await run()
    if (result?.ok) onClose()
  }

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      locked={pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={tone} onClick={confirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="modal__message">{message}</p>
      {error && <Alert tone="error">{error.message}</Alert>}
    </Modal>
  )
}
