import { Monitor, Moon, Sun } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Dropdown } from '../ui/dropdown'
import { useTheme } from '../../theme/themeContext'
import { useRateParameterUnits } from '../../hooks/rateParameterUnitContext'
import {
  RATE_UNIT_PARAMETERS,
  RATE_UNIT_SYSTEMS,
  genericRateUnitLabel,
} from '../../utils/rateParameterUnits'
import { getReactionTypeLabel } from '../Mechanism/reactions/reactionRegistry'
import { FormulaText } from '../Mechanism/FormulaText'

const ICON_CLASS = 'h-4 w-4'

const THEME_OPTIONS = [
  { id: 'system', label: 'System', icon: <Monitor className={ICON_CLASS} aria-hidden="true" /> },
  { id: 'light', label: 'Light', icon: <Sun className={ICON_CLASS} aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className={ICON_CLASS} aria-hidden="true" /> },
]

const OPTION_CLASS = (selected) =>
  `flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
    selected
      ? 'border-assist-secondary-ring bg-assist-secondary font-semibold text-assist-secondary-foreground'
      : 'border-border text-ink hover:bg-surface-hover'
  }`

const RATE_UNIT_OPTIONS = RATE_UNIT_SYSTEMS.map(({ id, label }) => ({ value: id, label }))

// The display unit of each rate parameter that has a concentration unit. The mechanism always
// stores SI values.
function RateParameterUnitsSection() {
  const { units, setUnit, setAllUnits, resetUnits } = useRateParameterUnits()
  const allIds = Object.values(units).flatMap((parameters) => Object.values(parameters))

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-ink">Rate parameter units</h3>
      <p className="mt-0.5 mb-3 text-xs text-muted">
        The reaction editors show and accept these units. The mechanism and the downloaded
        configuration always use SI units.
      </p>
      <div role="radiogroup" aria-label="All rate parameter units" className="flex gap-2">
        {RATE_UNIT_SYSTEMS.map(({ id, label }) => {
          const selected = allIds.every((unitId) => unitId === id)
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setAllUnits(id)}
              className={OPTION_CLASS(selected)}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-[max-content_max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        {Object.entries(RATE_UNIT_PARAMETERS).flatMap(([type, parameters]) =>
          Object.entries(parameters).map(([key, offset]) => (
            <div key={`${type}-${key}`} className="contents">
              <span className="text-sm text-ink">{getReactionTypeLabel(type)}</span>
              <span className="font-mono text-sm text-muted">{key}</span>
              <div className="flex min-w-0 flex-col">
                <Dropdown
                  value={units[type][key]}
                  options={RATE_UNIT_OPTIONS}
                  onChange={(unitId) => setUnit(type, key, unitId)}
                  className="h-8"
                />
                <span className="mt-0.5 text-xs text-muted">
                  <FormulaText text={genericRateUnitLabel(units[type][key], offset)} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" size="sm" onClick={resetUnits}>
          Reset to defaults
        </Button>
      </div>
    </section>
  )
}

// The app settings: the color theme and the rate parameter units.
export function SettingsDialog({ onClose }) {
  const { preference, setPreference } = useTheme()

  return (
    <Dialog
      title="Settings"
      onClose={onClose}
      className="max-w-md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <section>
        <h3 className="text-sm font-semibold text-ink">Theme</h3>
        <p className="mt-0.5 mb-3 text-xs text-muted">
          Follow your system setting, or choose light or dark.
        </p>
        <div role="radiogroup" aria-label="Color theme" className="flex gap-2">
          {THEME_OPTIONS.map(({ id, label, icon }) => {
            const selected = preference === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPreference(id)}
                className={OPTION_CLASS(selected)}
              >
                {icon}
                {label}
              </button>
            )
          })}
        </div>
      </section>
      <RateParameterUnitsSection />
    </Dialog>
  )
}

export default SettingsDialog
