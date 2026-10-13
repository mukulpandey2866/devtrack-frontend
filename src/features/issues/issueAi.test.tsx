import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import type { AiIssueDraftResponse, IssueResponse, ProjectResponse } from '../../types/api'
import { aiDraftService } from './aiDraftService'
import { composeDescription, parseCriteria } from './issueDraft'
import { IssueFormDialog } from './IssueFormDialog'
import { issuesService } from './issuesService'

vi.mock('./aiDraftService', () => ({ aiDraftService: { draftIssue: vi.fn() } }))
vi.mock('./issuesService', () => ({ issuesService: { create: vi.fn(), update: vi.fn() } }))

const draftIssue = vi.mocked(aiDraftService.draftIssue)
const create = vi.mocked(issuesService.create)

const projects = [
  { id: 'p-1', projectKey: 'SAT001', name: 'Project Saturn' },
  { id: 'p-2', projectKey: 'JUP001', name: 'Mission Jupitor' },
] as ProjectResponse[]

const draft: AiIssueDraftResponse = {
  title: 'Handle repeated invalid login attempts safely',
  description: 'Investigate and resolve crashes after repeated failed login attempts.',
  acceptanceCriteria: ['Invalid credentials display an error.', 'Valid login continues to work.'],
  suggestedLabels: ['bug', 'authentication'],
}

function setup() {
  const onSaved = vi.fn()
  render(<IssueFormDialog projects={projects} onSaved={onSaved} onClose={vi.fn()} />)
  return { onSaved }
}

const generateButton = () => screen.getByRole('button', { name: 'Generate with AI' })

async function typeRoughInput() {
  await userEvent.type(screen.getByLabelText(/^Description/), 'login crashes')
}

describe('issueDraft helpers', () => {
  it('parses bullets and numbering out of criteria text', () => {
    expect(parseCriteria('- one\n2. two\n\n* three')).toEqual(['one', 'two', 'three'])
  })

  it('appends criteria under a heading without duplicating them', () => {
    const once = composeDescription('Body', ['A', 'B'])
    expect(once).toBe('Body\n\nAcceptance Criteria:\n- A\n- B')
    expect(composeDescription(once, ['A', 'B'])).toBe(once)
    expect(composeDescription(once, ['A', 'C'])).toBe(`${once}\n- C`)
  })
})

describe('AI issue assistant in the create issue form', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the AI action disabled until there is rough input', async () => {
    setup()
    expect(generateButton()).toBeDisabled()
    await typeRoughInput()
    expect(generateButton()).toBeEnabled()
  })

  it('sends the selected project, title and description to the backend', async () => {
    draftIssue.mockResolvedValue(draft)
    setup()
    await userEvent.selectOptions(screen.getByLabelText(/^Project/), 'p-2')
    await userEvent.type(screen.getByLabelText(/^Title/), 'Login bug')
    await typeRoughInput()
    await userEvent.click(generateButton())
    await waitFor(() =>
      expect(draftIssue).toHaveBeenCalledWith({ projectId: 'p-2', title: 'Login bug', description: 'login crashes' }),
    )
    expect(await screen.findByRole('region', { name: 'AI draft review' })).toBeInTheDocument()
  })

  it('shows a loading state and prevents duplicate requests', async () => {
    let resolve: (value: AiIssueDraftResponse) => void = () => {}
    draftIssue.mockReturnValue(new Promise((r) => (resolve = r)))
    setup()
    await typeRoughInput()
    await userEvent.click(generateButton())
    expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Generating/ }))
    expect(draftIssue).toHaveBeenCalledTimes(1)
    resolve(draft)
    expect(await screen.findByRole('region', { name: 'AI draft review' })).toBeInTheDocument()
  })

  it('shows an error, keeps the form values, and allows retry', async () => {
    draftIssue.mockRejectedValueOnce(new ApiError('AI is unavailable', { kind: 'server', status: 503 }))
    setup()
    await userEvent.type(screen.getByLabelText(/^Title/), 'My title')
    await typeRoughInput()
    await userEvent.click(generateButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('AI is unavailable')
    expect(screen.getByLabelText(/^Title/)).toHaveValue('My title')
    expect(screen.getByLabelText(/^Description/)).toHaveValue('login crashes')

    draftIssue.mockResolvedValueOnce(draft)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('region', { name: 'AI draft review' })).toBeInTheDocument()
  })

  it('applies the draft, keeps other fields, shows labels as suggestions, and does not save', async () => {
    draftIssue.mockResolvedValue(draft)
    setup()
    await userEvent.selectOptions(screen.getByLabelText(/^Type/), 'BUG')
    await userEvent.selectOptions(screen.getByLabelText(/^Priority/), 'CRITICAL')
    await userEvent.type(screen.getByLabelText(/^Estimated hours/), '3')
    await typeRoughInput()
    await userEvent.click(generateButton())

    const panel = await screen.findByRole('region', { name: 'AI draft review' })
    expect(within(panel).getByText('bug')).toBeInTheDocument()
    expect(within(panel).getByText('authentication')).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: 'Apply draft' }))
    expect(screen.queryByRole('region', { name: 'AI draft review' })).not.toBeInTheDocument()

    expect(screen.getByLabelText(/^Title/)).toHaveValue(draft.title)
    expect(screen.getByLabelText(/^Description/)).toHaveValue(
      `${draft.description}\n\nAcceptance Criteria:\n- Invalid credentials display an error.\n- Valid login continues to work.`,
    )
    expect(screen.getByLabelText(/^Type/)).toHaveValue('BUG')
    expect(screen.getByLabelText(/^Priority/)).toHaveValue('CRITICAL')
    expect(screen.getByLabelText(/^Estimated hours/)).toHaveValue('3')
    expect(screen.getByText(/Labels are not applied automatically/)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('creates the issue only through the normal Create issue action, without AI fields', async () => {
    draftIssue.mockResolvedValue({ ...draft, acceptanceCriteria: [] })
    create.mockResolvedValue({ id: 'i-1' } as IssueResponse)
    const { onSaved } = setup()
    await typeRoughInput()
    await userEvent.click(generateButton())
    await userEvent.click(await screen.findByRole('button', { name: 'Apply draft' }))
    expect(create).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create).toHaveBeenCalledWith('p-1', {
      title: draft.title,
      description: draft.description,
      issueType: 'TASK',
      priority: 'MEDIUM',
      dueDate: undefined,
      estimatedHours: undefined,
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('asks before discarding edits on cancel, and closes cleanly when unedited', async () => {
    draftIssue.mockResolvedValue(draft)
    setup()
    await typeRoughInput()
    await userEvent.click(generateButton())
    const panel = await screen.findByRole('region', { name: 'AI draft review' })

    await userEvent.type(within(panel).getByLabelText(/^Draft title/), ' edited')
    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel draft' }))
    expect(screen.getByText('Discard your edits?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('region', { name: 'AI draft review' })).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel draft' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard draft' }))
    expect(screen.queryByRole('region', { name: 'AI draft review' })).not.toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('regenerates from the draft panel', async () => {
    draftIssue.mockResolvedValueOnce(draft).mockResolvedValueOnce({ ...draft, title: 'Second draft' })
    setup()
    await typeRoughInput()
    await userEvent.click(generateButton())
    await userEvent.click(await screen.findByRole('button', { name: 'Regenerate' }))
    await waitFor(() => expect(screen.getByLabelText(/^Draft title/)).toHaveValue('Second draft'))
    expect(draftIssue).toHaveBeenCalledTimes(2)
    expect(create).not.toHaveBeenCalled()
  })
})
