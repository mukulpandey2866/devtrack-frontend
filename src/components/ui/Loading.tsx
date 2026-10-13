import { LoaderCircle } from 'lucide-react'
import type { CSSProperties } from 'react'

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="spinner" role="status">
      <LoaderCircle className="icon spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Skeleton({ width, height, style }: { width?: string | number; height?: string | number; style?: CSSProperties }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height, ...style }} />
}

/** Placeholder rows for tables and lists while data loads. */
export function SkeletonRows({ rows = 5, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="skeleton-rows" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row">
          <Skeleton width="18%" height={14} />
          <Skeleton width="46%" height={14} />
          <Skeleton width="12%" height={14} />
        </div>
      ))}
    </div>
  )
}
