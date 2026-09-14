import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Toggle } from '../ui/toggle'
import { useToast } from '@/hooks/use-toast'
import {
  setEvolvingEnabled,
  setEvolvingTimes,
  setEvolvingTemperature,
  setEvolvingPressure,
  setEvolvingAdditionalSeries,
} from '../../redux/slices/conditionsSlice'
import { UnitDropdown } from '../Plots/UnitDropdown'
import { TIME_RANGE_UNITS } from '../Plots/timeRangeUnits'
import { TEMPERATURE_UNITS, toKelvin } from '../Plots/temperatureUnits'
import { PRESSURE_UNITS } from '../Plots/pressureUnits'
import { DENSITY_UNITS } from '../Plots/densityUnits'
import { LIST_CARD, LIST_CARD_CONTENT, FIELD_LABEL } from '../Mechanism/fieldStyles'

// Air density is optional, so its values are stored in the evolving slice's generic
// additionalSeries map, alongside hidden series like PHOTO.*, instead of
// getting a dedicated array field.
const DENSITY_SERIES_KEY = 'AIR.density.kg_m3'

// Unlike the Species editor's equal-width columns, the left column fits its content (like TimeTab),
// while the right column expands to fill the remaining space.
const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr] lg:items-start'

const NUMBER_INPUT =
  'w-72 h-9 px-2 border border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const DROPDOWN_WRAPPER = 'relative w-72 flex-shrink-0'
const DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-9 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50'

// Matches each field's placeholder when the field is left blank.
const DEFAULT_TIME = 0
const DEFAULT_TEMPERATURE = 298.15
const DEFAULT_PRESSURE = 101325
const DEFAULT_DENSITY = 1.225

function getUnit(units, unitId) {
  return units.find((u) => u.id === unitId) ?? units[0]
}

function formatConversion(value, decimals = 4) {
  return String(parseFloat(value.toFixed(decimals)))
}

function insertAdditionalSeriesValue(series, insertIndex, value = null) {
  return Object.fromEntries(
    Object.entries(series || {}).map(([name, values]) => {
      const nextValues = Array.isArray(values) ? [...values] : []
      nextValues.splice(insertIndex, 0, value)
      return [name, nextValues]
    })
  )
}

function removeAdditionalSeriesValues(series, removeIndices) {
  return Object.fromEntries(
    Object.entries(series || {}).map(([name, values]) => [
      name,
      (Array.isArray(values) ? values : []).filter((_, index) => !removeIndices.has(index)),
    ])
  )
}

/**
 * EnvironmentTab Component
 * Editor + list for time-varying environment conditions (time, temperature, pressure)
 */
export function EnvironmentTab() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const evolving = useSelector((state) => state.conditions.evolving)

  const [unitIds, setUnitIds] = useState({
    time: 'seconds',
    temperature: 'K',
    pressure: 'Pa',
    density: 'kg_m3',
  })
  const [newTime, setNewTime] = useState('')
  const [newTemperature, setNewTemperature] = useState('')
  const [newPressure, setNewPressure] = useState('')
  const [densityEnabled, setDensityEnabled] = useState(false)
  const [newDensity, setNewDensity] = useState('')
  const [selectedIndices, setSelectedIndices] = useState(new Set())

  const handleAdd = () => {
    const timeIsBlank = newTime.trim() === ''
    const temperatureIsBlank = newTemperature.trim() === ''
    const pressureIsBlank = newPressure.trim() === ''
    const densityIsBlank = newDensity.trim() === ''

    const rawTime = timeIsBlank ? DEFAULT_TIME : parseFloat(newTime)
    const rawTemperature = temperatureIsBlank ? DEFAULT_TEMPERATURE : parseFloat(newTemperature)
    const rawPressure = pressureIsBlank ? DEFAULT_PRESSURE : parseFloat(newPressure)
    const rawDensity = densityEnabled
      ? densityIsBlank
        ? DEFAULT_DENSITY
        : parseFloat(newDensity)
      : null

    if (
      isNaN(rawTime) ||
      isNaN(rawTemperature) ||
      isNaN(rawPressure) ||
      (densityEnabled && isNaN(rawDensity))
    ) {
      toast({
        title: 'Invalid Input',
        description: 'All values must be valid numbers',
        variant: 'destructive',
      })
      return
    }

    const timeUnit = getUnit(TIME_RANGE_UNITS, unitIds.time)
    const pressureUnit = getUnit(PRESSURE_UNITS, unitIds.pressure)
    const densityUnit = getUnit(DENSITY_UNITS, unitIds.density)

    // Blank fields fall back to a default already expressed in base units (seconds/K/Pa/kg·m⁻³),
    // so it must bypass unit conversion rather than being treated as a value in the selected unit.
    const time = timeIsBlank ? rawTime : rawTime * timeUnit.divisor
    const temperature = temperatureIsBlank
      ? rawTemperature
      : toKelvin(rawTemperature, unitIds.temperature)
    const pressure = pressureIsBlank ? rawPressure : rawPressure * pressureUnit.divisor
    const density = densityEnabled ? (densityIsBlank ? rawDensity : rawDensity * densityUnit.divisor) : null

    if (evolving.times.includes(time)) {
      toast({
        title: 'Duplicate Time Point',
        description: `A condition already exists at t=${rawTime} ${timeUnit.label.toLowerCase()}`,
        variant: 'destructive',
      })
      return
    }

    const newTimes = [...evolving.times, time].sort((a, b) => a - b)
    const insertIndex = newTimes.indexOf(time)

    const newTemps = [...evolving.temperature]
    newTemps.splice(insertIndex, 0, temperature)

    const newPresses = [...evolving.pressure]
    newPresses.splice(insertIndex, 0, pressure)

    let newAdditionalSeries = insertAdditionalSeriesValue(evolving.additionalSeries, insertIndex)

    if (densityEnabled) {
      const existingDensitySeries = Array.isArray(evolving.additionalSeries?.[DENSITY_SERIES_KEY])
        ? evolving.additionalSeries[DENSITY_SERIES_KEY]
        : new Array(evolving.times.length).fill(null)
      const nextDensitySeries = [...existingDensitySeries]
      nextDensitySeries.splice(insertIndex, 0, density)
      newAdditionalSeries = { ...newAdditionalSeries, [DENSITY_SERIES_KEY]: nextDensitySeries }
    }

    dispatch(setEvolvingEnabled(true))
    dispatch(setEvolvingTimes(newTimes))
    dispatch(setEvolvingTemperature(newTemps))
    dispatch(setEvolvingPressure(newPresses))
    dispatch(setEvolvingAdditionalSeries(newAdditionalSeries))

    toast({
      title: 'Condition Added',
      description: `Added condition at time ${rawTime} ${timeUnit.label.toLowerCase()}`,
      variant: 'success',
    })

    setNewTime('')
    setNewTemperature('')
    setNewPressure('')
    setNewDensity('')
  }

  const toggleSelected = (index) => {
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
    setSelectedIndices((prev) =>
      prev.size === evolving.times.length
        ? new Set()
        : new Set(evolving.times.map((_, index) => index))
    )
  }

  const handleRemoveSelected = () => {
    if (selectedIndices.size === 0) return

    const removedCount = selectedIndices.size
    const newTimes = evolving.times.filter((_, i) => !selectedIndices.has(i))
    const newTemps = evolving.temperature.filter((_, i) => !selectedIndices.has(i))
    const newPresses = evolving.pressure.filter((_, i) => !selectedIndices.has(i))
    const newAdditionalSeries = removeAdditionalSeriesValues(evolving.additionalSeries, selectedIndices)

    dispatch(setEvolvingTimes(newTimes))
    dispatch(setEvolvingTemperature(newTemps))
    dispatch(setEvolvingPressure(newPresses))
    dispatch(setEvolvingAdditionalSeries(newAdditionalSeries))

    toast({
      title: removedCount === 1 ? 'Condition Removed' : 'Conditions Removed',
      description: `Removed ${removedCount} condition${removedCount === 1 ? '' : 's'}`,
      variant: 'delete',
    })

    setSelectedIndices(new Set())
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
              label="Air density"
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
                  placeholder="1.225"
                  className={NUMBER_INPUT}
                />
              </div>
            )}
          </div>
          <div className="h-0.5"/>
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleAdd}
              variant="assistSecondary"
              className="h-9 px-8 text-base">
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
                {evolving.times.length} condition{evolving.times.length === 1 ? '' : 's'}
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
          {evolving.times.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No conditions added. Add your first condition on the left.
            </p>
          ) : (
            (() => {
              const densitySeries = evolving.additionalSeries?.[DENSITY_SERIES_KEY]
              const hasDensityColumn = Array.isArray(densitySeries) && densitySeries.some((v) => v != null)
              const allSelected = selectedIndices.size === evolving.times.length

              return (
                <div className="border border-gray-200 rounded-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-assist-secondary text-assist-secondary-foreground">
                      <tr>
                        <th className="w-10 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all conditions"
                            className="accent-green-700"
                          />
                        </th>
                        <th className="text-left px-4 py-2 font-semibold">Time (s)</th>
                        <th className="text-left px-4 py-2 font-semibold">Temperature (K)</th>
                        <th className="text-left px-4 py-2 font-semibold">Pressure (Pa)</th>
                        {hasDensityColumn && (
                          <th className="text-left px-4 py-2 font-semibold">Air density (kg/m³)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {evolving.times.map((time, index) => {
                        const density = densitySeries?.[index]

                        return (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedIndices.has(index)}
                                onChange={() => toggleSelected(index)}
                                aria-label={`Select condition at t=${time}s`}
                                className="accent-green-700"
                              />
                            </td>
                            <td className="px-4 py-2 font-mono">{formatConversion(time)}</td>
                            <td className="px-4 py-2 font-mono">
                              {formatConversion(evolving.temperature[index])}
                            </td>
                            <td className="px-4 py-2 font-mono">
                              {formatConversion(evolving.pressure[index])}
                            </td>
                            {hasDensityColumn && (
                              <td className="px-4 py-2 font-mono">
                                {density != null ? formatConversion(density) : '—'}
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
