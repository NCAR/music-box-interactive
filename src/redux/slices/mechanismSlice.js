// Mechanism Redux Slice
// Manages chemical mechanism state (the uploaded/example config, edited in place)
import { createSlice } from '@reduxjs/toolkit'
import { findSpeciesPhase } from '../../services/simulation/local/mechanism'
import { PHASE_PROPERTY_KEYS } from '../../services/simulation/local/speciesProperties'

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
  // there is no separate UI-only copy to keep in sync with this one.
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
    setConfig: (state, action) => {
      state.config = action.payload
    },
    addSpecies: (state, action) => {
      const { phase, speciesFields, phaseFields } = splitSpecies(action.payload)
      const mechanism = (state.config.mechanism ??= {})
      mechanism.species ??= []
      mechanism.species.push(speciesFields)
      findOrAddPhase(mechanism, phase ?? 'gas').species.push({
        name: speciesFields.name,
        ...phaseFields,
      })
    },
    // A species moves only out of the phase that the editor shows. A config can also list it in
    // other phases, and it stays in those.
    updateSpecies: (state, action) => {
      const { phase, speciesFields, phaseFields } = splitSpecies(action.payload)
      const mechanism = state.config.mechanism
      const index = mechanism?.species?.findIndex((s) => s.name === speciesFields.name) ?? -1
      if (index === -1) {
        return
      }
      mechanism.species[index] = speciesFields

      const { name } = speciesFields
      const current = findSpeciesPhase(mechanism.phases, name)
      const target = phase ?? current?.name ?? 'gas'
      let entry = current?.species.find((e) => e.name === name)
      if (current?.name !== target) {
        const moved = { ...entry, name }
        if (current) {
          current.species = current.species.filter((e) => e.name !== name)
        }
        const targetPhase = findOrAddPhase(mechanism, target)
        targetPhase.species.push(moved)
        entry = targetPhase.species[targetPhase.species.length - 1]
      }
      setPhaseFields(entry, phaseFields)
    },
    removeSpecies: (state, action) => {
      const mechanism = state.config.mechanism
      if (!mechanism?.species) {
        return
      }
      mechanism.species = mechanism.species.filter((s) => s.name !== action.payload)
      for (const phase of mechanism.phases ?? []) {
        phase.species = phase.species.filter((e) => e.name !== action.payload)
      }
    },
    addReaction: (state, action) => {
      state.config.mechanism ??= {}
      state.config.mechanism.reactions ??= []
      state.config.mechanism.reactions.push(action.payload)
    },
    updateReaction: (state, action) => {
      const list = state.config.mechanism?.reactions || []
      const index = list.findIndex((r) => r.id === action.payload.id)
      if (index !== -1) {
        list[index] = action.payload
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
