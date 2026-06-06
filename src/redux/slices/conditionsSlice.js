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
  },

  exampleFiles: {
    initial_conditions: {},
    initial_concentrations: {},
    initial_reaction_rates: {},
    boulder: {},
    data: [],
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

    setExampleFiles: (state, action) => {
      state.exampleFiles = {
        initial_conditions: {},
        initial_concentrations: {},
        initial_reaction_rates: {},
        boulder: {},
        data: [],
        ...(action.payload || {}),
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
  setExampleFiles,
  markInitialHydrated,
  markEvolvingHydrated,
  loadConditions,
  setConditions,
  setExampleLoaded,
  setSourceFile,
  resetConditions,
} = conditionsSlice.actions

export default conditionsSlice.reducer
