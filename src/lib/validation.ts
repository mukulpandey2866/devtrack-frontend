import { todayIso } from './format'

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PROJECT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]{1,9}$/
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

export const encoder = new TextEncoder()

export function validateEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Email is required.'
  if (email.length > 255) return 'Email must be at most 255 characters.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.'
  return undefined
}

export function validateLoginPassword(value: string): string | undefined {
  if (!value) return 'Password is required.'
  return undefined
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Password is required.'
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (encoder.encode(value).length > 72) return 'Password must not exceed 72 bytes.'
  return undefined
}

export function validateFullName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Full name is required.'
  if (name.length > 100) return 'Full name must be at most 100 characters.'
  return undefined
}

export function validateProjectName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Project name is required.'
  if (name.length > 150) return 'Project name must be at most 150 characters.'
  return undefined
}

export function validateProjectKey(value: string): string | undefined {
  if (!value.trim()) return 'Project key is required.'
  if (!PROJECT_KEY_PATTERN.test(value.trim())) return 'Use 2-10 letters or digits, starting with a letter.'
  return undefined
}

export function validateTitle(value: string): string | undefined {
  const title = value.trim()
  if (!title) return 'Title is required.'
  if (title.length > 200) return 'Title must be at most 200 characters.'
  return undefined
}

export function validateMaxLength(value: string, max: number, label: string): string | undefined {
  return value.length > max ? `${label} must be at most ${max} characters.` : undefined
}

/** Backend rejects past due dates whenever the date is set or changed. */
export function validateDueDate(value: string, original?: string | null): string | undefined {
  if (!value) return undefined
  if (value === original) return undefined
  if (value < todayIso()) return 'Due date must not be in the past.'
  return undefined
}

export function validateEstimatedHours(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(trimmed)) {
    return 'Use a non-negative number with at most 6 digits and 2 decimals.'
  }
  return undefined
}

export function validateComment(value: string): string | undefined {
  if (!value.trim()) return 'Comment cannot be empty.'
  if (value.length > 5000) return 'Comment must be at most 5000 characters.'
  return undefined
}

export function validateLabelName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Label name is required.'
  if (name.length > 50) return 'Label name must be at most 50 characters.'
  return undefined
}

export function validateHexColor(value: string): string | undefined {
  return HEX_COLOR_PATTERN.test(value) ? undefined : 'Use a hex color such as #1A2B3C.'
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}
