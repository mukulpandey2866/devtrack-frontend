import { describe, expect, it } from 'vitest'
import { todayIso } from './format'
import { grantableRoles, projectPermissions, roleAtLeast } from './permissions'
import {
  validateDueDate,
  validateEmail,
  validateEstimatedHours,
  validateNewPassword,
  validateProjectKey,
} from './validation'

describe('validation', () => {
  it('validates emails', () => {
    expect(validateEmail('')).toBeDefined()
    expect(validateEmail('not-an-email')).toBeDefined()
    expect(validateEmail(' user@example.com ')).toBeUndefined()
  })

  it('enforces backend password limits', () => {
    expect(validateNewPassword('short')).toBeDefined()
    expect(validateNewPassword('longenough')).toBeUndefined()
    expect(validateNewPassword('é'.repeat(37))).toMatch(/72 bytes/)
  })

  it('validates the project key pattern', () => {
    expect(validateProjectKey('W')).toBeDefined()
    expect(validateProjectKey('1AB')).toBeDefined()
    expect(validateProjectKey('WEB2')).toBeUndefined()
    expect(validateProjectKey('ABCDEFGHIJK')).toBeDefined()
  })

  it('rejects past or malformed values the backend would reject', () => {
    expect(validateDueDate('2000-01-01')).toMatch(/past/)
    expect(validateDueDate('2000-01-01', '2000-01-01')).toBeUndefined()
    expect(validateDueDate(todayIso())).toBeUndefined()
    expect(validateEstimatedHours('4.25')).toBeUndefined()
    expect(validateEstimatedHours('4.255')).toBeDefined()
    expect(validateEstimatedHours('-1')).toBeDefined()
  })
})

describe('permissions', () => {
  it('orders roles', () => {
    expect(roleAtLeast('MANAGER', 'MEMBER')).toBe(true)
    expect(roleAtLeast('VIEWER', 'MEMBER')).toBe(false)
    expect(roleAtLeast(null, 'VIEWER')).toBe(false)
  })

  it('limits grantable roles for managers', () => {
    const all = ['VIEWER', 'MEMBER', 'MANAGER', 'OWNER'] as const
    expect(grantableRoles('OWNER', all)).toEqual([...all])
    expect(grantableRoles('MANAGER', all)).toEqual(['VIEWER', 'MEMBER'])
    expect(grantableRoles('MEMBER', all)).toEqual(['VIEWER'])
  })

  it('makes archived projects read-only', () => {
    const active = projectPermissions({ status: 'ACTIVE', currentUserRole: 'MEMBER' })
    expect(active.canCreateIssue).toBe(true)
    expect(active.canDeleteIssue).toBe(false)
    const archived = projectPermissions({ status: 'ARCHIVED', currentUserRole: 'OWNER' })
    expect(archived.canCreateIssue).toBe(false)
    expect(archived.canRestore).toBe(true)
    expect(archived.canArchive).toBe(false)
  })
})
