import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { addReaction, removeReaction } from '../../redux/slices/mechanismSlice'
import { Plus, FlaskConical, Lightbulb } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getReactionDefinition, reactionRegistry } from './reactions/reactionRegistry'

// visual editor for reactions in the mechanism
export function ReactionEditor() {

  const dispatch = useDispatch()
  const { toast } = useToast()
  const reactions = useSelector((state) => state.mechanism.reactions)
  const selectedMechanism = useSelector((state) => state.mechanism.selectedMechanism)

  const [reactionType, setReactionType] = useState(reactionRegistry[0].type)

  // check if predefined mech
  const preDefinedMechanisms = {
    chapman: { name: 'Chapman', species: 5, reactions: 6, description: 'Stratospheric oxygen chemistry' },
    ts1: { name: 'TS1', species: 209, reactions: 512, description: '209 species tropospheric mechanism' },
    analytical: { name: 'Analytical', species: 3, reactions: 3, description: 'Simple test mechanism (A→B→C)' },
  }
  const isPredefined = preDefinedMechanisms[selectedMechanism]

  const activeReactionDefinition = getReactionDefinition(reactionType)
  const ActiveReactionForm = activeReactionDefinition.component

  const handleAddReaction = (newReaction) => {
    dispatch(addReaction(newReaction))
    toast({
      title: 'Reaction Added',
      description: `Successfully added reaction: ${newReaction.name || formatReactionDisplay(newReaction)}`,
      variant: 'success',
    })
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

  const formatReactionComponents = (components) => {
    if (!Array.isArray(components) || components.length === 0) {
      return '∅'
    }

    return components
      .map((component) => {
        if (typeof component === 'string') {
          return component
        }

        const name = component['species name'] || component.name || ''
        const coefficient = Number(component.coefficient)
        const coeffPrefix = Number.isFinite(coefficient) && coefficient > 1 ? coefficient : ''

        return `${coeffPrefix}${name}`
      })
      .join(' + ')
  }

  const formatReactionDisplay = (reaction) => {
    const reactants = reaction.reactants || reaction['gas-phase species'] || []
    const products = reaction.products || reaction['gas-phase products'] || reaction['alkoxy products'] || []

    const reactantStr = formatReactionComponents(Array.isArray(reactants) ? reactants : [reactants])
    const productStr = formatReactionComponents(Array.isArray(products) ? products : [products])

    return `${reactantStr} → ${productStr}`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reaction Editor</CardTitle>
          <CardDescription>
            {'Add, edit, or remove chemical reactions in the mechanism'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">


          {/* Add New Reaction Form (shown for all mechanisms) */}
          <div className="p-4 bg-white/0 backdrop-blur-lg rounded-xl border-2 border-white/20">
            <h4 className="font-bold text-sm mb-3 text-blue-100 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Reaction
            </h4>

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
                  {reactionRegistry.map((type) => (
                    <option
                      key={type.type}
                      value={type.type}
                      style={{ color: 'black', backgroundColor: 'rgba(255,255,255,0.95)' }}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <ActiveReactionForm
                onAddReaction={handleAddReaction}
                {...(activeReactionDefinition.componentProps || {})}
              />
            </div>
          </div>

          {/* Reactions List with Search */}
          <div>
            <h4 className="font-semibold text-sm mb-2">
              {`Reactions List (${reactions.length} total)`}
            </h4>

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
                  {reactions.map((reaction) => (
                    <div
                      key={reaction.id}
                      className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm font-mono">{formatReactionDisplay(reaction)}</h5>
                        <p className="text-xs text-gray-300">
                          Type: {reaction.type}
                          {reaction.A !== undefined && ` • A = ${reaction.A}`}
                          {reaction.A === undefined && (reaction.scalingFactor !== undefined || reaction['scaling factor'] !== undefined)
                            && ` • Scale = ${reaction.scalingFactor ?? reaction['scaling factor']}`}
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
                  ))}
                </div>
              </div>
            ) : reactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No reactions defined. Add your first reaction above.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reactions.map((reaction) => (
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
                        {reaction.A !== undefined && (
                          <span className="text-xs text-gray-300">
                            A = {reaction.A.toExponential(2)}
                          </span>
                        )}
                        {reaction.A === undefined && (reaction.scalingFactor !== undefined || reaction['scaling factor'] !== undefined) && (
                          <span className="text-xs text-gray-300">
                            Scale = {reaction.scalingFactor ?? reaction['scaling factor']}
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
