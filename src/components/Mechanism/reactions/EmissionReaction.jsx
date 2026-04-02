import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'

export function EmissionReactionForm({ onAddReaction }) {
  const [emissionProduct, setEmissionProduct] = useState('')
  const [emissionScaling, setEmissionScaling] = useState('1.0')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!emissionProduct.trim()) {
      setError('Please enter a product species name for emission')
      setTimeout(() => setError(null), 3000)
      return
    }

    const scaling = parseFloat(emissionScaling)
    if (Number.isNaN(scaling)) {
      setError('Scaling factor must be a valid number')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'EMISSION',
      name: emissionProduct.toUpperCase(),
      'scaling factor': scaling,
      products: [
        {
          'species name': emissionProduct.toUpperCase(),
          coefficient: 1.0,
        },
      ],
      'gas phase': 'gas',
    }

    onAddReaction(newReaction)

    setEmissionProduct('')
    setEmissionScaling('1.0')
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">
            Product Species Name
          </label>
          <input
            type="text"
            value={emissionProduct}
            onChange={(e) => setEmissionProduct(e.target.value)}
            placeholder="ISOP"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">
            Scaling Factor
          </label>
          <input
            type="text"
            value={emissionScaling}
            onChange={(e) => setEmissionScaling(e.target.value)}
            placeholder="1.0"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <Button onClick={handleAdd} variant="apple" size="default" className="rounded-2xl">
        Add Reaction
      </Button>
    </div>
  )
}
