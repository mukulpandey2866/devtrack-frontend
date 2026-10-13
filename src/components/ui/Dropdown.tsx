import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface DropdownItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface DropdownProps {
  /** Accessible name of the trigger button. */
  label: string
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'start' | 'end'
  triggerClassName?: string
}

/** Menu-button pattern: arrow keys move focus, Escape closes and restores focus to the trigger. */
export function Dropdown({ label, trigger, items, align = 'end', triggerClassName = 'icon-btn' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const enabled = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])
    const index = enabled.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      enabled[(index + 1) % enabled.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      enabled[(index - 1 + enabled.length) % enabled.length]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={label} className={`dropdown__menu dropdown__menu--${align}`} onKeyDown={onMenuKeyDown}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`dropdown__item${item.danger ? ' dropdown__item--danger' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                close(true)
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
