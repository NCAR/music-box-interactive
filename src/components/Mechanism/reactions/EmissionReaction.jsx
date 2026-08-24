import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'

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
        <label className="block text-xs font-semibold text-blue-900 mb-1">
          Products (e.g., "O3" or "NO + O2")
        </label>
        <input
          type="text"
          value={products}
          onChange={(e) => setProducts(e.target.value)}
          placeholder="O3"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">
            Scaling Factor (optional; defaults to 1.0)
          </label>
          <input
            type="text"
            value={emissionScaling}
            onChange={(e) => setEmissionScaling(e.target.value)}
            placeholder="12.3"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <Button onClick={handleAdd} variant="assist" size="default" className="rounded-2xl">
        Add Reaction
      </Button>
    </div>
  )
}
