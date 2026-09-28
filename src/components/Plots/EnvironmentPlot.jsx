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
import { Thermometer } from 'lucide-react'

/**
 * EnvironmentPlot Component
 * Displays environmental conditions (temperature, pressure) over time
 */
export function EnvironmentPlot() {
  const simulation = useSelector((state) => state.simulation)
  const conditions = useSelector((state) => state.conditions)

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
      {/* Temperature Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature Profile</CardTitle>
          <CardDescription>Temperature over simulation time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={envData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D6D2" />
              <XAxis
                dataKey="timeHours"
                label={{
                  value: 'Time (hours)',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fill: '#1f2937', fontWeight: 400 },
                }}
                stroke="#5f6368"
                tick={{ fontSize: 12, fill: '#5f6368' }}
              />
              <YAxis
                label={{
                  value: 'Temperature (K)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#1f2937', fontWeight: 400 },
                }}
                stroke="#5f6368"
                tick={{ fontSize: 12, fill: '#5f6368' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #D8D6D2',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#FAA119"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D6D2" />
              <XAxis
                dataKey="timeHours"
                label={{
                  value: 'Time (hours)',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fill: '#1f2937', fontWeight: 400 },
                }}
                stroke="#5f6368"
                tick={{ fontSize: 12, fill: '#5f6368' }}
              />
              <YAxis
                label={{
                  value: 'Pressure (Pa)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#1f2937', fontWeight: 400 },
                }}
                stroke="#5f6368"
                tick={{ fontSize: 12, fill: '#5f6368' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #D8D6D2',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#0057C2"
                strokeWidth={2}
                dot={false}
                name="Pressure (Pa)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnvironmentPlot
