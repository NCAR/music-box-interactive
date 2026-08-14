// Simulation Redux Slice
// Manages simulation execution and results
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  status: 'idle', // 'idle' | 'loading' | 'running' | 'succeeded' | 'failed'
  results: null,
  excludedResults: null,
  error: null,
  metadata: null,
}

export const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload
    },
    setResults: (state, action) => {
      state.results = action.payload
    },
    setExcludedResults: (state, action) => {
      state.excludedResults = action.payload
    },
    setMetadata: (state, action) => {
      state.metadata = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearSimulation: (state) => {
      state.status = 'idle'
      state.results = null
      state.excludedResults = null
      state.error = null
      state.metadata = null
    },
    resetSimulation: () => initialState,
  },
})

export const { setStatus, setResults, setExcludedResults, setMetadata, setError, clearSimulation, resetSimulation } =
  simulationSlice.actions

export default simulationSlice.reducer
