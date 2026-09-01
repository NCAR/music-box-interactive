import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'

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
        <label className={FIELD_LABEL}>
          Reactants
        </label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="e.g., CH2O + OH"
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
          placeholder="e.g., CHO + H2O"
          className={TEXT_INPUT}
        />
      </div>

      {/* One parameter per row so long labels aren't truncated by three columns. */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className={FIELD_LABEL}>A (pre-exponential factor) </label>
          <input
            type="text"
            value={paramA}
            onChange={(e) => setParamA(e.target.value)}
            placeholder="1.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>B (linear temperature dependence)</label>
          <input
            type="text"
            value={paramB}
            onChange={(e) => setParamB(e.target.value)}
            placeholder="0.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>C (cubed temperature dependence)</label>
          <input
            type="text"
            value={paramC}
            onChange={(e) => setParamC(e.target.value)}
            placeholder="0.0"
            className={TEXT_INPUT}
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
