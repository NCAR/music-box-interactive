// Conditions Redux Slice
// Manages simulation conditions (basic, initial, evolving)
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Basic Configuration
  basic: {
    duration: 250000, // seconds (~69 hours) - matches Python simulation
    timeStep: 200, // seconds
    outputFrequency: 10, // Store every 10 steps to reduce data points
  },

  // Initial Conditions
  initial: {
    temperature: 298.15, // K
    pressure: 101325, // Pa
    concentrations: {},
  },

  // Evolving Conditions (time-series)
  evolving: {
    enabled: false,
    times: [], // array of time points
    temperature: [], // array of temperature values
    pressure: [], // array of pressure values
    interpolationMethod: 'linear', // 'linear' | 'step' | 'cubic'
    // Hidden evolving series such as PHOTO.* are preserved here even if the UI does not display them.
    additionalSeries: {},
    // Rate constants can also evolve
    rateConstants: {},
    // UI-only: maps each time value to its relevant reaction type(s); missing entries are universal.
    // Not used in the solver payload.
    rowReactionType: {},
  },

  hydration: {
    initialExampleId: null,
    evolvingExampleId: null,
  },

  conditions: {},
  exampleLoaded: true,
  source_file: {},

  // Rate Constants (photolysis rates, etc.)
  rateConstants: {},
}

export const conditionsSlice = createSlice({
  name: 'conditions',
  initialState,
  reducers: {
    // Basic configuration
    setDuration: (state, action) => {
      state.basic.duration = action.payload
    },
    setTimeStep: (state, action) => {
      state.basic.timeStep = action.payload
    },
    setOutputFrequency: (state, action) => {
      state.basic.outputFrequency = action.payload
    },

    // Initial conditions
    setTemperature: (state, action) => {
      state.initial.temperature = action.payload
    },
    setPressure: (state, action) => {
      state.initial.pressure = action.payload
    },
    setConcentrations: (state, action) => {
      state.initial.concentrations = action.payload
    },
    setConcentration: (state, action) => {
      const { species, value } = action.payload
      state.initial.concentrations[species] = value
    },
    removeConcentration: (state, action) => {
      delete state.initial.concentrations[action.payload]
    },

    // Rate constants
    setRateConstants: (state, action) => {
      state.rateConstants = action.payload
    },
    setRateConstant: (state, action) => {
      const { name, value } = action.payload
      state.rateConstants[name] = value
    },

    // Evolving conditions
    setEvolvingEnabled: (state, action) => {
      state.evolving.enabled = action.payload
    },
    setEvolvingTimes: (state, action) => {
      state.evolving.times = action.payload
    },
    setEvolvingTemperature: (state, action) => {
      state.evolving.temperature = action.payload
    },
    setEvolvingPressure: (state, action) => {
      state.evolving.pressure = action.payload
    },
    setInterpolationMethod: (state, action) => {
      state.evolving.interpolationMethod = action.payload
    },
    setEvolvingAdditionalSeries: (state, action) => {
      state.evolving.additionalSeries = action.payload || {}
    },
    tagEvolvingRow: (state, action) => {
      const { time, typeId } = action.payload
      state.evolving.rowReactionType ??= {}
      const key = String(time)
      const existing = state.evolving.rowReactionType[key]
      if (!Array.isArray(existing)) {
        state.evolving.rowReactionType[key] = [typeId]
      } else if (!existing.includes(typeId)) {
        existing.push(typeId)
      }
    },
    untagEvolvingRows: (state, action) => {
      state.evolving.rowReactionType ??= {}
      action.payload.forEach((time) => {
        delete state.evolving.rowReactionType[String(time)]
      })
    },
    // Moves a row's type tag(s) when its time value itself is edited, so ReactionTab's
    // per-type visibility scoping survives the row moving to a new time.
    renameEvolvingRowTag: (state, action) => {
      const { oldTime, newTime } = action.payload
      state.evolving.rowReactionType ??= {}
      const oldKey = String(oldTime)
      const tags = state.evolving.rowReactionType[oldKey]
      if (tags) {
        delete state.evolving.rowReactionType[oldKey]
        state.evolving.rowReactionType[String(newTime)] = tags
      }
    },

    markInitialHydrated: (state, action) => {
      state.hydration.initialExampleId = action.payload || null
    },
    markEvolvingHydrated: (state, action) => {
      state.hydration.evolvingExampleId = action.payload || null
    },

    // Set conditions json directly (for loading examples)
    setConditions: (state, action) => {
      state.conditions = action.payload
    },

    setExampleLoaded: (state, action) => {
      state.exampleLoaded = action.payload
    },

    setSourceFile: (state, action) => {
      state.source_file = action.payload
    },

    // Replaces the initial, rate-constant and evolving conditions with the result of a
    // conditions upload (see applyConditionsUpload). Marks the example hydrated, so the
    // hydration on MechanismPage does not overwrite the upload.
    applyConditionsData: (state, action) => {
      const { initial, rateConstants, evolving, exampleId } = action.payload
      state.initial = initial
      state.rateConstants = rateConstants
      state.evolving = evolving
      if (exampleId) {
        state.hydration.initialExampleId = exampleId
        state.hydration.evolvingExampleId = exampleId
      }
    },

    // Load full conditions (from example)
    loadConditions: (state, action) => {
      return { ...state, ...action.payload }
    },

    resetConditions: () => initialState,
  },
})

export const {
  setDuration,
  setTimeStep,
  setOutputFrequency,
  setTemperature,
  setPressure,
  setConcentrations,
  setConcentration,
  removeConcentration,
  setRateConstants,
  setRateConstant,
  setEvolvingEnabled,
  setEvolvingTimes,
  setEvolvingTemperature,
  setEvolvingPressure,
  setInterpolationMethod,
  setEvolvingAdditionalSeries,
  tagEvolvingRow,
  untagEvolvingRows,
  renameEvolvingRowTag,
  markInitialHydrated,
  markEvolvingHydrated,
  loadConditions,
  applyConditionsData,
  setConditions,
  setExampleLoaded,
  setSourceFile,
  resetConditions,
} = conditionsSlice.actions

export default conditionsSlice.reducer
