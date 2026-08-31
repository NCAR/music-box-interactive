import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { FIELD_LABEL_SM, TEXT_INPUT_SM } from '../fieldStyles'

export function EmissionReactionForm({ onAddReaction }) {
  const [products, setProducts] = useState('')
  const [emissionScaling, setEmissionScaling] = useState('')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!products.trim()) {
      setError('Please enter a product species name for emission')
      setTimeout(() => setError(null), 3000)
      return
    }

    const hasScalingFactor = emissionScaling.trim().length > 0
    const scaling = hasScalingFactor ? parseFloat(emissionScaling) : undefined
    if (hasScalingFactor && Number.isNaN(scaling)) {
      setError('Scaling factor must be a valid number')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'EMISSION',
      products: [
        {
          'species name': products.toUpperCase(),
          coefficient: 1.0,
        },
      ],
      'gas phase': 'gas',
      ...(hasScalingFactor ? { 'scaling factor': scaling } : {}),
    }

    onAddReaction(newReaction)

    setProducts('')
    setEmissionScaling('')
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
          Products (e.g., "O3" or "NO + O2")
        </label>
        <input
          type="text"
          value={products}
          onChange={(e) => setProducts(e.target.value)}
          placeholder="O3"
          className={`w-full ${TEXT_INPUT_SM}`}
        />
      </div>

      <div>
        <div>
          <label className={FIELD_LABEL_SM}>
            Scaling Factor (optional; defaults to 1.0)
          </label>
          <input
            type="text"
            value={emissionScaling}
            onChange={(e) => setEmissionScaling(e.target.value)}
            placeholder="12.3"
            className={`w-full ${TEXT_INPUT_SM}`}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button onClick={handleAdd} variant="assistSecondary" size="lg" className="text-base">
          Add Reaction
        </Button>
      </div>
    </div>
  )
}
