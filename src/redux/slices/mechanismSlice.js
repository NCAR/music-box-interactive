// Mechanism Redux Slice
// Manages chemical mechanism state (the uploaded/example config, edited in place)
import { createSelector, createSlice } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'
import { findSpeciesPhase } from '../../services/simulation/local/mechanism'
import { PHASE_PROPERTY_KEYS } from '../../services/simulation/local/speciesProperties'
import {
  reactionWithSpeciesIds,
  withSpeciesIds,
  withSpeciesNames,
} from '../../services/mechanism/speciesIds'

// The editor gives a species together with its phase and its phase-only properties (see
// withPhaseInfo). Species fields go on mechanism.species[]. The phase and the phase-only
// properties go on phases[].species[], which is the only record of them.
const splitSpecies = ({ phase, ...fields }) => {
  const speciesFields = {}
  const phaseFields = {}
  for (const [key, value] of Object.entries(fields)) {
    ;(PHASE_PROPERTY_KEYS.includes(key) ? phaseFields : speciesFields)[key] = value
  }
  return { phase, speciesFields, phaseFields }
}

const findOrAddPhase = (mechanism, name) => {
  mechanism.phases ??= []
  if (!mechanism.phases.some((phase) => phase.name === name)) {
    mechanism.phases.push({ name, species: [] })
  }
  return mechanism.phases.find((phase) => phase.name === name)
}

const setPhaseFields = (entry, phaseFields) => {
  for (const key of PHASE_PROPERTY_KEYS) {
    if (key in phaseFields) {
      entry[key] = phaseFields[key]
    } else {
      delete entry[key]
    }
  }
}

const initialState = {
  selectedMechanism: null,
  currentExample: null, // Track loaded example {id, name, description}

  // The full config: {'box model options', mechanism: {name, version, species, phases,
  // reactions}, conditions, ...}. Species/reactions are edited directly on config.mechanism --
  // there is no separate UI-only copy to keep in sync with this one. The mechanism refers to
  // species by their UI-only ids (see services/mechanism/speciesIds); selectNamedMechanism gives
  // the name-based view.
  config: {},
}

export const mechanismSlice = createSlice({
  name: 'mechanism',
  initialState,
  reducers: {
    setSelectedMechanism: (state, action) => {
      state.selectedMechanism = action.payload
    },
    setCurrentExample: (state, action) => {
      state.currentExample = action.payload
    },
    // A name-based config gets its species ids here. A config that has them keeps them.
    setConfig: {
      reducer: (state, action) => {
        state.config = action.payload
      },
      prepare: (config) => ({
        payload: config?.mechanism ? { ...config, mechanism: withSpeciesIds(config.mechanism) } : config,
      }),
    },
    // The new species gets its UI-only id here.
    addSpecies: {
      reducer: (state, action) => {
        const { phase, speciesFields, phaseFields } = splitSpecies(action.payload)
        const mechanism = (state.config.mechanism ??= {})
        mechanism.species ??= []
        mechanism.species.push(speciesFields)
        findOrAddPhase(mechanism, phase ?? 'gas').species.push({
          speciesId: speciesFields.id,
          ...phaseFields,
        })
      },
      prepare: (species) => ({ payload: { ...species, id: species.id ?? uuidv4() } }),
    },
    // Finds the species by its id, so the name can change too. A species moves only out of the
    // phase that the editor shows. A config can also list it in other phases, and it stays in
    // those.
    updateSpecies: (state, action) => {
      const { phase, speciesFields, phaseFields } = splitSpecies(action.payload)
      const mechanism = state.config.mechanism
      const { id } = speciesFields
      const index = mechanism?.species?.findIndex((s) => s.id === id) ?? -1
      if (index === -1) {
        return
      }
      mechanism.species[index] = speciesFields

      const current = findSpeciesPhase(mechanism.phases, id)
      const target = phase ?? current?.name ?? 'gas'
      let entry = current?.species.find((e) => e.speciesId === id)
      if (current?.name !== target) {
        const moved = { ...entry, speciesId: id }
        if (current) {
          current.species = current.species.filter((e) => e.speciesId !== id)
        }
        const targetPhase = findOrAddPhase(mechanism, target)
        targetPhase.species.push(moved)
        entry = targetPhase.species[targetPhase.species.length - 1]
      }
      setPhaseFields(entry, phaseFields)
    },
    // Takes the species id. The reactions that use the species keep their reference.
    removeSpecies: (state, action) => {
      const mechanism = state.config.mechanism
      if (!mechanism?.species) {
        return
      }
      mechanism.species = mechanism.species.filter((s) => s.id !== action.payload)
      for (const phase of mechanism.phases ?? []) {
        phase.species = phase.species.filter((e) => e.speciesId !== action.payload)
      }
    },
    // The add forms and the editors give reactions with species names; they are stored with
    // species ids.
    addReaction: (state, action) => {
      state.config.mechanism ??= {}
      state.config.mechanism.reactions ??= []
      state.config.mechanism.reactions.push(
        reactionWithSpeciesIds(action.payload, state.config.mechanism.species)
      )
    },
    updateReaction: (state, action) => {
      const list = state.config.mechanism?.reactions || []
      const index = list.findIndex((r) => r.id === action.payload.id)
      if (index !== -1) {
        list[index] = reactionWithSpeciesIds(action.payload, state.config.mechanism.species)
      }
    },
    removeReaction: (state, action) => {
      if (state.config.mechanism?.reactions) {
        state.config.mechanism.reactions = state.config.mechanism.reactions.filter(
          (r) => r.id !== action.payload
        )
      }
    },

    resetMechanism: () => initialState,
  },
})

export const {
  setSelectedMechanism,
  setCurrentExample,
  setConfig,
  addSpecies,
  updateSpecies,
  removeSpecies,
  addReaction,
  updateReaction,
  removeReaction,
  resetMechanism,
} = mechanismSlice.actions

export default mechanismSlice.reducer

const EMPTY_LIST = []
const EMPTY_MECHANISM = {}

// The mechanism with species names in place of species ids, for display. Memoized, so it is a
// stable value until the mechanism changes.
export const selectNamedMechanism = createSelector(
  [(state) => state.mechanism.config.mechanism],
  (mechanism) => (mechanism ? withSpeciesNames(mechanism) : EMPTY_MECHANISM)
)

export const selectNamedReactions = createSelector(
  [selectNamedMechanism],
  (mechanism) => mechanism.reactions ?? EMPTY_LIST
)
