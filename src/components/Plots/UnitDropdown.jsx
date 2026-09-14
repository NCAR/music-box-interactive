import { useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { TIME_RANGE_UNITS } from './timeRangeUnits'

// Shared unit picker for fields
// Flux tab's time range
// Conditions tab's duration/time step/output time step
// Environment tabs' temperature/pressure/air density
export function UnitDropdown({
  unitId,
  onChange,
  units = TIME_RANGE_UNITS,
  wrapperClassName = 'relative',
  buttonClassName = 'flex items-center gap-1 w-full h-8 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50',
  centerLabel = false,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  useClickOutside(menuRef, () => setOpen(false), open)

  const unit = units.find((u) => u.id === unitId) ?? units[0]

  return (
    <div className={wrapperClassName} ref={menuRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonClassName}>
        {/* Balances the visible chevron below so the label sits centered rather than pushed left. */}
        {centerLabel && <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 invisible" />}
        <span className="flex-1 text-center">{unit.label}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg py-1">
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(u.id)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-gray-800 hover:bg-gray-100"
            >
              <Check
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  unitId === u.id ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {u.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
