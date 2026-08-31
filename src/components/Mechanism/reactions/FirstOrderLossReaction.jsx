import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL_SM, TEXT_INPUT_SM } from '../fieldStyles'

export function FirstOrderLossReactionForm({ onAddReaction }) {
  const [reactants, setReactants] = useState('')
  const [scalingFactor, setScalingFactor] = useState('')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!reactants.trim()) {
      setError('Please enter reactants')
      setTimeout(() => setError(null), 3000)
      return
    }

    const hasScalingFactor = scalingFactor.trim().length > 0
    const scalingFactorValue = hasScalingFactor ? parseFloat(scalingFactor) : undefined

    if (hasScalingFactor && Number.isNaN(scalingFactorValue)) {
      setError('Scaling factor must be a valid number')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'FIRST_ORDER_LOSS',
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      ...(hasScalingFactor ? { 'scaling factor': scalingFactorValue } : {}),
    }

    onAddReaction(newReaction)

    setReactants('')
    setScalingFactor('')
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      <div>
        <label className={FIELD_LABEL_SM}>
          Reactants (e.g., "C" or "2C")
        </label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="C"
          className={`w-full ${TEXT_INPUT_SM}`}
        />
      </div>

      <div>
        <label className={FIELD_LABEL_SM}>
          Scaling Factor (optional; defaults to 1.0)
        </label>
        <input
          type="text"
          value={scalingFactor}
          onChange={(e) => setScalingFactor(e.target.value)}
          placeholder="12.3"
          className={`w-full ${TEXT_INPUT_SM}`}
        />
      </div>

      <div className="mt-8 flex justify-center">
        <Button onClick={handleAdd} variant="assistSecondary" size="lg" className="text-base">
          Add Reaction
        </Button>
      </div>
    </div>
  )
}
