import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'

export function TroeReactionForm({ onAddReaction }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [k0A, setK0A] = useState('')
  const [k0B, setK0B] = useState('')
  const [k0C, setK0C] = useState('')
  const [kinfA, setKinfA] = useState('')
  const [kinfB, setKinfB] = useState('')
  const [kinfC, setKinfC] = useState('')
  const [fc, setFc] = useState('')
  const [nValue, setNValue] = useState('')
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

    const parsedK0A = parseOptionalNumber(k0A)
    const parsedK0B = parseOptionalNumber(k0B)
    const parsedK0C = parseOptionalNumber(k0C)
    const parsedKinfA = parseOptionalNumber(kinfA)
    const parsedKinfB = parseOptionalNumber(kinfB)
    const parsedKinfC = parseOptionalNumber(kinfC)
    const parsedFc = parseOptionalNumber(fc)
    const parsedN = parseOptionalNumber(nValue)

    if (
      [
        parsedK0A,
        parsedK0B,
        parsedK0C,
        parsedKinfA,
        parsedKinfB,
        parsedKinfC,
        parsedFc,
        parsedN,
      ].some((entry) => entry.invalid)
    ) {
      setError('All kinetic parameters must be valid numbers when provided')
      setTimeout(() => setError(null), 3000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'TROE',
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      products: parseReactionString(products),
      ...(parsedK0A.hasValue ? { k0_A: parsedK0A.value } : {}),
      ...(parsedK0B.hasValue ? { k0_B: parsedK0B.value } : {}),
      ...(parsedK0C.hasValue ? { k0_C: parsedK0C.value } : {}),
      ...(parsedKinfA.hasValue ? { kinf_A: parsedKinfA.value } : {}),
      ...(parsedKinfB.hasValue ? { kinf_B: parsedKinfB.value } : {}),
      ...(parsedKinfC.hasValue ? { kinf_C: parsedKinfC.value } : {}),
      ...(parsedFc.hasValue ? { Fc: parsedFc.value } : {}),
      ...(parsedN.hasValue ? { N: parsedN.value } : {}),
    }

    onAddReaction(newReaction)

    setReactants('')
    setProducts('')
    setK0A('')
    setK0B('')
    setK0C('')
    setKinfA('')
    setKinfB('')
    setKinfC('')
    setFc('')
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
        <label className={FIELD_LABEL}>
          Reactants
        </label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="e.g., NO2"
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
          placeholder="e.g., O3"
          className={TEXT_INPUT}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={FIELD_LABEL}>k0_A (low-pressure pre-exponential factor) </label>
          <input
            type="text"
            value={k0A}
            onChange={(e) => setK0A(e.target.value)}
            placeholder="1.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>k0_B (low-pres temperature parameter) </label>
          <input
            type="text"
            value={k0B}
            onChange={(e) => setK0B(e.target.value)}
            placeholder="0.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>k0_C (low-pressure exponential factor)</label>
          <input
            type="text"
            value={k0C}
            onChange={(e) => setK0C(e.target.value)}
            placeholder="0.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>
            kinf_A (high-pres pre-exponential factor)
          </label>
          <input
            type="text"
            value={kinfA}
            onChange={(e) => setKinfA(e.target.value)}
            placeholder="1.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>
            kinf_B (high-pres temperature parameter)
          </label>
          <input
            type="text"
            value={kinfB}
            onChange={(e) => setKinfB(e.target.value)}
            placeholder="0.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>
            kinf_C (high-pressure exponential factor)
          </label>
          <input
            type="text"
            value={kinfC}
            onChange={(e) => setKinfC(e.target.value)}
            placeholder="0.0"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Fc </label>
          <input
            type="text"
            value={fc}
            onChange={(e) => setFc(e.target.value)}
            placeholder="0.6"
            className={TEXT_INPUT}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>N </label>
          <input
            type="text"
            value={nValue}
            onChange={(e) => setNValue(e.target.value)}
            placeholder="1.0"
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
