import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'

export function ArrheniusReactionForm({ onAddReaction }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [rateA, setRateA] = useState('')
  const [rateB, setRateB] = useState('')
  const [rateC, setRateC] = useState('')
  const [rateD, setRateD] = useState('')
  const [rateE, setRateE] = useState('')
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

    const parsedA = parseOptionalNumber(rateA)
    const parsedB = parseOptionalNumber(rateB)
    const parsedC = parseOptionalNumber(rateC)
    const parsedD = parseOptionalNumber(rateD)
    const parsedE = parseOptionalNumber(rateE)

    if ([parsedA, parsedB, parsedC, parsedD, parsedE].some((value) => value.invalid)) {
      setError('All Arrhenius parameters (A, B, C, D, E) must be valid numbers')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'ARRHENIUS',
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      products: parseReactionString(products),
      ...(parsedA.hasValue ? { A: parsedA.value } : {}),
      ...(parsedB.hasValue ? { B: parsedB.value } : {}),
      ...(parsedC.hasValue ? { C: parsedC.value } : {}),
      ...(parsedD.hasValue ? { D: parsedD.value } : {}),
      ...(parsedE.hasValue ? { E: parsedE.value } : {}),
    }

    onAddReaction(newReaction)

    setReactants('')
    setProducts('')
    setRateA('')
    setRateB('')
    setRateC('')
    setRateD('')
    setRateE('')
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">
            Rate Constant A (pre-exponential factor)
          </label>
          <input
            type="text"
            value={rateA}
            onChange={(e) => setRateA(e.target.value)}
            placeholder="1.0e-10"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">Parameter B</label>
          <input
            type="text"
            value={rateB}
            onChange={(e) => setRateB(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">Parameter C</label>
          <input
            type="text"
            value={rateC}
            onChange={(e) => setRateC(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">Parameter D</label>
          <input
            type="text"
            value={rateD}
            onChange={(e) => setRateD(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-100 mb-1">Parameter E</label>
          <input
            type="text"
            value={rateE}
            onChange={(e) => setRateE(e.target.value)}
            placeholder="0.0"
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
