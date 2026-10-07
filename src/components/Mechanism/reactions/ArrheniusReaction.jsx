import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'
import { FIELD_LABEL, TEXT_INPUT } from '../fieldStyles'
import { InfoTooltip } from '../../ui/tooltip'
import { FormulaText } from '../FormulaText'
import { ReactionEquation } from '../ReactionEquation'

export function ArrheniusReactionForm({ onAddReaction, parameters = [] }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [rateA, setRateA] = useState('')
  const [rateB, setRateB] = useState('')
  const [rateC, setRateC] = useState('')
  const [rateD, setRateD] = useState('')
  const [rateE, setRateE] = useState('')
  const [error, setError] = useState(null)
  const rateFields = {
    A: [rateA, setRateA],
    B: [rateB, setRateB],
    C: [rateC, setRateC],
    D: [rateD, setRateD],
    E: [rateE, setRateE],
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
          placeholder="O1D + N2"
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
          placeholder="O + N2"
          className={TEXT_INPUT.replace('text-center', 'text-left')}
        />
      </div>

      <ReactionEquation type="ARRHENIUS" />

      <div className="grid grid-cols-1 gap-3">
        {parameters.map(({ key, name, description, unit, placeholder }) => {
          const [value, setValue] = rateFields[key]
          return (
            <div key={key} className="flex h-9 items-stretch">
              <span className="flex w-12 flex-shrink-0 items-center justify-center gap-1 rounded-l-lg border border-r-0 border-border bg-assist-secondary text-sm font-semibold text-assist-secondary-foreground">
                {key}
                <InfoTooltip title={name} description={description} />
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                aria-label={`${key}, ${name}`}
                className="min-w-0 flex-1 border border-border bg-white px-2 text-left font-mono text-sm text-ink placeholder:text-gray-400 focus:z-10 focus:outline-none focus:ring-2 focus:ring-action dark:bg-surface dark:placeholder:text-muted"
              />
              <span className="flex w-36 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-r-lg border border-l-0 border-border bg-assist-secondary px-1 text-sm text-assist-secondary-foreground">
                <FormulaText text={unit} />
              </span>
            </div>
          )
        })}
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
