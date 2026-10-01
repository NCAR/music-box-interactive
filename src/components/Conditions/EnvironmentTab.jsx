import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Toggle } from '../ui/toggle'
import { useNotify } from '@/hooks/use-notify'
import { setConditionsTable, untagTimeRows } from '../../redux/slices/conditionsSlice'
import { UnitDropdown } from '../Plots/UnitDropdown'
import { TIME_RANGE_UNITS } from '../Plots/timeRangeUnits'
import { TEMPERATURE_UNITS, toKelvin } from '../Plots/temperatureUnits'
import { PRESSURE_UNITS } from '../Plots/pressureUnits'
import { DENSITY_UNITS } from '../Plots/densityUnits'
import { LIST_CARD, LIST_CARD_CONTENT, FIELD_LABEL } from '../Mechanism/fieldStyles'
import { cn } from '../../lib/utils'
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_PRESSURE,
  TEMPERATURE_HEADER,
  PRESSURE_HEADER,
  DENSITY_HEADER,
  columnValues,
  commitTime as commitTableTime,
  ensureZeroTimeRow,
  insertTimeRow,
  removeTimeRows,
  rowHasConcentrations,
  setCell,
} from '../../services/conditions/table'

const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr] lg:items-start'

const NUMBER_INPUT =
  'w-72 h-9 px-2 border border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const DROPDOWN_WRAPPER = 'relative w-72 flex-shrink-0'
const DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-9 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50'

// An editable table cell
const CELL_INPUT =
  'w-full px-2 py-1 border rounded text-sm font-mono border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-action transition-colors duration-300'

// Matches each field's placeholder when the field is left blank.
const DEFAULT_TIME = 0

// GAS_CONSTANT (Avogadro x Boltzmann)
const GAS_CONSTANT = 8.31446261815324

function getUnit(units, unitId) {
  return units.find((u) => u.id === unitId) ?? units[0]
}

function idealGasDensity(pressure, temperature) {
  return pressure / (GAS_CONSTANT * temperature)
}

function formatConversion(value, decimals = 4) {
  return String(parseFloat(value.toFixed(decimals)))
}

/**
 * EnvironmentTab Component
 * Editor + list for time-varying environment conditions (time, temperature, pressure)
 */
export function EnvironmentTab() {
  const dispatch = useDispatch()
  const notify = useNotify()
  const table = useSelector((state) => state.conditions.table)
  const times = table.times
  const temperatures = columnValues(table, TEMPERATURE_HEADER)
  const pressures = columnValues(table, PRESSURE_HEADER)
  const densitySeries = table.columns[DENSITY_HEADER] ? columnValues(table, DENSITY_HEADER) : null

  const [unitIds, setUnitIds] = useState({
    time: 'seconds',
    temperature: 'K',
    pressure: 'Pa',
    density: 'mol_m3',
  })
  const [newTime, setNewTime] = useState('')
  const [newTemperature, setNewTemperature] = useState('')
  const [newPressure, setNewPressure] = useState('')
  const [densityEnabled, setDensityEnabled] = useState(false)
  const [newDensity, setNewDensity] = useState('')
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [rowDrafts, setRowDrafts] = useState({})
  const [justUpdatedCell, setJustUpdatedCell] = useState(null)

  const handleAdd = () => {
    const timeIsBlank = newTime.trim() === ''
    const temperatureIsBlank = newTemperature.trim() === ''
    const pressureIsBlank = newPressure.trim() === ''
    const densityIsBlank = newDensity.trim() === ''

    const rawTime = timeIsBlank ? DEFAULT_TIME : parseFloat(newTime)
    const rawTemperature = temperatureIsBlank ? DEFAULT_TEMPERATURE : parseFloat(newTemperature)
    const rawPressure = pressureIsBlank ? DEFAULT_PRESSURE : parseFloat(newPressure)
    const rawDensity = densityEnabled && !densityIsBlank ? parseFloat(newDensity) : null

    if (
      isNaN(rawTime) ||
      isNaN(rawTemperature) ||
      isNaN(rawPressure) ||
      (densityEnabled && !densityIsBlank && isNaN(rawDensity))
    ) {
      notify.invalidInput('All values must be valid numbers.')
      return
    }

    const timeUnit = getUnit(TIME_RANGE_UNITS, unitIds.time)
    const pressureUnit = getUnit(PRESSURE_UNITS, unitIds.pressure)
    const densityUnit = getUnit(DENSITY_UNITS, unitIds.density)

    const time = timeIsBlank ? rawTime : rawTime * timeUnit.divisor
    const temperature = temperatureIsBlank
      ? rawTemperature
      : toKelvin(rawTemperature, unitIds.temperature)
    const pressure = pressureIsBlank ? rawPressure : rawPressure * pressureUnit.divisor
    const density = densityEnabled
      ? !densityIsBlank
        ? rawDensity * densityUnit.divisor
        : idealGasDensity(pressure, temperature)
      : null

    if (times.includes(time)) {
      notify.error('Duplicate Time Point', `A time point already exists at t=${rawTime} ${timeUnit.label.toLowerCase()}.`)
      return
    }

    // t=0 is always the default starting point
    const withZero = time === 0 ? table : ensureZeroTimeRow(table)
    const { table: inserted, index } = insertTimeRow(withZero, time)
    let next = setCell(inserted, TEMPERATURE_HEADER, index, temperature)
    next = setCell(next, PRESSURE_HEADER, index, pressure)
    if (densityEnabled) next = setCell(next, DENSITY_HEADER, index, density)
    dispatch(setConditionsTable(next))

    notify.success('Time Point Added', `Added time point at t=${rawTime} ${timeUnit.label.toLowerCase()}.`)

    setNewTime('')
    setNewTemperature('')
    setNewPressure('')
    setNewDensity('')
  }

  const removableIndices = times.map((_, index) => index)

  const toggleSelected = (index) => {
    if (!removableIndices.includes(index)) return
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIndices((prev) => {
      const allCurrentlySelected =
        removableIndices.length > 0 && removableIndices.every((i) => prev.has(i))
      return allCurrentlySelected ? new Set() : new Set(removableIndices)
    })
  }

  const handleRemoveSelected = () => {
    const result = removeTimeRows(table, selectedIndices)
    if (!result) return

    dispatch(setConditionsTable(result.table))
    dispatch(untagTimeRows(result.removedTimes))

    notify.removed(result.removedCount === 1 ? 'Time Point Removed' : 'Time Points Removed', `Removed ${result.removedCount} time point${result.removedCount === 1 ? '' : 's'}.`)

    setSelectedIndices(new Set())
  }

  const cellKey = (field, index) => `${field}:${index}`

  const handleCellDraftChange = (field, index, value) => {
    setRowDrafts((prev) => ({ ...prev, [cellKey(field, index)]: value }))
  }

  const clearCellDraft = (field, index) => {
    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[cellKey(field, index)]
      return next
    })
  }

  // Brief visual confirmation that a cell's edit was committed
  const flashCell = (field, index) => {
    const key = cellKey(field, index)
    setJustUpdatedCell(key)
    setTimeout(() => {
      setJustUpdatedCell((current) => (current === key ? null : current))
    }, 600)
  }

  // Concentrations are stored in mol m-3, so changing the air density changes the displayed
  // ppth/ppm/ppb/ppt value. The stored concentration itself does not change.
  const warnIfConcentrationsAffected = (index) => {
    if (!rowHasConcentrations(table, index)) return
    notify.warning('Concentrations stay in mol m-3', 'This row has species concentrations. Their stored values in mol m-3 are unchanged, but their equivalents (ppm, ppb ...) will now display differently.')
  }

  const commitTemperature = (index, rawValue) => {
    const parsed = parseFloat(rawValue)
    if (isNaN(parsed)) {
      notify.invalidInput('Temperature must be a valid number.')
      return
    }
    clearCellDraft('temperature', index)
    if (temperatures[index] === parsed) return
    dispatch(setConditionsTable(setCell(table, TEMPERATURE_HEADER, index, parsed)))
    flashCell('temperature', index)
    warnIfConcentrationsAffected(index)
  }

  const commitPressure = (index, rawValue) => {
    const parsed = parseFloat(rawValue)
    if (isNaN(parsed)) {
      notify.invalidInput('Pressure must be a valid number.')
      return
    }
    clearCellDraft('pressure', index)
    if (pressures[index] === parsed) return
    dispatch(setConditionsTable(setCell(table, PRESSURE_HEADER, index, parsed)))
    flashCell('pressure', index)
    warnIfConcentrationsAffected(index)
  }

  const commitDensity = (index, rawValue) => {
    const isBlank = rawValue.trim() === ''
    const parsed = isBlank
      ? idealGasDensity(pressures[index], temperatures[index])
      : parseFloat(rawValue)
    if (!isBlank && isNaN(parsed)) {
      notify.invalidInput('Air number density must be a valid number.')
      return
    }
    clearCellDraft('density', index)
    if (columnValues(table, DENSITY_HEADER)[index] === parsed) return
    dispatch(setConditionsTable(setCell(table, DENSITY_HEADER, index, parsed)))
    flashCell('density', index)
    warnIfConcentrationsAffected(index)
  }

  const commitTime = (index, rawValue) => {
    const outcome = commitTableTime(table, index, rawValue)

    if (outcome.kind === 'invalid') {
      // Leave the draft in place so the invalid text stays visible to fix, instead of
      // silently reverting to the last committed value.
      notify.invalidInput('Time must be a valid number zero or greater.')
      return
    }

    clearCellDraft('time', index)

    if (outcome.kind === 'unchanged') return
    if (outcome.kind === 'duplicate') {
      notify.error('Duplicate Time Point', `A time point already exists at t=${outcome.newTime}s.`)
      return
    }

    const { result } = outcome
    dispatch(setConditionsTable(result.table))

    notify.success('Time Point Updated', `Moved time point to t=${result.newTime}s.`)
  }

  // Live “stored as” hints, shown only for non-base units.
  const parsedNewTime = parseFloat(newTime)
  const timeConversion =
    unitIds.time !== 'seconds' && newTime.trim() !== '' && !isNaN(parsedNewTime)
      ? `${formatConversion(parsedNewTime * getUnit(TIME_RANGE_UNITS, unitIds.time).divisor)} seconds`
      : null

  const parsedNewTemperature = parseFloat(newTemperature)
  const temperatureConversion =
    unitIds.temperature !== 'K' && newTemperature.trim() !== '' && !isNaN(parsedNewTemperature)
      ? `${formatConversion(toKelvin(parsedNewTemperature, unitIds.temperature))} K`
      : null

  const parsedNewPressure = parseFloat(newPressure)
  const pressureConversion =
    unitIds.pressure !== 'Pa' && newPressure.trim() !== '' && !isNaN(parsedNewPressure)
      ? `${formatConversion(parsedNewPressure * getUnit(PRESSURE_UNITS, unitIds.pressure).divisor)} Pa`
      : null

  const previewTemperature =
    newTemperature.trim() !== '' && !isNaN(parsedNewTemperature)
      ? toKelvin(parsedNewTemperature, unitIds.temperature)
      : DEFAULT_TEMPERATURE
  const previewPressure =
    newPressure.trim() !== '' && !isNaN(parsedNewPressure)
      ? parsedNewPressure * getUnit(PRESSURE_UNITS, unitIds.pressure).divisor
      : DEFAULT_PRESSURE
  const idealGasDensityPlaceholder = formatConversion(
    idealGasDensity(previewPressure, previewTemperature) / getUnit(DENSITY_UNITS, unitIds.density).divisor
  )

  return (
    <div className={EDITOR_GRID}>
      <Card className="w-fit">
        <CardHeader>
          <CardTitle>Environment condition</CardTitle>
          <CardDescription>Set temperature and pressure, with optional air density</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-72 mx-auto">
            <label className={FIELD_LABEL}>Time point</label>
            <div className="flex flex-col gap-2">
              <UnitDropdown
                unitId={unitIds.time}
                onChange={(id) => setUnitIds((prev) => ({ ...prev, time: id }))}
                units={TIME_RANGE_UNITS}
                wrapperClassName={DROPDOWN_WRAPPER}
                buttonClassName={DROPDOWN_BUTTON}
                centerLabel
              />
              <input
                type="text"
                inputMode="decimal"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="0"
                className={NUMBER_INPUT}
              />
              {timeConversion && <p className="text-xs text-gray-500 text-center">{timeConversion}</p>}
            </div>
          </div>

          <div className="w-72 mx-auto">
            <label className={FIELD_LABEL}>Temperature</label>
            <div className="flex flex-col gap-2">
              <UnitDropdown
                unitId={unitIds.temperature}
                onChange={(id) => setUnitIds((prev) => ({ ...prev, temperature: id }))}
                units={TEMPERATURE_UNITS}
                wrapperClassName={DROPDOWN_WRAPPER}
                buttonClassName={DROPDOWN_BUTTON}
                centerLabel
              />
              <input
                type="text"
                inputMode="decimal"
                value={newTemperature}
                onChange={(e) => setNewTemperature(e.target.value)}
                placeholder="298.15"
                className={NUMBER_INPUT}
              />
              {temperatureConversion && (
                <p className="text-xs text-gray-500 text-center">{temperatureConversion}</p>
              )}
            </div>
          </div>

          <div className="w-72 mx-auto">
            <label className={FIELD_LABEL}>Pressure</label>
            <div className="flex flex-col gap-2">
              <UnitDropdown
                unitId={unitIds.pressure}
                onChange={(id) => setUnitIds((prev) => ({ ...prev, pressure: id }))}
                units={PRESSURE_UNITS}
                wrapperClassName={DROPDOWN_WRAPPER}
                buttonClassName={DROPDOWN_BUTTON}
                centerLabel
              />
              <input
                type="text"
                inputMode="decimal"
                value={newPressure}
                onChange={(e) => setNewPressure(e.target.value)}
                placeholder="101325"
                className={NUMBER_INPUT}
              />
              {pressureConversion && (
                <p className="text-xs text-gray-500 text-center">{pressureConversion}</p>
              )}
            </div>
          </div>

          <div className="w-72 mx-auto">
            <Toggle
              checked={densityEnabled}
              label="Air number density"
              onChange={setDensityEnabled}
              size="sm"
            />
            {densityEnabled && (
              <div className="mt-2 flex flex-col gap-2">
                <UnitDropdown
                  unitId={unitIds.density}
                  onChange={(id) => setUnitIds((prev) => ({ ...prev, density: id }))}
                  units={DENSITY_UNITS}
                  wrapperClassName={DROPDOWN_WRAPPER}
                  buttonClassName={DROPDOWN_BUTTON}
                  centerLabel
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={newDensity}
                  onChange={(e) => setNewDensity(e.target.value)}
                  placeholder={idealGasDensityPlaceholder}
                  className={NUMBER_INPUT}
                />
                <p className="text-xs text-gray-500 text-center">
                  If left blank, the ideal gas law is used
                </p>
              </div>
            )}
          </div>
          <div className="h-0.5"/>
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleAdd}
              variant="assistSecondary"
              className="h-11 px-8 text-base rounded-lg bg-assist-secondary text-assist-secondary-foreground hover:bg-assist-secondary-hover">
              Add condition
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={LIST_CARD}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>
                {times.length} condition{times.length === 1 ? '' : 's'}
              </CardTitle>
            </div>
            {selectedIndices.size > 0 && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleRemoveSelected}
                className="rounded-lg bg-white text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                Remove selected ({selectedIndices.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={LIST_CARD_CONTENT}>
          {times.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No conditions added. Add your first condition on the left.
            </p>
          ) : (
            (() => {
              const hasDensityColumn = Array.isArray(densitySeries) && densitySeries.some((v) => v != null)
              const allSelected =
                removableIndices.length > 0 && removableIndices.every((i) => selectedIndices.has(i))

              return (
                <div className="border border-gray-200 rounded-lg overflow-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-assist-secondary text-assist-secondary-foreground">
                      <tr>
                        <th className="w-10 text-left px-4 py-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all conditions"
                            className="accent-assist-secondary-ring"
                          />
                        </th>
                        <th className="w-28 text-left px-4 py-2 font-semibold">Time (s)</th>
                        <th className="w-36 text-left px-4 py-2 font-semibold">Temperature (K)</th>
                        <th className="w-36 text-left px-4 py-2 font-semibold">Pressure (Pa)</th>
                        {hasDensityColumn && (
                          <th className="w-56 text-left px-4 py-2 font-semibold">Air number density (mol m-3)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {times.map((time, index) => {
                        const density = densitySeries?.[index]

                        return (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedIndices.has(index)}
                                onChange={() => toggleSelected(index)}
                                aria-label={`Select condition at t=${time}s`}
                                className="accent-assist-secondary-ring"
                              />
                            </td>
                            <td className="px-4 py-2 font-mono">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={rowDrafts[cellKey('time', index)] ?? formatConversion(time)}
                                onChange={(e) => handleCellDraftChange('time', index, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    commitTime(index, e.target.value)
                                    e.target.blur()
                                  }
                                }}
                                onBlur={(e) => commitTime(index, e.target.value)}
                                className={cn(
                                  CELL_INPUT,
                                  justUpdatedCell === cellKey('time', index) &&
                                    'border-action bg-assist-secondary'
                                )}
                              />
                            </td>
                            <td className="px-4 py-2 font-mono">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  rowDrafts[cellKey('temperature', index)] ??
                                  (temperatures[index] != null
                                    ? formatConversion(temperatures[index])
                                    : '')
                                }
                                onChange={(e) =>
                                  handleCellDraftChange('temperature', index, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    commitTemperature(index, e.target.value)
                                    e.target.blur()
                                  }
                                }}
                                onBlur={(e) => commitTemperature(index, e.target.value)}
                                className={cn(
                                  CELL_INPUT,
                                  justUpdatedCell === cellKey('temperature', index) &&
                                    'border-action bg-assist-secondary'
                                )}
                              />
                            </td>
                            <td className="px-4 py-2 font-mono">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  rowDrafts[cellKey('pressure', index)] ??
                                  (pressures[index] != null
                                    ? formatConversion(pressures[index])
                                    : '')
                                }
                                onChange={(e) =>
                                  handleCellDraftChange('pressure', index, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    commitPressure(index, e.target.value)
                                    e.target.blur()
                                  }
                                }}
                                onBlur={(e) => commitPressure(index, e.target.value)}
                                className={cn(
                                  CELL_INPUT,
                                  justUpdatedCell === cellKey('pressure', index) &&
                                    'border-action bg-assist-secondary'
                                )}
                              />
                            </td>
                            {hasDensityColumn && (
                              <td className="px-4 py-2 font-mono">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    rowDrafts[cellKey('density', index)] ??
                                    (density != null ? formatConversion(density) : '')
                                  }
                                  onChange={(e) =>
                                    handleCellDraftChange('density', index, e.target.value)
                                  }
                                  placeholder={
                                    pressures[index] != null && temperatures[index] != null
                                      ? formatConversion(
                                          idealGasDensity(pressures[index], temperatures[index])
                                        )
                                      : ''
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      commitDensity(index, e.target.value)
                                      e.target.blur()
                                    }
                                  }}
                                  onBlur={(e) => commitDensity(index, e.target.value)}
                                  className={cn(
                                    CELL_INPUT,
                                    justUpdatedCell === cellKey('density', index) &&
                                      'border-action bg-assist-secondary'
                                  )}
                                />
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EnvironmentTab
