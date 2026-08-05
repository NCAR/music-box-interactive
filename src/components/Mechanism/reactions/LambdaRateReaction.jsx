import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../ui/button'
import { parseReactionString } from './reactionUtils'

export function LambdaRateReactionForm({ onAddReaction }) {
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [lambdaFunction, setLambdaFunction] = useState('(T, P, airDensity) => 1.0e-12')
  const [error, setError] = useState(null)

  const validateLambdaFunction = (source) => {
    const trimmed = source.trim()
    if (!trimmed) {
      return 'Please enter a lambda function'
    }

    try {
      const fn = new Function(`return (${trimmed});`)()
      if (typeof fn !== 'function') {
        return 'Lambda input must evaluate to a JavaScript function'
      }
      const value = fn(298.15, 101325, 2.5e19)
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'Lambda function must return a number'
      }
    } catch {
      return 'Use JavaScript function syntax, e.g., (T, P, airDensity) => 1.0e-12'
    }

    return null
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

    const lambdaError = validateLambdaFunction(lambdaFunction)
    if (lambdaError) {
      setError(lambdaError)
      setTimeout(() => setError(null), 4000)
      return
    }

    const newReaction = {
      id: uuidv4(),
      type: 'LAMBDA_RATE',
      'gas phase': 'gas',
      reactants: parseReactionString(reactants),
      products: parseReactionString(products),
      lambdaFunction: lambdaFunction.trim(),
    }

    onAddReaction(newReaction)

    setReactants('')
    setProducts('')
    setLambdaFunction('(T, P, airDensity) => 1.0e-12')
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

      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">
          Lambda Function (JavaScript)
        </label>
        <textarea
          value={lambdaFunction}
          onChange={(e) => setLambdaFunction(e.target.value)}
          placeholder="(T, P, airDensity) => 1.2e-5 * Math.exp(-500.0 / T)"
          rows={4}
          className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <p className="mt-1 text-[11px] text-gray-300">
          Allowed parameters: <strong>T</strong>, <strong>P</strong>, <strong>airDensity</strong>
        </p>
      </div>

      <Button onClick={handleAdd} variant="secondary" size="default" className="rounded-2xl">
        Add Reaction
      </Button>
    </div>
  )
}
