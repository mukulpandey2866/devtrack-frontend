import type { LabelResponse } from '../../types/api'

export function LabelChip({ label }: { label: Pick<LabelResponse, 'name' | 'color'> }) {
  return (
    <span className="label-chip">
      <span className="label-chip__dot" style={{ backgroundColor: label.color }} aria-hidden="true" />
      {label.name}
    </span>
  )
}
