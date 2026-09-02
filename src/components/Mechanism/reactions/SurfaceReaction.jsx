import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'

export function SurfaceReactionForm({ onAddReaction }) {
  const [gasPhaseSpecies, setGasPhaseSpecies] = useState('')
  const [gasPhaseProducts, setGasPhaseProducts] = useState('')
  const [reactionProbability, setReactionProbability] = useState('')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!gasPhaseSpecies.trim()) {
      setError('Please enter gas-phase species')
      setTimeout(() => setError(null), 3000)
      return
    }

    if (!gasPhaseProducts.trim()) {
      setError('Please enter gas-phase products')
      setTimeout(() => setError(null), 3000)
      return
    }

    const hasReactionProbability = reactionProbability.trim().length > 0
    const reactionProbabilityValue = hasReactionProbability
      ? parseFloat(reactionProbability)
      : undefined

    if (hasReactionProbability && Number.isNaN(reactionProbabilityValue)) {
      setError('Reaction probability must be a valid number')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'SURFACE_REACTION',
      'gas phase': 'gas',
      'gas-phase species': gasPhaseSpecies.trim().toUpperCase(),
      'gas-phase products': parseReactionString(gasPhaseProducts),
      ...(hasReactionProbability ? { 'reaction probability': reactionProbabilityValue } : {}),
    }

    onAddReaction(newReaction)

    setGasPhaseSpecies('')
    setGasPhaseProducts('')
    setReactionProbability('')
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      <div>
        <label className={FIELD_LABEL}>
          Gas-phase reactant
        </label>
        <input
          type="text"
          value={gasPhaseSpecies}
          onChange={(e) => setGasPhaseSpecies(e.target.value)}
          placeholder="e.g., NO2"
          className={TEXT_INPUT}
        />
      </div>

      <div>
        <label className={FIELD_LABEL}>
          Gas-phase products
        </label>
        <input
          type="text"
          value={gasPhaseProducts}
          onChange={(e) => setGasPhaseProducts(e.target.value)}
          placeholder="e.g., 0.5OH + 0.5NO + 0.5HNO3"
          className={TEXT_INPUT}
        />
      </div>

      <div>
        <label className={FIELD_LABEL}>
          Reaction probability 
        </label>
        <input
          type="text"
          value={reactionProbability}
          onChange={(e) => setReactionProbability(e.target.value)}
          placeholder="1.0"
          className={TEXT_INPUT}
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
