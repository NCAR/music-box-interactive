// Conditions Redux Slice
// Manages the simulation time settings and the conditions table (see services/conditions/table)
import { createSlice } from '@reduxjs/toolkit'
import { emptyTable } from '../../services/conditions/table'
import { dropReactionColumns } from '../../services/conditions/rateColumns'
import { removeReaction } from './mechanismSlice'

const initialState = {
  // Basic Configuration
  basic: {
    duration: 250000, // seconds (~69 hours) - matches Python simulation
    timeStep: 200, // seconds
    outputFrequency: 10, // Store every 10 steps to reduce data points
  },

  // All conditions, from t=0 on: { times, columns: { [header]: (number | null)[] } }
  table: emptyTable(),

  // UI-only: maps each time value to its relevant reaction type(s); missing entries are universal.
  // Not used in the solver payload.
  rowReactionType: {},
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

    // Replaces the whole conditions table. Every edit builds the next table with the pure
    // functions in services/conditions/table and dispatches it here.
    setConditionsTable: (state, action) => {
      state.table = action.payload || emptyTable()
    },

    tagTimeRow: (state, action) => {
      const { time, typeId } = action.payload
      const key = String(time)
      const existing = state.rowReactionType[key]
      if (!Array.isArray(existing)) {
        state.rowReactionType[key] = [typeId]
      } else if (!existing.includes(typeId)) {
        existing.push(typeId)
      }
    },
    untagTimeRows: (state, action) => {
      action.payload.forEach((time) => {
        delete state.rowReactionType[String(time)]
      })
    },
    // Moves a row's type tag(s) when its time value itself is edited, so ReactionTab's
    // per-type visibility scoping survives the row moving to a new time.
    renameTimeRowTag: (state, action) => {
      const { oldTime, newTime } = action.payload
      const oldKey = String(oldTime)
      const tags = state.rowReactionType[oldKey]
      if (tags) {
        delete state.rowReactionType[oldKey]
        state.rowReactionType[String(newTime)] = tags
      }
    },
    // Replaces the row tags, e.g. after an upload removes or replaces rows.
    setRowReactionTypes: (state, action) => {
      state.rowReactionType = action.payload || {}
    },

    resetConditions: () => initialState,
  },
  extraReducers: (builder) => {
    // A deleted reaction takes its rate-parameter columns with it.
    builder.addCase(removeReaction, (state, action) => {
      state.table = dropReactionColumns(state.table, action.payload)
    })
  },
})

export const {
  setDuration,
  setTimeStep,
  setOutputFrequency,
  setConditionsTable,
  tagTimeRow,
  untagTimeRows,
  renameTimeRowTag,
  setRowReactionTypes,
  resetConditions,
} = conditionsSlice.actions

export default conditionsSlice.reducer
