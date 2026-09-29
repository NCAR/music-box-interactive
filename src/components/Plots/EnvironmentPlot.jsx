import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Toggle } from '../ui/toggle'
import { Thermometer } from 'lucide-react'
import { ChartTooltipContent } from '../SimulationChart'
import { UnitDropdown } from './UnitDropdown'
import { TEMPERATURE_UNITS, fromKelvin } from './temperatureUnits'
import { PRESSURE_UNITS } from './pressureUnits'
import { TIME_RANGE_UNITS } from './timeRangeUnits'
import { FIELD_LABEL, DROPDOWN_WRAPPER, DROPDOWN_BUTTON } from '../Mechanism/fieldStyles'

/**
 * EnvironmentPlot Component
 * Displays environmental conditions (temperature, pressure) over time
 */
export function EnvironmentPlot() {
  const simulation = useSelector((state) => state.simulation)
  const conditions = useSelector((state) => state.conditions)

  const [temperatureUnitId, setTemperatureUnitId] = useState('K')
  const [pressureUnitId, setPressureUnitId] = useState('Pa')
  const [timeUnitId, setTimeUnitId] = useState('hours')
  const [visibleMetrics, setVisibleMetrics] = useState(() => new Set(['temperature', 'pressure']))
  const showTemperature = visibleMetrics.has('temperature')
  const showPressure = visibleMetrics.has('pressure')

  const toggleMetric = (metric) => {
    setVisibleMetrics((prev) => {
      // Keep at least one metric visible -- an empty chart isn't a useful state.
      if (prev.has(metric) && prev.size === 1) return prev
      const next = new Set(prev)
      if (next.has(metric)) next.delete(metric)
      else next.add(metric)
      return next
    })
  }
  const pressureUnit = PRESSURE_UNITS.find((u) => u.id === pressureUnitId) ?? PRESSURE_UNITS[0]
  const temperatureUnitLabel =
    TEMPERATURE_UNITS.find((u) => u.id === temperatureUnitId)?.label ?? 'K'
  const timeUnit = TIME_RANGE_UNITS.find((u) => u.id === timeUnitId) ?? TIME_RANGE_UNITS[1]
  const timeAxisUnitLabel = timeUnit.shortLabel

  // Evolving temperature and pressure points fed to the solver, sorted for step interpolation
  const evolvingPoints = useMemo(() => {
    const times = conditions.evolving?.times
    if (!Array.isArray(times) || times.length === 0) return []

    return times
      .map((time, index) => ({
        time,
        temperature: conditions.evolving.temperature?.[index],
        pressure: conditions.evolving.pressure?.[index],
      }))
      .filter((point) => typeof point.time === 'number' && Number.isFinite(point.time))
      .sort((a, b) => a.time - b.time)
  }, [conditions.evolving])

  const hasEvolvingConditions = Boolean(conditions.evolving?.enabled) && evolvingPoints.length > 0

  // Format environmental data, mirroring the solver's step interpolation
  // (most recent evolving value at or before each result's time), converted into the
  // sidebar's selected display units.
  const envData = useMemo(() => {
    if (!simulation.results) return []

    return simulation.results.map((result) => {
      let temperature = conditions.initial.temperature
      let pressure = conditions.initial.pressure

      if (hasEvolvingConditions) {
        for (const point of evolvingPoints) {
          if (point.time > result.time) break
          // A null entry means "not set at this point" (e.g. a row that only carried rate
          // parameters), not "set to nothing" -- it should leave the carried-forward value
          // alone rather than blanking it out.
          if (point.temperature != null) temperature = point.temperature
          if (point.pressure != null) pressure = point.pressure
        }
      }

      return {
        time: result.time / timeUnit.divisor,
        temperature: fromKelvin(temperature, temperatureUnitId),
        pressure: pressure / pressureUnit.divisor,
      }
    })
  }, [
    simulation.results,
    conditions.initial,
    hasEvolvingConditions,
    evolvingPoints,
    temperatureUnitId,
    pressureUnit,
    timeUnit,
  ])

  if (!simulation.results || simulation.status !== 'succeeded') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted">
            <div className="flex justify-center mb-2">
              <Thermometer className="w-12 h-12" />
            </div>
            <p>Run a simulation to see environmental condition plots</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Temperature & Pressure Profile */}
      <Card>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Sidebar */}
            <div className="w-full lg:w-[12rem] flex-shrink-0 space-y-5 pt-5">
              <div>
                <div className="flex flex-col gap-2">
                  <Toggle
                    checked={showTemperature}
                    label={<span className="inline-block w-24 text-left">Temperature</span>}
                    onChange={() => toggleMetric('temperature')}
                    size="sm"
                    activeTrackClassName="bg-[#FAA119]"
                  />
                  <Toggle
                    checked={showPressure}
                    label={<span className="inline-block w-24 text-left">Pressure</span>}
                    onChange={() => toggleMetric('pressure')}
                    size="sm"
                    activeTrackClassName="bg-[#0057C2]"
                  />
                </div>
              </div>

              <div>
                <div className="space-y-3">
                  <div>
                    <label className={FIELD_LABEL}>Time</label>
                    <UnitDropdown
                      unitId={timeUnitId}
                      onChange={setTimeUnitId}
                      units={TIME_RANGE_UNITS}
                      wrapperClassName={DROPDOWN_WRAPPER}
                      buttonClassName={DROPDOWN_BUTTON}
                      centerLabel
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Temperature</label>
                    <UnitDropdown
                      unitId={temperatureUnitId}
                      onChange={setTemperatureUnitId}
                      units={TEMPERATURE_UNITS}
                      wrapperClassName={DROPDOWN_WRAPPER}
                      buttonClassName={DROPDOWN_BUTTON}
                      centerLabel
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Pressure</label>
                    <UnitDropdown
                      unitId={pressureUnitId}
                      onChange={setPressureUnitId}
                      units={PRESSURE_UNITS}
                      wrapperClassName={DROPDOWN_WRAPPER}
                      buttonClassName={DROPDOWN_BUTTON}
                      centerLabel
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-w-0">
              <ResponsiveContainer width="100%" height={600}>
                <LineChart data={envData} margin={{ top: 30, right: 40, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D6D2" />
                  <XAxis
                    dataKey="time"
                    label={{
                      value: `Time (${timeAxisUnitLabel})`,
                      position: 'insideBottom',
                      offset: -5,
                      style: { fill: '#1f2937', fontWeight: 600, fontSize: 14 },
                    }}
                    stroke="#5f6368"
                    tick={{ fontSize: 12, fill: '#5f6368' }}
                  />
                  {showTemperature && (
                    <YAxis
                      yAxisId="temperature"
                      orientation="left"
                      label={{
                        value: `Temperature (${temperatureUnitLabel})`,
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#FAA119', fontWeight: 600, fontSize: 13 },
                      }}
                      stroke="#FAA119"
                      tick={{ fontSize: 11, fill: '#FAA119' }}
                      padding={{ top: 20, bottom: 20 }}
                    />
                  )}
                  {showPressure && (
                    <YAxis
                      yAxisId="pressure"
                      orientation={showTemperature ? 'right' : 'left'}
                      label={{
                        value: `Pressure (${pressureUnit.label})`,
                        angle: showTemperature ? 90 : -90,
                        position: showTemperature ? 'insideRight' : 'insideLeft',
                        style: { fill: '#0057C2', fontWeight: 600, fontSize: 13 },
                      }}
                      stroke="#0057C2"
                      tick={{ fontSize: 11, fill: '#0057C2' }}
                      padding={{ top: 20, bottom: 20 }}
                    />
                  )}
                  <Tooltip
                    wrapperStyle={{ zIndex: 10 }}
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active}
                        payload={payload}
                        timeLabel={`${label?.toFixed(2)} ${timeAxisUnitLabel}`}
                        maxVisible={2}
                      />
                    )}
                  />
                  {showTemperature && (
                    <Line
                      yAxisId="temperature"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#FAA119"
                      strokeWidth={2}
                      dot={false}
                      name={`Temperature (${temperatureUnitLabel})`}
                    />
                  )}
                  {showPressure && (
                    <Line
                      yAxisId="pressure"
                      type="monotone"
                      dataKey="pressure"
                      stroke="#0057C2"
                      strokeWidth={2}
                      dot={false}
                      name={`Pressure (${pressureUnit.label})`}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnvironmentPlot
