import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'

export function GenericReactionForm({ onAddReaction, reactionType }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!reactants.trim()) {
      setError('Please enter reactants')
      setTimeout(() => setError(null), 3000)
      return
    }

    if (!products.trim()) {
      setError('Please enter products')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: reactionType,
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      products: parseReactionString(products),
    }

    onAddReaction(newReaction)

    setReactants('')
    setProducts('')
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
          Reactants (e.g., "O2 + O" or "2NO2")
        </label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="O2 + O"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">
          Products (e.g., "O3" or "NO + O2")
        </label>
        <input
          type="text"
          value={products}
          onChange={(e) => setProducts(e.target.value)}
          placeholder="O3"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <Button onClick={handleAdd} variant="apple" size="default" className="rounded-2xl">
        Add Reaction
      </Button>
    </div>
  )
}
