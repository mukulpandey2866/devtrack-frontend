import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  /** Zero-based page index, as used by the backend. */
  page: number
  totalPages: number
  totalElements: number
  size: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({ page, totalPages, totalElements, size, onPageChange, disabled }: PaginationProps) {
  if (totalElements === 0) return null
  const from = page * size + 1
  const to = Math.min((page + 1) * size, totalElements)
  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary">
        Showing {from}-{to} of {totalElements}
      </p>
      <div className="pagination__controls">
        <Button
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 0}
          icon={<ChevronLeft className="icon" aria-hidden="true" />}
        >
          Previous
        </Button>
        <span className="pagination__page" aria-current="page">
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={disabled || page + 1 >= totalPages}>
          Next
          <ChevronRight className="icon" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
