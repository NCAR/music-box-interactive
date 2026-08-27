// components/mechanism/speciesUtils.js
export function addSpeciesIfValid({
  species,
  newSpeciesName,
  newSpeciesPhase,
  newSpeciesProperties = {},
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

  const { 'Molecular weight': rawMolWeight, 'Diffusion coefficient': rawDiffusionCoefficient, ...restProperties } =
    newSpeciesProperties

  const molWeight = rawMolWeight && rawMolWeight.trim() ? parseFloat(rawMolWeight) : 0.029

  if (isNaN(molWeight)) {
    toast({
      title: 'Error',
      description: 'Molecular weight must be a valid number',
      variant: 'destructive',
    })
    return false
  }

  const diffusionCoefficient =
    rawDiffusionCoefficient && rawDiffusionCoefficient.trim()
      ? Number.parseFloat(rawDiffusionCoefficient)
      : 1e-5

  if (Number.isNaN(diffusionCoefficient)) {
    toast({
      title: 'Error',
      description: 'Diffusion coefficient must be a valid number',
      variant: 'destructive',
    })
    return false
  }

  const properties = {}
  for (const [name, rawValue] of Object.entries(restProperties)) {
    const trimmedValue = rawValue.trim()
    if (!trimmedValue) {
      continue
    }

    const parsedValue = Number.parseFloat(trimmedValue)
    if (Number.isNaN(parsedValue)) {
      toast({
        title: 'Error',
        description: `${name} must be a valid number`,
        variant: 'destructive',
      })
      return false
    }

    properties[name] = parsedValue
  }

  dispatch(
    addSpecies({
      name: normalizedName,
      molecular_weight_kg_mol: molWeight,
      'diffusion coefficient [m2 s-1]': diffusionCoefficient,
      phase: newSpeciesPhase || 'Gas',
      properties,
    })
  )

  toast({
    title: 'Success',
    description: `Species "${normalizedName}" added successfully`,
    variant: 'success',
  })

  return true
}
