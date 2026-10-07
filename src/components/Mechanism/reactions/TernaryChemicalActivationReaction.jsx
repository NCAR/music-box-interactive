import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'
import { PARAMETER_GRID, ParameterRow } from '../ParameterRow'
import { ReactionEquation } from '../ReactionEquation'

export function TernaryChemicalActivationReactionForm({ onAddReaction, parameters = [] }) {
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
  const rateFields = {
    k0_A: [k0A, setK0A],
    k0_B: [k0B, setK0B],
    k0_C: [k0C, setK0C],
    kinf_A: [kinfA, setKinfA],
    kinf_B: [kinfB, setKinfB],
    kinf_C: [kinfC, setKinfC],
    Fc: [fc, setFc],
    N: [nValue, setNValue],
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
      type: 'TERNARY_CHEMICAL_ACTIVATION',
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
        <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 dark:text-danger px-3 py-2 rounded text-xs">
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
          placeholder="H2O"
          className={TEXT_INPUT.replace('text-center', 'text-left')}
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
          placeholder="O3"
          className={TEXT_INPUT.replace('text-center', 'text-left')}
        />
      </div>

      <ReactionEquation type="TERNARY_CHEMICAL_ACTIVATION" />

      <div className={PARAMETER_GRID}>
        {parameters.map(({ key, ...parameter }) => (
          <ParameterRow
            key={key}
            symbol={key}
            {...parameter}
            value={rateFields[key][0]}
            onChange={rateFields[key][1]}
          />
        ))}
      </div>

      <div className="pt-8 flex justify-center">
        <Button
          onClick={handleAdd}
          variant="assistSecondary"
          className="h-11 px-8 text-base rounded-lg bg-assist-secondary text-assist-secondary-foreground hover:bg-assist-secondary-hover"
        >
          Add Reaction
        </Button>
      </div>
    </div>
  )
}
