import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'

export function TunnelingReactionForm({ onAddReaction }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [paramA, setParamA] = useState('')
  const [paramB, setParamB] = useState('')
  const [paramC, setParamC] = useState('')
  const [error, setError] = useState(null)

  const parseOptionalNumber = (raw) => {
    if (!raw.trim()) {
      return { hasValue: false, value: undefined }
    }

    const value = parseFloat(raw)
    if (Number.isNaN(value)) {
      return { hasValue: true, invalid: true }
    }

    return { hasValue: true, value }
  }

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

    const parsedA = parseOptionalNumber(paramA)
    const parsedB = parseOptionalNumber(paramB)
    const parsedC = parseOptionalNumber(paramC)

    if ([parsedA, parsedB, parsedC].some((entry) => entry.invalid)) {
      setError('A, B, and C must be valid numbers when provided')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'TUNNELING',
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      products: parseReactionString(products),
      ...(parsedA.hasValue ? { A: parsedA.value } : {}),
      ...(parsedB.hasValue ? { B: parsedB.value } : {}),
      ...(parsedC.hasValue ? { C: parsedC.value } : {}),
    }

    onAddReaction(newReaction)

    setReactants('')
    setProducts('')
    setParamA('')
    setParamB('')
    setParamC('')
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
          Reactants (e.g., "B")
        </label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="B"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">
          Products (e.g., "C" or "0.2A + 1.2B")
        </label>
        <input
          type="text"
          value={products}
          onChange={(e) => setProducts(e.target.value)}
          placeholder="C"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">A (optional)</label>
          <input
            type="text"
            value={paramA}
            onChange={(e) => setParamA(e.target.value)}
            placeholder="123.45"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">B (optional)</label>
          <input
            type="text"
            value={paramB}
            onChange={(e) => setParamB(e.target.value)}
            placeholder="1200.0"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">C (optional)</label>
          <input
            type="text"
            value={paramC}
            onChange={(e) => setParamC(e.target.value)}
            placeholder="1.0e8"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <Button onClick={handleAdd} variant="assist" size="default" className="rounded-2xl">
        Add Reaction
      </Button>
    </div>
  )
}
