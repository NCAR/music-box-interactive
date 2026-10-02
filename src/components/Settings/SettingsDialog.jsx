import { Monitor, Moon, Sun } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { useTheme } from '../../theme/themeContext'

const ICON_CLASS = 'h-4 w-4'

const THEME_OPTIONS = [
  { id: 'system', label: 'System', icon: <Monitor className={ICON_CLASS} aria-hidden="true" /> },
  { id: 'light', label: 'Light', icon: <Sun className={ICON_CLASS} aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className={ICON_CLASS} aria-hidden="true" /> },
]

// The app settings. For now it holds the color theme.
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
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                  selected
                    ? 'border-assist-secondary-ring bg-assist-secondary font-semibold text-assist-secondary-foreground'
                    : 'border-border text-ink hover:bg-surface-hover'
                }`}
              >
                {icon}
                {label}
              </button>
            )
          })}
        </div>
      </section>
    </Dialog>
  )
}

export default SettingsDialog
