import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'

export function ScaledReactionForm({ onAddReaction, reactionType, allowEmptyProducts = false }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [scalingFactor, setScalingFactor] = useState('')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!reactants.trim()) {
      setError('Please enter reactants')
      setTimeout(() => setError(null), 3000)
      return
    }

    if (!allowEmptyProducts && !products.trim()) {
      setError('Please enter products')
      setTimeout(() => setError(null), 3000)
      return
    }

    const hasScalingFactor = scalingFactor.trim().length > 0
    const scaling = hasScalingFactor ? parseFloat(scalingFactor) : undefined
    if (hasScalingFactor && Number.isNaN(scaling)) {
      setError('Scaling factor must be a valid number')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: reactionType,
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      products: products.trim() ? parseReactionString(products) : [],
      ...(hasScalingFactor ? { 'scaling factor': scaling } : {}),
    }

    onAddReaction(newReaction)

    setReactants('')
    setProducts('')
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
        <label className={FIELD_LABEL}>
          Reactants
        </label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="e.g., O3"
          className={TEXT_INPUT}
        />
      </div>

      <div>
        <label className={FIELD_LABEL}>
          Products
        </label>
        <input
          type="text"
          value={products}
          onChange={(e) => setProducts(e.target.value)}
          placeholder="e.g., O + O2"
          className={TEXT_INPUT}
        />
      </div>

      <div>
        <label className={FIELD_LABEL}>
          Scaling factor
        </label>
        <input
          type="text"
          value={scalingFactor}
          onChange={(e) => setScalingFactor(e.target.value)}
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
