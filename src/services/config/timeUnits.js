import { SIMULATION_TIME_UNITS } from '../../components/Plots/timeRangeUnits'

// The 'box model options' key name of each Conditions > Time field.
const OPTION_NAMES = {
  duration: 'simulation length',
  timeStep: 'chemistry time step',
  outputFrequency: 'output time step',
}

// Each time unit that MusicBox reads, and the matching SIMULATION_TIME_UNITS id.
const CONFIG_UNIT_IDS = {
  s: 'seconds',
  sec: 'seconds',
  min: 'minutes',
  hr: 'hours',
  hour: 'hours',
  day: 'days',
}

// Returns the unit id of each time field in the box model options, for example
// { duration: 'days' }. A field without a known unit is left out.
export function readTimeUnits(boxModelOptions = {}) {
  const units = {}
  for (const [field, name] of Object.entries(OPTION_NAMES)) {
    for (const key of Object.keys(boxModelOptions)) {
      const match = key.match(/^(.+) \[(.+)\]$/)
      if (match && match[1] === name && CONFIG_UNIT_IDS[match[2]]) {
        units[field] = CONFIG_UNIT_IDS[match[2]]
      }
    }
  }
  return units
}

// Returns a copy of the box model options with each time in the unit that the user selected.
// The options from MusicBox.toJson() have each time in seconds. A time that does not convert
// exactly stays in seconds, so that the file gives the solver the same number of seconds.
export function writeTimeUnits(boxModelOptions, timeUnits = {}) {
  const renamed = {}
  for (const [field, name] of Object.entries(OPTION_NAMES)) {
    const unit = SIMULATION_TIME_UNITS.find((u) => u.id === timeUnits[field])
    if (unit && unit.divisor !== 1) renamed[`${name} [sec]`] = { name, unit }
  }
  return Object.fromEntries(
    Object.entries(boxModelOptions).map(([key, seconds]) => {
      const target = renamed[key]
      if (!target) return [key, seconds]
      const value = seconds / target.unit.divisor
      if (value * target.unit.divisor !== seconds) return [key, seconds]
      return [`${target.name} [${target.unit.configUnit}]`, value]
    })
  )
}
