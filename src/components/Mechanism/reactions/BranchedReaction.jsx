import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'
import { PARAMETER_GRID, ParameterRow } from '../ParameterRow'
import { ReactionEquation } from '../ReactionEquation'
import { ReactionDocsLink } from '../ReactionDocsLink'

export function BranchedReactionForm({ onAddReaction, parameters = [] }) {
  const [reactants, setReactants] = useState('')
  const [alkoxyProducts, setAlkoxyProducts] = useState('')
  const [nitrateProducts, setNitrateProducts] = useState('')
  const [xValue, setXValue] = useState('')
  const [yValue, setYValue] = useState('')
  const [a0Value, setA0Value] = useState('')
  const [nValue, setNValue] = useState('')
  const [error, setError] = useState(null)
  const rateFields = {
    X: [xValue, setXValue],
    Y: [yValue, setYValue],
    a0: [a0Value, setA0Value],
    n: [nValue, setNValue],
  }

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
        <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 dark:text-danger px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      <div>
        <label className={FIELD_LABEL}>Reactants</label>
        <input
          type="text"
          value={reactants}
          onChange={(e) => setReactants(e.target.value)}
          placeholder="C4H9O2 + NO"
          className={TEXT_INPUT.replace('text-center', 'text-left')}
        />
      </div>

      <div>
        <label className={FIELD_LABEL}>Alkoxy products</label>
        <input
          type="text"
          value={alkoxyProducts}
          onChange={(e) => setAlkoxyProducts(e.target.value)}
          placeholder="C4H9O + NO2"
          className={TEXT_INPUT.replace('text-center', 'text-left')}
        />
      </div>

      <div>
        <label className={FIELD_LABEL}>Nitrate products</label>
        <input
          type="text"
          value={nitrateProducts}
          onChange={(e) => setNitrateProducts(e.target.value)}
          placeholder="C4H9ONO2"
          className={TEXT_INPUT.replace('text-center', 'text-left')}
        />
      </div>

      <ReactionEquation type="BRANCHED_NO_RO2" />

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

      <ReactionDocsLink type="BRANCHED_NO_RO2" />

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
