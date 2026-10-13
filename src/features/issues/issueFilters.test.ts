import { describe, expect, it } from 'vitest'
import type { IssueHistoryResponse } from '../../types/api'
import { DEFAULT_ISSUE_LIST_STATE, parseIssueSearch, toListParams, writeIssueSearch } from './issueFilters'
import { describeHistory } from './issueHistoryFormat'

describe('issue list URL state', () => {
  it('round-trips filters and preserves unrelated params', () => {
    const base = new URLSearchParams('tab=issues&project=abc')
    const written = writeIssueSearch(base, {
      ...DEFAULT_ISSUE_LIST_STATE,
      page: 2,
      q: ' login ',
      status: ['TODO', 'DONE'],
      priority: ['HIGH'],
      assigneeId: 'u1',
    })
    expect(written.get('project')).toBe('abc')
    expect(written.getAll('status')).toEqual(['TODO', 'DONE'])

    const parsed = parseIssueSearch(written)
    expect(parsed).toMatchObject({ page: 2, q: 'login', status: ['TODO', 'DONE'], priority: ['HIGH'], assigneeId: 'u1' })
  })

  it('ignores invalid values from the URL', () => {
    const parsed = parseIssueSearch(new URLSearchParams('status=NOPE&status=DONE&page=-4&sort=evil'))
    expect(parsed.status).toEqual(['DONE'])
    expect(parsed.page).toBe(0)
    expect(parsed.sort).toBe(DEFAULT_ISSUE_LIST_STATE.sort)
  })

  it('builds API params without empty filters', () => {
    const params = toListParams({ ...DEFAULT_ISSUE_LIST_STATE, status: ['TODO'] })
    expect(params).toMatchObject({ page: 0, status: ['TODO'], q: undefined, assigneeId: undefined })
  })
})

describe('describeHistory', () => {
  const entry = (patch: Partial<IssueHistoryResponse>): IssueHistoryResponse => ({
    id: '1',
    issueId: 'i',
    changedBy: null,
    fieldName: 'status',
    oldValue: null,
    newValue: null,
    changedAt: '2026-01-01T00:00:00Z',
    ...patch,
  })

  it('formats status changes with labels', () => {
    expect(describeHistory(entry({ oldValue: 'TODO', newValue: 'IN_PROGRESS' }), new Map())).toBe(
      'changed status from To do to In progress',
    )
  })

  it('resolves assignee ids to member names', () => {
    const members = new Map([['u1', 'Ada Lovelace']])
    expect(describeHistory(entry({ fieldName: 'assignee', newValue: 'u1' }), members)).toBe('added assignee Ada Lovelace')
    expect(describeHistory(entry({ fieldName: 'assignee', oldValue: 'gone' }), members)).toBe(
      'removed assignee a former member',
    )
  })
})
