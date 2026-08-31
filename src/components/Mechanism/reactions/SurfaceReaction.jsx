import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL_SM, TEXT_INPUT_SM } from '../fieldStyles'

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
        <label className={FIELD_LABEL_SM}>
          Gas-Phase Species (e.g., "A")
        </label>
        <input
          type="text"
          value={gasPhaseSpecies}
          onChange={(e) => setGasPhaseSpecies(e.target.value)}
          placeholder="A"
          className={`w-full ${TEXT_INPUT_SM}`}
        />
      </div>

      <div>
        <label className={FIELD_LABEL_SM}>
          Gas-Phase Products (e.g., "B + C")
        </label>
        <input
          type="text"
          value={gasPhaseProducts}
          onChange={(e) => setGasPhaseProducts(e.target.value)}
          placeholder="B + C"
          className={`w-full ${TEXT_INPUT_SM}`}
        />
      </div>

      <div>
        <label className={FIELD_LABEL_SM}>
          Reaction Probability (optional)
        </label>
        <input
          type="text"
          value={reactionProbability}
          onChange={(e) => setReactionProbability(e.target.value)}
          placeholder="2.0e-2"
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
