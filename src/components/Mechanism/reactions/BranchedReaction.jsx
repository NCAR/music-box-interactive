import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'

export function BranchedReactionForm({ onAddReaction }) {
  const [reactants, setReactants] = useState('')
  const [alkoxyProducts, setAlkoxyProducts] = useState('')
  const [nitrateProducts, setNitrateProducts] = useState('')
  const [xValue, setXValue] = useState('')
  const [yValue, setYValue] = useState('')
  const [a0Value, setA0Value] = useState('')
  const [nValue, setNValue] = useState('')
  const [error, setError] = useState(null)

  const handleAdd = () => {
    if (!reactants.trim()) {
      setError('Please enter reactants')
      setTimeout(() => setError(null), 3000)
      return
    }

    if (!alkoxyProducts.trim()) {
      setError('Please enter alkoxy products')
      setTimeout(() => setError(null), 3000)
      return
    }

    if (!nitrateProducts.trim()) {
      setError('Please enter nitrate products')
      setTimeout(() => setError(null), 3000)
      return
    }

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

    const parsedX = parseOptionalNumber(xValue)
    const parsedY = parseOptionalNumber(yValue)
    const parsedA0 = parseOptionalNumber(a0Value)
    const parsedN = parseOptionalNumber(nValue)

    if ([parsedX, parsedY, parsedA0, parsedN].some((entry) => entry.invalid)) {
      setError('X, Y, a0, and n must be valid numbers when provided')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'BRANCHED_NO_RO2',
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      'alkoxy products': parseReactionString(alkoxyProducts),
      'nitrate products': parseReactionString(nitrateProducts),
      ...(parsedX.hasValue ? { X: parsedX.value } : {}),
      ...(parsedY.hasValue ? { Y: parsedY.value } : {}),
      ...(parsedA0.hasValue ? { a0: parsedA0.value } : {}),
      ...(parsedN.hasValue ? { n: parsedN.value } : {}),
    }

    onAddReaction(newReaction)

    setReactants('')
    setAlkoxyProducts('')
    setNitrateProducts('')
    setXValue('')
    setYValue('')
    setA0Value('')
    setNValue('')
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">Reactants</label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="A"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">Alkoxy Products</label>
        <input
          type="text"
          value={alkoxyProducts}
          onChange={(e) => setAlkoxyProducts(e.target.value)}
          placeholder="0.2B + 1.2A"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">Nitrate Products</label>
        <input
          type="text"
          value={nitrateProducts}
          onChange={(e) => setNitrateProducts(e.target.value)}
          placeholder="1.2C"
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">X (optional)</label>
          <input
            type="text"
            value={xValue}
            onChange={(e) => setXValue(e.target.value)}
            placeholder="1.2e-4"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">Y (optional)</label>
          <input
            type="text"
            value={yValue}
            onChange={(e) => setYValue(e.target.value)}
            placeholder="167"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">a0 (optional)</label>
          <input
            type="text"
            value={a0Value}
            onChange={(e) => setA0Value(e.target.value)}
            placeholder="0.15"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">n (optional)</label>
          <input
            type="text"
            value={nValue}
            onChange={(e) => setNValue(e.target.value)}
            placeholder="9"
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
