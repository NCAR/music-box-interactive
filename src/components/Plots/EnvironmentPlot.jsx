import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Thermometer, Info } from 'lucide-react'

/**
 * EnvironmentPlot Component
 * Displays environmental conditions (temperature, pressure) over time
 */
export function EnvironmentPlot() {
  const simulation = useSelector((state) => state.simulation)
  const conditions = useSelector((state) => state.conditions)

  // Evolving temperature/pressure points actually fed to the solver, sorted for step interpolation
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
  // (most recent evolving value at or before each result's time)
  const envData = useMemo(() => {
    if (!simulation.results) return []

    return simulation.results.map((result) => {
      let temperature = conditions.initial.temperature
      let pressure = conditions.initial.pressure

      if (hasEvolvingConditions) {
        for (const point of evolvingPoints) {
          if (point.time > result.time) break
          if (point.temperature !== undefined) temperature = point.temperature
          if (point.pressure !== undefined) pressure = point.pressure
        }
      }

      return {
        timeSeconds: result.time,
        timeHours: result.time / 3600,
        temperature,
        pressure,
      }
    })
  }, [simulation.results, conditions.initial, hasEvolvingConditions, evolvingPoints])

  if (!simulation.results || simulation.status !== 'succeeded') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-white-500">
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
      {/* Temperature Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature Profile</CardTitle>
          <CardDescription>Temperature over simulation time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={envData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" />
              <XAxis
                dataKey="timeHours"
                label={{
                  value: 'Time (hours)',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fill: '#FFFFFF', fontWeight: 400 },
                }}
                stroke="#FFFFFF"
                tick={{ fontSize: 12, fill: '#FFFFFF' }}
              />
              <YAxis
                label={{
                  value: 'Temperature (K)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#FFFFFF', fontWeight: 400 },
                }}
                stroke="#FFFFFF"
                tick={{ fontSize: 12, fill: '#FFFFFF' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Temperature (K)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pressure Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Pressure Profile</CardTitle>
          <CardDescription>Pressure over simulation time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={envData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timeHours"
                label={{
                  value: 'Time (hours)',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fill: '#FFFFFF', fontWeight: 400 },
                }}
                stroke="#FFFFFF"
                tick={{ fontSize: 12, fill: '#FFFFFF' }}
              />
              <YAxis
                label={{
                  value: 'Pressure (Pa)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#FFFFFF', fontWeight: 400 },
                }}
                stroke="#FFFFFF"
                tick={{ fontSize: 12, fill: '#FFFFFF' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Pressure (Pa)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div
        className={`border rounded-lg p-3 text-xs ${hasEvolvingConditions ? 'bg-green-900/20 border-green-400/50' : 'bg-blue-900/20 border-blue-400/50'}`}
      >
        <p
          className={`font-semibold mb-1 flex items-center gap-2 ${hasEvolvingConditions ? 'text-green-100' : 'text-blue-100'}`}
        >
          <Info className="w-4 h-4" />
          Environmental Conditions:
        </p>
        {hasEvolvingConditions ? (
          <ul className="space-y-0.5 ml-4 text-gray-300">
            <li>
              • <strong>Evolving conditions enabled</strong> - Temperature and pressure vary over
              time
            </li>
            <li>
              • Temperature range: {Math.min(...envData.map((d) => d.temperature)).toFixed(2)} -{' '}
              {Math.max(...envData.map((d) => d.temperature)).toFixed(2)} K
            </li>
            <li>
              • Pressure range: {Math.min(...envData.map((d) => d.pressure)).toFixed(0)} -{' '}
              {Math.max(...envData.map((d) => d.pressure)).toFixed(0)} Pa
            </li>
            <li>• Interpolation method: Step (most recent value at or before each time)</li>
          </ul>
        ) : (
          <ul className="space-y-0.5 ml-4 text-gray-300">
            <li>
              • Temperature: {conditions.initial.temperature} K (
              {(conditions.initial.temperature - 273.15).toFixed(2)}°C) - Constant
            </li>
            <li>
              • Pressure: {conditions.initial.pressure} Pa (
              {(conditions.initial.pressure / 101325).toFixed(4)} atm) - Constant
            </li>
            <li>• Environmental conditions remain constant throughout simulation</li>
          </ul>
        )}
      </div>
    </div>
  )
}

export default EnvironmentPlot
