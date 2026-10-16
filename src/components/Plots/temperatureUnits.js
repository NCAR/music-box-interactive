export const TEMPERATURE_UNITS = [
  { id: 'K', label: 'K' },
  { id: 'C', label: '°C' },
  { id: 'F', label: '°F' },
]

export function toKelvin(value, unitId) {
  if (unitId === 'C') return value + 273.15
  if (unitId === 'F') return ((value - 32) * 5) / 9 + 273.15
  return value
}

export function fromKelvin(kelvin, unitId) {
  if (unitId === 'C') return kelvin - 273.15
  if (unitId === 'F') return ((kelvin - 273.15) * 9) / 5 + 32
  return kelvin
}
