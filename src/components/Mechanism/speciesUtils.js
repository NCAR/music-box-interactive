export function addSpeciesIfValid({
  species,
  newSpeciesName,
  newSpeciesPhase,
  newSpeciesProperties = {},
  speciesProperties = [],
  dispatch,
  notify,
  addSpecies,
}) {
  if (!newSpeciesName) {
    notify.invalidInput('Please enter a species name.')
    return false
  }

  const normalizedName = newSpeciesName.trim()

  if (species.find((s) => s.name === normalizedName)) {
    notify.error('Duplicate Species', `Species "${normalizedName}" already exists.`)
    return false
  }

  // Properties are keyed by pill name. Store them under the solver's key to avoid later translation.
  // All properties are optional. The blank fields are omitted rather than assigned defaults.
  const stored = {}

  for (const [pill, rawValue] of Object.entries(newSpeciesProperties)) {
    const field = speciesProperties.find((f) => f.pill === pill)
    if (!field) {
      continue
    }

    if (field.type === 'boolean') {
      stored[field.key] = Boolean(rawValue)
      continue
    }

    const trimmedValue = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    if (trimmedValue === '' || trimmedValue === undefined || trimmedValue === null) {
      continue
    }

    const parsedValue = Number.parseFloat(trimmedValue)
    if (Number.isNaN(parsedValue)) {
      notify.invalidInput(`${field.label} must be a valid number.`)
      return false
    }

    stored[field.key] = parsedValue
  }

  dispatch(
    addSpecies({
      name: normalizedName,
      phase: newSpeciesPhase || 'gas',
      ...stored,
    })
  )

  notify.success('Species Added', `Added species "${normalizedName}".`)

  return true
}
