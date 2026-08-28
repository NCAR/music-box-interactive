// components/mechanism/speciesUtils.js
export function addSpeciesIfValid({
  species,
  newSpeciesName,
  newSpeciesPhase,
  newSpeciesProperties = {},
  speciesProperties = [],
  dispatch,
  toast,
  addSpecies,
}) {
  if (!newSpeciesName) {
    toast({
      title: 'Error',
      description: 'Please enter a species name',
      variant: 'destructive',
    })
    return false
  }

  const normalizedName = newSpeciesName.trim().toUpperCase()

  if (species.find((s) => s.name === normalizedName)) {
    toast({
      title: 'Error',
      description: `Species "${normalizedName}" already exists`,
      variant: 'destructive',
    })
    return false
  }

  // Properties arrive keyed by pill name; store them under the solver's own key so nothing has
  // to be translated later. Every property is optional -- a blank field means "not set" and is
  // simply omitted, rather than being filled in with an invented default.
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
      toast({
        title: 'Error',
        description: `${field.label} must be a valid number`,
        variant: 'destructive',
      })
      return false
    }

    stored[field.key] = parsedValue
  }

  dispatch(
    addSpecies({
      name: normalizedName,
      phase: newSpeciesPhase || 'Gas',
      ...stored,
    })
  )

  toast({
    title: 'Success',
    description: `Species "${normalizedName}" added successfully`,
    variant: 'success',
  })

  return true
}
