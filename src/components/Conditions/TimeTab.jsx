import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { PencilLine } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { setDuration, setTimeStep, setOutputFrequency } from '../../redux/slices/conditionsSlice'
import { RangeBoundInput } from '../Plots/RangeBoundInput'
import { UnitDropdown } from '../Plots/UnitDropdown'
import { TIME_RANGE_UNITS, formatBound } from '../Plots/timeRangeUnits'
import { TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import { useToast } from '@/hooks/use-toast'

const NUMBER_INPUT = `w-72 ${TEXT_INPUT_SM}`

const DROPDOWN_WRAPPER = 'relative w-72 flex-shrink-0'
const DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-9 px-2 border border-border rounded-lg text-sm text-ink hover:bg-surface-hover'

function getUnit(unitId) {
  return TIME_RANGE_UNITS.find((u) => u.id === unitId) ?? TIME_RANGE_UNITS[0]
}

// Total steps/output points require a positive, finite denominator. Malformed configs can
// violate this because config loaders don't clamp duration/timeStep/outputFrequency.
function computeCount(numerator, denominator, offset = 0) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 'N/A'
  }
  return Math.floor(numerator / denominator) + offset
}

const FIELDS = [
  {
    key: 'duration',
    label: 'Simulation time',
    getMin: () => 0,
    action: setDuration,
    defaultUnit: 'hours',
    help: () => 'Set how long you want the simulation to run',
  },
  {
    key: 'timeStep',
    label: 'Time step',
    getMin: () => 1,
    action: setTimeStep,
    defaultUnit: 'seconds',
    help: () => 'Set the time interval between steps',
  },
  {
    key: 'outputFrequency',
    label: 'Output time step',
    // Output can only be saved on simulation steps.
    getMin: (basic) => basic.timeStep,
    action: setOutputFrequency,
    defaultUnit: 'seconds',
    help: (value, divisor, unit) =>
      `Save output every ${formatBound(value, divisor, null, 4)} ${unit.label.toLowerCase()}`,
  },
]

/**
 * TimeTab Component
 * Manages basic simulation configuration (duration, timestep, output frequency)
 */
export function TimeTab() {
  const dispatch = useDispatch()
  const basic = useSelector((state) => state.conditions.basic)
  const { toast } = useToast()

  const [unitIds, setUnitIds] = useState(() =>
    Object.fromEntries(FIELDS.map((field) => [field.key, field.defaultUnit]))
  )

  return (
    <div className="w-fit mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Simulation Time</CardTitle>
          <CardDescription>Configure how long the simulation runs and its temporal resolution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((field) => {
            const unit = getUnit(unitIds[field.key])
            const value = basic[field.key]

            return (
              <div key={field.key} className="w-72 mx-auto">
                <label className="block text-base font-semibold text-ink mb-2">
                  {field.label}
                </label>
                <div className="flex flex-col gap-2">
                  <UnitDropdown
                    unitId={unitIds[field.key]}
                    onChange={(id) => setUnitIds((prev) => ({ ...prev, [field.key]: id }))}
                    wrapperClassName={DROPDOWN_WRAPPER}
                    buttonClassName={DROPDOWN_BUTTON}
                    centerLabel
                  />
                  <RangeBoundInput
                    value={value}
                    divisor={unit.divisor}
                    decimals={4}
                    min={field.getMin(basic)}
                    onCommit={(next) => dispatch(field.action(next))}
                    flashOnCommit
                    onBelowMin={
                      field.key === 'outputFrequency'
                        ? () => {
                            const timeStepUnit = getUnit(unitIds.timeStep)
                            toast({
                              title: 'Invalid output time step',
                              description: `Output time step must be greater than or equal to simulation time step.`,
                              variant: 'destructive',
                            })
                          }
                        : undefined
                    }
                    className={NUMBER_INPUT}
                  />
                </div>
                <p className="text-xs text-muted mt-1">{field.help(value, unit.divisor, unit)}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="bg-surface-alt backdrop-blur-lg border border-border rounded-lg p-2 text-[13px] text-ink">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <PencilLine className="w-4 h-4" />
          Summary:
        </p>
        <ul className="space-y-0.5 ml-4">
          <li>• Total steps: {computeCount(basic.duration, basic.timeStep)}</li>
          <li>• Output points: {computeCount(basic.duration, basic.outputFrequency, 1)}</li>
        </ul>
      </div>
    </div>
  )
}

export default TimeTab
