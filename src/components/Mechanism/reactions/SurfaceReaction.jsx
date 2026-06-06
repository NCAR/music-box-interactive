import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'

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
        <label className="block text-xs font-semibold text-blue-100 mb-1">
          Gas-Phase Species (e.g., "A")
        </label>
        <input
          type="text"
          value={gasPhaseSpecies}
          onChange={(e) => setGasPhaseSpecies(e.target.value)}
          placeholder="A"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">
          Gas-Phase Products (e.g., "B + C")
        </label>
        <input
          type="text"
          value={gasPhaseProducts}
          onChange={(e) => setGasPhaseProducts(e.target.value)}
          placeholder="B + C"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">
          Reaction Probability (optional)
        </label>
        <input
          type="text"
          value={reactionProbability}
          onChange={(e) => setReactionProbability(e.target.value)}
          placeholder="2.0e-2"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <Button onClick={handleAdd} variant="apple" size="default" className="rounded-2xl">
        Add Reaction
      </Button>
    </div>
  )
}
