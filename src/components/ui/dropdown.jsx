import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const MENU_MAX_HEIGHT_PX = 288 // max-h-72
const MENU_GAP_PX = 4 // mt-1

// Where the open menu goes: under the button, or above it when there is no room below. The menu
// is drawn on document.body (a portal) with a fixed position, so a scroll box around the button
// (a table, a card) cannot clip it.
function menuPosition(button) {
  const rect = button.getBoundingClientRect()
  const roomBelow = window.innerHeight - rect.bottom
  const openUp = roomBelow < MENU_MAX_HEIGHT_PX + MENU_GAP_PX && rect.top > roomBelow
  return {
    left: rect.left,
    width: rect.width,
    ...(openUp
      ? { bottom: window.innerHeight - rect.top + MENU_GAP_PX }
      : { top: rect.bottom + MENU_GAP_PX }),
  }
}

// A single-select dropdown rendered with custom DOM instead of a native <select>.
// @param {{value: string, label: string, disabled?: boolean, title?: string}[]} options
export function Dropdown({ value, options, onChange, className, menuClassName, placeholder }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  // Place the menu before it paints, and follow the button when the page or a box scrolls.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return undefined
    const place = () => setPosition(menuPosition(buttonRef.current))
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  // A click outside both the button and the menu closes it. The menu is in a portal, so it is
  // not inside the container.
  useEffect(() => {
    if (!open) return undefined
    const handleMouseDown = (e) => {
      if (containerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      close()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open, close])

  const selected = options.find((option) => option.value === value)

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border-2 border-border bg-white dark:bg-surface px-2 text-left text-sm text-ink transition-colors focus:outline-none focus:border-action',
          className
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? ''}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            // z-[60]: above the dialogs (z-50), so a dropdown inside a dialog stays visible.
            style={{ position: 'fixed', ...position, visibility: position ? 'visible' : 'hidden' }}
            className={cn(
              'z-[60] max-h-72 overflow-y-auto rounded-lg border border-border bg-white dark:bg-surface py-1 shadow-lg',
              menuClassName
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                title={option.title}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                  option.disabled
                    ? 'text-muted cursor-not-allowed'
                    : 'text-ink hover:bg-surface-hover'
                )}
              >
                <Check
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0',
                    option.value === value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}

export default Dropdown
