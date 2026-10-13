import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS, formatDate } from '../../lib/format'
import type { IssueHistoryResponse } from '../../types/api'

const FIELD_LABELS: Record<string, string> = {
  title: 'title',
  description: 'description',
  issueType: 'type',
  priority: 'priority',
  status: 'status',
  dueDate: 'due date',
  estimatedHours: 'estimated hours',
  assignee: 'assignee',
  label: 'label',
}

function lookupValue(field: string, value: string | null, members: Map<string, string>): string {
  if (value === null || value === '') return 'none'
  switch (field) {
    case 'status':
      return STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? value
    case 'priority':
      return PRIORITY_LABELS[value as keyof typeof PRIORITY_LABELS] ?? value
    case 'issueType':
      return TYPE_LABELS[value as keyof typeof TYPE_LABELS] ?? value
    case 'dueDate':
      return formatDate(value)
    case 'assignee':
      return members.get(value) ?? 'a former member'
    default:
      return value
  }
}

/** Turns a history row into a sentence fragment; assignee values are user ids resolved via `members`. */
export function describeHistory(entry: IssueHistoryResponse, members: Map<string, string>): string {
  const { fieldName, oldValue, newValue } = entry
  if (fieldName === 'created') return `created this issue${newValue ? ` as ${newValue}` : ''}`
  if (fieldName === 'description') return 'updated the description'
  if (fieldName === 'assignee' || fieldName === 'label') {
    const noun = FIELD_LABELS[fieldName]
    if (oldValue === null && newValue !== null) return `added ${noun} ${lookupValue(fieldName, newValue, members)}`
    if (newValue === null && oldValue !== null) return `removed ${noun} ${lookupValue(fieldName, oldValue, members)}`
  }
  const label = FIELD_LABELS[fieldName] ?? fieldName
  return `changed ${label} from ${lookupValue(fieldName, oldValue, members)} to ${lookupValue(fieldName, newValue, members)}`
}
