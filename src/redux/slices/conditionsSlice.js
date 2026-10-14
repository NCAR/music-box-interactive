// Conditions Redux Slice
// Manages the simulation time settings and the conditions table (see services/conditions/table)
import { createSlice } from '@reduxjs/toolkit'
import { emptyTable } from '../../services/conditions/table'
import { dropReactionColumns } from '../../services/conditions/rateColumns'
import { dropSpeciesColumn } from '../../services/conditions/speciesColumns'
import { removeReaction, removeSpecies } from './mechanismSlice'

const initialState = {
  // Basic Configuration
  basic: {
    duration: 600, // seconds (10 minutes)
    timeStep: 30, // seconds: the chemistry time step
    outputFrequency: 60, // seconds: the output time step (1 minute)
  },
  // The display unit of each basic field. The values above stay in seconds. A downloaded
  // config writes each time in this unit (see services/config/timeUnits).
  timeUnits: {
    duration: 'hours',
    timeStep: 'seconds',
    outputFrequency: 'seconds',
  },
  // The display unit of each Environment tab field, for the add form and the table columns.
  // The table stays in SI units.
  environmentUnits: {
    time: 'seconds',
    temperature: 'K',
    pressure: 'Pa',
    density: 'mol_m3',
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
    // payload: { field, unitId }, for example { field: 'duration', unitId: 'days' }
    setTimeUnit: (state, action) => {
      state.timeUnits[action.payload.field] = action.payload.unitId
    },
    // payload: { field, unitId }, for example { field: 'pressure', unitId: 'hPa' }
    setEnvironmentUnit: (state, action) => {
      state.environmentUnits[action.payload.field] = action.payload.unitId
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

    // The Environment units are display preferences, so a reset keeps them.
    resetConditions: (state) => ({ ...initialState, environmentUnits: state.environmentUnits }),
  },
  extraReducers: (builder) => {
    // A deleted reaction takes its rate-parameter columns with it.
    builder.addCase(removeReaction, (state, action) => {
      state.table = dropReactionColumns(state.table, action.payload)
    })
    // A deleted species takes its concentration column with it.
    builder.addCase(removeSpecies, (state, action) => {
      state.table = dropSpeciesColumn(state.table, action.payload)
    })
  },
})

export const {
  setDuration,
  setTimeStep,
  setOutputFrequency,
  setTimeUnit,
  setEnvironmentUnit,
  setConditionsTable,
  tagTimeRow,
  untagTimeRows,
  renameTimeRowTag,
  setRowReactionTypes,
  resetConditions,
} = conditionsSlice.actions

export default conditionsSlice.reducer
