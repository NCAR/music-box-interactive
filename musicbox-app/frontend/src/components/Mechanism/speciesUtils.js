// components/mechanism/speciesUtils.js
export function addSpeciesIfValid({
  species,
  newSpeciesName,
  newMolWeight,
  dispatch,
  toast,
  addSpecies,
}) {
  if (!newSpeciesName) {
    toast({
      title: 'Error',
      description: 'Please enter a species name',
      variant: 'destructive',
    });
    return false;
  }

  const normalizedName = newSpeciesName.trim().toUpperCase();

  if (species.find(s => s.name === normalizedName)) {
    toast({
      title: 'Error',
      description: `Species "${normalizedName}" already exists`,
      variant: 'destructive',
    });
    return false;
  }

  const molWeight = newMolWeight ? parseFloat(newMolWeight) : 0.029;

  if (isNaN(molWeight)) {
    toast({
      title: 'Error',
      description: 'Molecular weight must be a valid number',
      variant: 'destructive',
    });
    return false;
  }

  dispatch(addSpecies({
    name: normalizedName,
    molecular_weight_kg_mol: molWeight,
    properties: {},
  }));


  toast({
    title: 'Success',
    description: `Species "${normalizedName}" added successfully`,
    variant: 'success',
  });

  return true;
}