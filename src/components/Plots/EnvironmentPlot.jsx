import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Card, CardContent } from '../ui/card'
import { Toggle } from '../ui/toggle'
import { Thermometer } from 'lucide-react'
import { ChartTooltipContent } from '../SimulationChart'
import { UnitDropdown } from './UnitDropdown'
import { LineChart } from './LineChart'
import { TEMPERATURE_UNITS, fromKelvin } from './temperatureUnits'
import { PRESSURE_UNITS } from './pressureUnits'
import { TIME_RANGE_UNITS } from './timeRangeUnits'
import { buildEnvironmentSeries } from '../../utils/environmentSeries'
import { FIELD_LABEL, DROPDOWN_WRAPPER, DROPDOWN_BUTTON } from '../Mechanism/fieldStyles'
import { useChartTheme } from '../../theme/chartTheme'

const TEMPERATURE_COLOR = '#FAA119'
const AXIS_PADDING = { top: 20, bottom: 20 }

/**
 * EnvironmentPlot Component
 * Displays environmental conditions (temperature, pressure) over time
 */
export function EnvironmentPlot() {
  const chart = useChartTheme()
  const simulation = useSelector((state) => state.simulation)

  const [temperatureUnitId, setTemperatureUnitId] = useState('K')
  const [pressureUnitId, setPressureUnitId] = useState('Pa')
  const [timeUnitId, setTimeUnitId] = useState('hours')
  const [visibleMetrics, setVisibleMetrics] = useState(() => new Set(['temperature', 'pressure']))
  const showTemperature = visibleMetrics.has('temperature')
  const showPressure = visibleMetrics.has('pressure')

  const toggleMetric = (metric) => {
    setVisibleMetrics((prev) => {
      // Keep at least one metric visible
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

  // Solver-reported conditions at each output step, in the sidebar's selected units.
  const envData = useMemo(
    () =>
      buildEnvironmentSeries(simulation.results).map((point) => ({
        time: point.time / timeUnit.divisor,
        temperature: fromKelvin(point.temperature, temperatureUnitId),
        pressure: point.pressure / pressureUnit.divisor,
      })),
    [simulation.results, temperatureUnitId, pressureUnit, timeUnit]
  )

  const times = useMemo(() => envData.map((point) => point.time), [envData])
  const temperatureLabel = `Temperature (${temperatureUnitLabel})`
  const pressureLabel = `Pressure (${pressureUnit.label})`

  const series = useMemo(
    () => [
      ...(showTemperature
        ? [
            {
              key: 'temperature',
              name: temperatureLabel,
              color: TEMPERATURE_COLOR,
              values: envData.map((point) => point.temperature),
              axis: 'temperature',
            },
          ]
        : []),
      ...(showPressure
        ? [
            {
              key: 'pressure',
              name: pressureLabel,
              color: chart.primary,
              values: envData.map((point) => point.pressure),
              axis: 'pressure',
            },
          ]
        : []),
    ],
    [envData, showTemperature, showPressure, temperatureLabel, pressureLabel, chart.primary]
  )

  // Pressure moves to the left side when it is the only axis.
  const yAxes = useMemo(
    () => [
      ...(showTemperature
        ? [
            {
              id: 'temperature',
              side: 'left',
              label: temperatureLabel,
              color: TEMPERATURE_COLOR,
              labelColor: TEMPERATURE_COLOR,
              tickFontSize: 11,
              labelFontSize: 13,
              padding: AXIS_PADDING,
            },
          ]
        : []),
      ...(showPressure
        ? [
            {
              id: 'pressure',
              side: showTemperature ? 'right' : 'left',
              label: pressureLabel,
              color: chart.primary,
              labelColor: chart.primary,
              tickFontSize: 11,
              labelFontSize: 13,
              padding: AXIS_PADDING,
            },
          ]
        : []),
    ],
    [showTemperature, showPressure, temperatureLabel, pressureLabel, chart.primary]
  )

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
                    activeTrackClassName="bg-[#0057C2] dark:bg-[#42C0FF]"
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
              <div style={{ height: 600 }}>
                <LineChart
                  x={times}
                  series={series}
                  margin={{ top: 30, right: 40, left: 20, bottom: 10 }}
                  xAxis={{
                    type: 'category',
                    label: `Time (${timeAxisUnitLabel})`,
                    tickFontSize: 12,
                    labelFontSize: 14,
                  }}
                  yAxes={yAxes}
                  strokeWidth={2}
                  exportName="environment"
                  renderTooltip={({ label, payload }) => (
                    <ChartTooltipContent
                      active
                      payload={payload}
                      timeLabel={`${label?.toFixed(2)} ${timeAxisUnitLabel}`}
                      maxVisible={2}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnvironmentPlot
