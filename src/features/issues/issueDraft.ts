const HEADING = 'Acceptance Criteria'

export function parseCriteria(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
}

export function criteriaToText(criteria: string[]): string {
  return criteria.join('\n')
}

/** Appends criteria under an "Acceptance Criteria" heading, skipping bullets already present. */
export function composeDescription(description: string, criteria: string[]): string {
  const base = description.trim()
  const existing = new Set(base.split('\n').map((line) => line.replace(/^\s*[-*]\s*/, '').trim()))
  const missing = criteria.filter((item) => !existing.has(item))
  if (missing.length === 0) return base

  const bullets = missing.map((item) => `- ${item}`).join('\n')
  const hasHeading = base.split('\n').some((line) => line.replace(/^#+\s*/, '').replace(/:$/, '').trim() === HEADING)
  if (hasHeading) return `${base}\n${bullets}`
  return base ? `${base}\n\n${HEADING}:\n${bullets}` : `${HEADING}:\n${bullets}`
}
