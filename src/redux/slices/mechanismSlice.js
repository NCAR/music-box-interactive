// Mechanism Redux Slice
// Manages chemical mechanism state (the uploaded/example config, edited in place)
import { createSlice } from '@reduxjs/toolkit'

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
      state.config.mechanism ??= {}
      state.config.mechanism.species ??= []
      state.config.mechanism.species.push(action.payload)
    },
    updateSpecies: (state, action) => {
      const list = state.config.mechanism?.species || []
      const index = list.findIndex((s) => s.name === action.payload.name)
      if (index !== -1) {
        list[index] = action.payload
      }
    },
    removeSpecies: (state, action) => {
      if (state.config.mechanism?.species) {
        state.config.mechanism.species = state.config.mechanism.species.filter(
          (s) => s.name !== action.payload
        )
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
