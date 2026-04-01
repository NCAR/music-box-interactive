import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { addReaction, removeReaction } from '../../redux/slices/mechanismSlice'
import { v4 as uuidv4 } from 'uuid'
import { Plus, FlaskConical, Lightbulb } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// visual editor for reactions in the mechanism
export function ReactionEditor() {

  const dispatch = useDispatch()
  const { toast } = useToast()
  const reactions = useSelector((state) => state.mechanism.reactions)
  const species = useSelector((state) => state.mechanism.species)
  const selectedMechanism = useSelector((state) => state.mechanism.selectedMechanism)

  const [reactionSearch, setReactionSearch] = useState("");

  // Move formatReactionDisplay above filteredReactions so it's available
  function formatReactionDisplay(reaction) {
    const reactantStr = reaction.reactants && reaction.reactants.length > 0
      ? reaction.reactants.map(r => `${r.coefficient > 1 ? r.coefficient : ''}${r["species name"]}`).join(' + ')
      : '∅';
    const productStr = reaction.products && reaction.products.length > 0
      ? reaction.products.map(p => `${p.coefficient > 1 ? p.coefficient : ''}${p["species name"]}`).join(' + ')
      : '∅';
    return `${reactantStr} → ${productStr}`;
  }

  // Filtered reactions list based on search
  const filteredReactions = reactions.filter((reaction) => {
    return formatReactionDisplay(reaction).toLowerCase().includes(reactionSearch.toLowerCase());
  });

  const [reactionType, setReactionType] = useState('ARRHENIUS')
  const [reactants, setReactants] = useState('')
  const [products, setProducts] = useState('')
  const [rateA, setRateA] = useState('1.0')
  const [rateB, setRateB] = useState('0.0')
  const [rateC, setRateC] = useState('0.0')
  const [rateD, setRateD] = useState('0.0')
  const [rateE, setRateE] = useState('0.0')
  const [emissionProduct, setEmissionProduct] = useState('')
  const [emissionScaling, setEmissionScaling] = useState('1.0')
  const [error, setError] = useState(null)

  // check if predefined mech
  const preDefinedMechanisms = {
    chapman: { name: 'Chapman', species: 5, reactions: 6, description: 'Stratospheric oxygen chemistry' },
    ts1: { name: 'TS1', species: 209, reactions: 512, description: '209 species tropospheric mechanism' },
    analytical: { name: 'Analytical', species: 3, reactions: 3, description: 'Simple test mechanism (A→B→C)' },
  }
  const isPredefined = preDefinedMechanisms[selectedMechanism]

  const reactionTypes = [
    { value: 'ARRHENIUS', label: 'Arrhenius (Temperature-dependent)' },
    { value: 'EMISSION', label: 'Emission' },
    { value: 'FIRST_ORDER_LOSS', label: 'First-Order Loss' },
    { value: 'PHOTOLYSIS', label: 'Photolysis (Light-dependent)' },
    { value: 'TERNARY_CHEMICAL_ACTIVATION', label: 'Ternary Chemical Activation' },
    { value: 'TROE', label: 'Troe (Fall-Off)' },
    { value: 'BRANCHED', label: 'Branched' },
    { value: 'TUNNELING', label: 'Tunneling' },
    { value: 'SURFACE_REACTION', label: 'Surface Reaction' },
    { value: 'USER_DEFINED', label: 'User-Defined Rate' },
    
    
  ]

  const parseReactionString = (str) => {
    // parse "A + 2B" format and normalize to uppercase
    return str
      .split('+')
      .map(s => s.trim())
      .filter(s => s)
      .map(s => {
        const match = s.match(/^(\d*\.?\d*)\s*(.+)$/)
        if (match) {
          const coeff = match[1] ? parseFloat(match[1]) : 1.0
          const name = match[2].trim().toUpperCase()  // Convert to uppercase
          return { "species name": name, "coefficient": coeff }
        }
        return { "species name": s.toUpperCase(), "coefficient": 1.0 }  // Convert to uppercase
      })
  }

  const handleAddReaction = () => {
    if (reactionType === 'EMISSION') {
      if (!emissionProduct) {
        setError('Please enter a product species name for emission')
        setTimeout(() => setError(null), 3000)
        return
      }
      if (isNaN(parseFloat(emissionScaling))) {
        setError('Scaling factor must be a valid number')
        setTimeout(() => setError(null), 3000)
        return
      }
    } else {
      if (!reactants) {
        setError('Please enter reactants')
        setTimeout(() => setError(null), 3000)
        return
      }
      // products can be empty for decay/loss reactions
      if (!products && reactionType !== 'USER_DEFINED') {
        setError('Please enter products (or use User-Defined type for decay reactions)')
        setTimeout(() => setError(null), 3000)
        return
      }
    }


    const A = parseFloat(rateA)
    const B = parseFloat(rateB)
    const C = parseFloat(rateC)
    const D = parseFloat(rateD)
    const E = parseFloat(rateE)
    if (reactionType === 'ARRHENIUS') {
      if (isNaN(A) || isNaN(B) || isNaN(C) || isNaN(D) || isNaN(E)) {
        setError('All Arrhenius parameters (A, B, C, D, E) must be valid numbers')
        setTimeout(() => setError(null), 3000)
        return
      }
    } else {
      if (isNaN(A)) {
        setError('Rate constant A must be a valid number')
        setTimeout(() => setError(null), 3000)
        return
      }
    }

    try {
      const parsedReactants = parseReactionString(reactants)
      const parsedProducts = products ? parseReactionString(products) : []

      // create normalized display name
      const normalizedReactants = reactants.toUpperCase()
      const normalizedProducts = products ? products.toUpperCase() : ''

      let newReaction
      if (reactionType === 'EMISSION') {
        newReaction = {
          id: uuidv4(),
          type: 'EMISSION',
          name: emissionProduct.toUpperCase(),
          'scaling factor': parseFloat(emissionScaling),
          products: [
            {
              'species name': emissionProduct.toUpperCase(),
              coefficient: 1.0
            }
          ],
          'gas phase': 'gas',
        }
      } else {
        newReaction = {
          id: uuidv4(),
          type: reactionType,
          "gas phase": 'gas',
          reactants: parsedReactants,
          products: parsedProducts,
          name: normalizedProducts ? `${normalizedReactants} → ${normalizedProducts}` : `${normalizedReactants} → (removed)`,
        }
      }

      // console.log(newReaction.reactants);
      // console.log(newReaction.products);
      // console.log(newReaction.type);
      // console.log(newReaction.name);
      console.log(newReaction);

      // add type-specific params

      if (reactionType === 'ARRHENIUS') {
        newReaction.A = A
        newReaction.B = B
        newReaction.C = C
        newReaction.D = D
        newReaction.E = E
      } else if (reactionType === 'PHOTOLYSIS' || reactionType === 'USER_DEFINED') {
        newReaction.scalingFactor = A
      }

      dispatch(addReaction(newReaction))

      toast({
        title: 'Reaction Added',
        description: `Successfully added reaction: ${newReaction.name}`,
        variant: 'success',
      })

      // reset form
      setReactants('')
      setProducts('')
      setRateA('1.0')
      setRateB('0.0')
      setRateC('0.0')
      setRateD('0.0')
      setRateE('0.0')
      setEmissionProduct('')
      setEmissionScaling('1.0')
    } catch (err) {
      setError('Invalid reaction format')
      setTimeout(() => setError(null), 3000)
      toast({
        title: 'Error',
        description: 'Invalid reaction format',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveReaction = (reactionId) => {
    const reaction = reactions.find(r => r.id === reactionId)
    dispatch(removeReaction(reactionId))
    toast({
      title: 'Reaction Removed',
      description: `Removed reaction: ${reaction?.name || 'Unknown'}`,
      variant: 'delete',
    })
  }

  // ...existing code... (formatReactionDisplay is now only defined once at the top)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reaction Editor</CardTitle>
          <CardDescription>
            {isPredefined
              ? `Viewing ${isPredefined.name} mechanism - reactions are pre-configured`
              : 'Add, edit, or remove chemical reactions in the mechanism'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Info box for predefined mechanisms */}
          {isPredefined && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 text-sm">
              <p className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Extending Pre-defined Mechanism
              </p>
              <p className="text-blue-700 text-xs">
                You can add custom reactions to the {isPredefined.name} mechanism.
                This allows you to extend the mechanism with additional chemistry for specialized simulations.
              </p>
            </div>
          )}

          {/* Add New Reaction Form (shown for all mechanisms) */}
          <div className="p-4 bg-white/0 backdrop-blur-lg rounded-xl border-2 border-white/20">
            <h4 className="font-bold text-sm mb-3 text-blue-100 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Reaction
            </h4>

            {error && (
              <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-3 py-2 rounded mb-3 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-blue-100 mb-1">
                  Reaction Type
                </label>
                <select
                  value={reactionType}
                  onChange={(e) => setReactionType(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-black placeholder:text-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  style={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {reactionTypes.map(type => (
                    <option
                      key={type.value}
                      value={type.value}
                      style={{ color: 'black', backgroundColor: 'rgba(255,255,255,0.95)' }}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {reactionType !== 'EMISSION' && (
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
              )}

              {reactionType !== 'EMISSION' && (
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
              )}

              {reactionType === 'EMISSION' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                      Product Species Name
                    </label>
                    <input
                      type="text"
                      value={emissionProduct}
                      onChange={(e) => setEmissionProduct(e.target.value)}
                      placeholder="ISOP"
                      className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                      Scaling Factor
                    </label>
                    <input
                      type="text"
                      value={emissionScaling}
                      onChange={(e) => setEmissionScaling(e.target.value)}
                      placeholder="1.0"
                      className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              {reactionType === 'ARRHENIUS' && (
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
                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                      Parameter B
                    </label>
                    <input
                      type="text"
                      value={rateB}
                      onChange={(e) => setRateB(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                      Parameter C
                    </label>
                    <input
                      type="text"
                      value={rateC}
                      onChange={(e) => setRateC(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                      Parameter D
                    </label>
                    <input
                      type="text"
                      value={rateD}
                      onChange={(e) => setRateD(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-100 mb-1">
                      Parameter E
                    </label>
                    <input
                      type="text"
                      value={rateE}
                      onChange={(e) => setRateE(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              {(reactionType === 'PHOTOLYSIS' || reactionType === 'USER_DEFINED') && (
                <div>
                  <label className="block text-xs font-semibold text-blue-100 mb-1">
                    Scaling Factor (rate multiplier)
                  </label>
                  <input
                    type="text"
                    value={rateA}
                    onChange={(e) => setRateA(e.target.value)}
                    placeholder="1.0"
                    className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleAddReaction}
              variant="apple"
              size="default"
              className="mt-3 rounded-2xl"
            >
              Add Reaction
            </Button>
          </div>

          {/* Reactions List with Search */}
          <div>
            <h4 className="font-semibold text-sm mb-2">
              {isPredefined
                ? `${isPredefined.name} Mechanism Reactions (${isPredefined.reactions} pre-configured${reactions.length > 0 ? ` + ${reactions.length} custom` : ''})`
                : `Reactions List (${reactions.length} total)`}
            </h4>

            {/* Search Bar */}
            <input
              type="text"
              value={reactionSearch}
              onChange={e => setReactionSearch(e.target.value)}
              placeholder="Search reactions by formula"
              className="w-full mb-3 px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            {isPredefined && reactions.length === 0 ? (
              <div className="text-center py-8 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20">
                <div className="flex justify-center mb-2">
                  <FlaskConical className="w-16 h-16" />
                </div>
                <p className="text-blue-100 font-medium mb-1">
                  {isPredefined.reactions} reactions are pre-configured in this mechanism
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  Reaction definitions are loaded from the mechanism config file
                </p>
                <p className="text-xs text-blue-300">
                  Add custom reactions above to extend the mechanism
                </p>
              </div>
            ) : isPredefined && reactions.length > 0 ? (
              <div>
                <div className="text-center py-4 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-3">
                  <p className="text-blue-100 font-medium text-sm mb-1">
                    {isPredefined.reactions} pre-configured + {reactions.length} custom reactions
                  </p>
                  <p className="text-xs text-gray-400">
                    Custom reactions shown below
                  </p>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredReactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No matching reactions found.</p>
                  ) : (
                    filteredReactions.map((reaction) => (
                      <div
                        key={reaction.id}
                        className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm font-mono">{formatReactionDisplay(reaction)}</h5>
                          <p className="text-xs text-gray-300">
                            Type: {reaction.type} •
                            {reaction.type === 'ARRHENIUS' ? ` A = ${reaction.A}` : ` Scale = ${reaction.scalingFactor}`}
                          </p>
                        </div>

                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => handleRemoveReaction(reaction.id)}
                          className="rounded-lg text-red-600 hover:bg-red-900/20 backdrop-blur-lg"
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : reactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No reactions defined. Add your first reaction above.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredReactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No matching reactions found.</p>
                ) : (
                  filteredReactions.map((reaction) => (
                    <div
                      key={reaction.id}
                      className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm font-mono">
                          {formatReactionDisplay(reaction)}
                        </h5>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-white/10 backdrop-blur-lg border border-white/20 text-blue-400 rounded">
                            {reaction.type}
                          </span>
                          {reaction.A && (
                            <span className="text-xs text-gray-300">
                              A = {reaction.A.toExponential(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => handleRemoveReaction(reaction.id)}
                        className="rounded-lg text-red-600 hover:bg-red-900/20 backdrop-blur-lg"
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-xs text-gray-300">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Reaction Editor Notes:
        </p>
        <ul className="space-y-0.5 ml-4">
          <li>• Use "+" to separate multiple reactants or products</li>
          <li>• Use numbers for stoichiometric coefficients (e.g., "2NO2")</li>
          <li>• Arrhenius reactions require rate constant A</li>
          <li>• Photolysis reactions will use user-defined rate parameters</li>
        </ul>
      </div>
    </div>
  )
}

export default ReactionEditor
