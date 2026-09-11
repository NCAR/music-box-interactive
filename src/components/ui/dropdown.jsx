import { useCallback, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useClickOutside } from '../../hooks/useClickOutside'

// A single-select dropdown rendered with custom DOM instead of a native <select>.
// @param {{value: string, label: string, disabled?: boolean, title?: string}[]} options
export function Dropdown({ value, options, onChange, className, menuClassName, placeholder }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  useClickOutside(containerRef, close, open)

  const selected = options.find((option) => option.value === value)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border-2 border-border bg-white px-3 py-2 text-left text-sm text-ink transition-colors focus:outline-none focus:border-action',
          className
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? ''}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg',
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
        </div>
      )}
    </div>
  )
}

export default Dropdown
