import { v4 as uuidv4 } from 'uuid'

// Species have a UI-only id, like reactions. Inside the app, everything refers to a species by
// that id, so a rename changes one field and breaks no link:
//   - mechanism.species[]          { id, name, ...properties }
//   - reaction components          { speciesId, coefficient }   (reactants, products, ...)
//   - a SURFACE reaction           'gas-phase species id': <speciesId>
//   - phases[].species[]           { speciesId, ...phase properties }
//   - conditions table             CONC#<speciesId>              (see services/conditions)
//
// The configuration knows nothing about these ids: the solver payload, the config download and
// upload, the conditions files and the results download all use species names. withSpeciesIds
// converts a name-based mechanism when it comes in; withSpeciesNames gives the name-based view
// back for display and for the configuration.

// Component arrays supported by a reaction, varying by reaction type.
export const COMPONENT_KEYS = [
  'reactants',
  'products',
  'gas-phase products',
  'alkoxy products',
  'nitrate products',
]

export const SURFACE_SPECIES_KEY = 'gas-phase species'
export const SURFACE_SPECIES_ID_KEY = 'gas-phase species id'

const isObject = (value) => value !== null && typeof value === 'object'

// The id of each species, by name.
const idsByName = (species = []) => new Map(species.filter((s) => s?.id).map((s) => [s.name, s.id]))

// The name of each species, by id.
export const speciesNamesById = (species = []) =>
  new Map((species ?? []).filter((s) => s?.id).map((s) => [s.id, s.name]))

// --- names -> ids -------------------------------------------------------------------------

// A component with a speciesId in place of the name. A name that matches no species stays as
// it is, so nothing is lost; the solver then reports the unknown species.
function componentToId(component, ids) {
  if (!isObject(component) || component.speciesId || !ids.has(component.name)) return component
  const { name, ...rest } = component
  return { speciesId: ids.get(name), ...rest }
}

// A reaction with ids in place of species names. Already-converted parts are kept.
export function reactionWithSpeciesIds(reaction, species) {
  if (!isObject(reaction)) return reaction
  const ids = idsByName(species)
  const next = { ...reaction }
  COMPONENT_KEYS.forEach((key) => {
    if (Array.isArray(next[key])) next[key] = next[key].map((c) => componentToId(c, ids))
  })
  const surfaceSpecies = next[SURFACE_SPECIES_KEY]
  if (typeof surfaceSpecies === 'string' && ids.has(surfaceSpecies)) {
    delete next[SURFACE_SPECIES_KEY]
    next[SURFACE_SPECIES_ID_KEY] = ids.get(surfaceSpecies)
  }
  return next
}

function phaseEntryToId(entry, ids) {
  const named = typeof entry === 'string' ? { name: entry } : entry
  if (!isObject(named) || named.speciesId || !ids.has(named.name)) return named
  const { name, ...rest } = named
  return { speciesId: ids.get(name), ...rest }
}

// The mechanism with an id on every species and ids in every species reference. It can run
// again on its own output: species that have an id keep it.
export function withSpeciesIds(mechanism) {
  if (!isObject(mechanism)) return mechanism
  const species = (mechanism.species ?? []).map((s) =>
    isObject(s) && !s.id ? { ...s, id: uuidv4() } : s
  )
  const ids = idsByName(species)
  return {
    ...mechanism,
    ...(mechanism.species ? { species } : {}),
    ...(mechanism.reactions
      ? { reactions: mechanism.reactions.map((r) => reactionWithSpeciesIds(r, species)) }
      : {}),
    ...(mechanism.phases
      ? {
          phases: mechanism.phases.map((phase) => ({
            ...phase,
            species: (phase.species ?? []).map((entry) => phaseEntryToId(entry, ids)),
          })),
        }
      : {}),
  }
}

// --- ids -> names -------------------------------------------------------------------------

function componentToName(component, names) {
  if (!isObject(component) || !component.speciesId) return component
  const { speciesId, ...rest } = component
  return { name: names.get(speciesId), ...rest }
}

// A reaction with species names in place of ids. The reaction keeps its own id.
export function reactionWithSpeciesNames(reaction, names) {
  if (!isObject(reaction)) return reaction
  const next = { ...reaction }
  COMPONENT_KEYS.forEach((key) => {
    if (Array.isArray(next[key])) next[key] = next[key].map((c) => componentToName(c, names))
  })
  if (SURFACE_SPECIES_ID_KEY in next) {
    next[SURFACE_SPECIES_KEY] = names.get(next[SURFACE_SPECIES_ID_KEY])
    delete next[SURFACE_SPECIES_ID_KEY]
  }
  return next
}

// The name-based view of a mechanism. The species and reactions keep their UI-only ids, so the
// display can still key on them; toConfigMechanism removes the species ids as well.
export function withSpeciesNames(mechanism) {
  if (!isObject(mechanism)) return mechanism
  const names = speciesNamesById(mechanism.species)
  return {
    ...mechanism,
    ...(mechanism.reactions
      ? { reactions: mechanism.reactions.map((r) => reactionWithSpeciesNames(r, names)) }
      : {}),
    ...(mechanism.phases
      ? {
          phases: mechanism.phases.map((phase) => ({
            ...phase,
            species: (phase.species ?? []).map((entry) => componentToName(entry, names)),
          })),
        }
      : {}),
  }
}

// The mechanism as the configuration has it: species names everywhere and no species ids.
// Reactions keep their id here; serializeReaction removes it.
export function toConfigMechanism(mechanism) {
  const named = withSpeciesNames(mechanism)
  if (!isObject(named) || !named.species) return named
  return { ...named, species: named.species.map(({ id: _id, ...rest }) => rest) }
}

// The reactions (as Redux stores them, with species ids) that use the species, as a reactant
// or as a product.
export function reactionsUsingSpecies(reactions = [], speciesId) {
  return reactions.filter(
    (reaction) =>
      reaction?.[SURFACE_SPECIES_ID_KEY] === speciesId ||
      COMPONENT_KEYS.some((key) =>
        (reaction?.[key] ?? []).some((component) => component?.speciesId === speciesId)
      )
  )
}
