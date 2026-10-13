import { Sparkles } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { useAction } from '../../hooks/useAction'
import { aiDraftService } from './aiDraftService'
import { composeDescription, criteriaToText, parseCriteria } from './issueDraft'

interface IssueAiAssistantProps {
  projectId: string
  title: string
  description: string
  onApply: (draft: { title: string; description: string }) => void
}

interface DraftState {
  title: string
  description: string
  criteria: string
  labels: string[]
}

type Confirm = 'regenerate' | 'discard' | null

const snapshot = (draft: DraftState) => JSON.stringify([draft.title, draft.description, draft.criteria])

export function IssueAiAssistant({ projectId, title, description, onApply }: IssueAiAssistantProps) {
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [baseline, setBaseline] = useState('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [reminderLabels, setReminderLabels] = useState<string[]>([])

  const hasInput = Boolean(title.trim() || description.trim())
  const canGenerate = Boolean(projectId) && hasInput

  const { run, pending, error, reset } = useAction(() =>
    aiDraftService.draftIssue({ projectId, title: title.trim(), description: description.trim() }),
  )

  const generate = async () => {
    if (!canGenerate) return
    setConfirm(null)
    const result = await run()
    if (!result?.ok) return
    const next: DraftState = {
      title: result.value.title,
      description: result.value.description,
      criteria: criteriaToText(result.value.acceptanceCriteria),
      labels: result.value.suggestedLabels,
    }
    setDraft(next)
    setBaseline(snapshot(next))
    setReminderLabels([])
  }

  const dirty = draft !== null && snapshot(draft) !== baseline

  const close = () => {
    setDraft(null)
    setConfirm(null)
    reset()
  }

  const apply = () => {
    if (!draft || !draft.title.trim()) return
    onApply({
      title: draft.title.trim(),
      description: composeDescription(draft.description, parseCriteria(draft.criteria)),
    })
    setReminderLabels(draft.labels)
    close()
  }

  const requestRegenerate = () => (dirty ? setConfirm('regenerate') : void generate())
  const requestDiscard = () => (dirty ? setConfirm('discard') : close())

  // Enter inside a draft input must not submit the surrounding Create Issue form.
  const blockEnterSubmit = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault()
  }

  const errorAlert = error && (
    <Alert
      tone="error"
      title="Could not generate a draft"
      action={
        <Button size="sm" onClick={() => void generate()} disabled={pending || !canGenerate}>
          Retry
        </Button>
      }
    >
      {error.message} You can still fill in and create the issue manually.
    </Alert>
  )

  if (!draft) {
    return (
      <div className="ai-assist">
        <div className="ai-assist__bar">
          <Button
            variant="secondary"
            icon={<Sparkles className="icon" aria-hidden="true" />}
            loading={pending}
            disabled={!canGenerate}
            onClick={() => void generate()}
          >
            {pending ? 'Generating…' : 'Generate with AI'}
          </Button>
          <p className="field__hint" id="ai-assist-hint">
            {!projectId
              ? 'Select a project to use AI drafting.'
              : !hasInput
                ? 'Enter a rough title or description to generate a draft.'
                : 'Drafts the title and description for you to review. Nothing is saved.'}
          </p>
        </div>
        {errorAlert}
        {reminderLabels.length > 0 && (
          <Alert tone="info" title="Suggested labels">
            {reminderLabels.join(', ')}. Labels are not applied automatically; add them from the issue page after creating it.
          </Alert>
        )}
      </div>
    )
  }

  return (
    <section className="ai-assist ai-assist__panel" aria-label="AI draft review" onKeyDown={blockEnterSubmit}>
      <div className="ai-assist__heading">
        <Sparkles className="icon" aria-hidden="true" />
        <strong>AI draft</strong>
        <span className="field__hint">Review and edit before applying. Nothing is saved until you create the issue.</span>
      </div>
      {errorAlert}
      <TextField
        label="Draft title"
        value={draft.title}
        maxLength={200}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        disabled={pending}
      />
      <TextAreaField
        label="Draft description"
        value={draft.description}
        rows={4}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        disabled={pending}
      />
      <TextAreaField
        label="Acceptance criteria"
        hint="One per line. They are added to the description under an Acceptance Criteria heading."
        value={draft.criteria}
        rows={4}
        onChange={(e) => setDraft({ ...draft, criteria: e.target.value })}
        disabled={pending}
      />
      {draft.labels.length > 0 && (
        <div className="field">
          <span className="field__label">Suggested labels</span>
          <ul className="ai-assist__labels" aria-label="Suggested labels">
            {draft.labels.map((label) => (
              <li key={label}>
                <Badge tone="blue">{label}</Badge>
              </li>
            ))}
          </ul>
          <p className="field__hint">Suggestions only. Add labels from the issue page after it is created.</p>
        </div>
      )}
      {confirm && (
        <Alert
          tone="warning"
          title="Discard your edits?"
          action={
            <>
              <Button size="sm" onClick={() => setConfirm(null)}>
                Keep editing
              </Button>
              <Button size="sm" variant="danger" onClick={() => (confirm === 'regenerate' ? void generate() : close())}>
                {confirm === 'regenerate' ? 'Replace with new draft' : 'Discard draft'}
              </Button>
            </>
          }
        >
          {confirm === 'regenerate'
            ? 'Regenerating will replace the changes you made to this draft.'
            : 'Closing will lose the changes you made to this draft.'}
        </Alert>
      )}
      <div className="form__actions">
        <Button onClick={requestDiscard} disabled={pending} aria-label="Cancel draft">
          Cancel
        </Button>
        <Button onClick={requestRegenerate} loading={pending} disabled={!canGenerate}>
          Regenerate
        </Button>
        <Button variant="primary" onClick={apply} disabled={pending || !draft.title.trim()}>
          Apply draft
        </Button>
      </div>
    </section>
  )
}
