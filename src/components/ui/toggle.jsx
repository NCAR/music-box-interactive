// Track/thumb dimensions and the thumb's "on" offset.
const SIZES = {
  default: { track: 'h-6 w-11', thumb: 'h-5 w-5', on: 'translate-x-[1.375rem]' },
  sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', on: 'translate-x-[1.125rem]' },
}

// On/off switch (pill with a sliding thumb), shared by boolean species properties
// and other simple enable/disable fields.
export function Toggle({ checked, label, onChange, size = 'default' }) {
  const { track, thumb, on } = SIZES[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded text-sm font-semibold text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {label}
      <span
        className={`relative inline-flex ${track} flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-green-700' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block ${thumb} transform rounded-full bg-white shadow transition-transform ${
            checked ? on : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
