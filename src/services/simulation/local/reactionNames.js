import { getReactionReactants } from './mechanism'

// The reaction types that take a rate parameter from the conditions, and the header prefix of
// that parameter (PHOTO.<name>.s-1, ...).
export const RATE_PARAMETER_PREFIXES = {
  PHOTOLYSIS: 'PHOTO',
  EMISSION: 'EMIS',
  FIRST_ORDER_LOSS: 'LOSS',
  USER_DEFINED: 'USER',
  SURFACE: 'SURF',
}

export const hasRateParameter = (reaction) => reaction?.type in RATE_PARAMETER_PREFIXES

const configuredName = (reaction) =>
  typeof reaction?.name === 'string' && reaction.name.trim() !== '' ? reaction.name.trim() : null

// A dot in a coefficient would split a PREFIX.name.unit header, so 0.5 becomes 0p5.
const componentsToString = (components = []) =>
  components
    .filter((component) => component?.name)
    .map((component) => {
      const coefficient = parseFloat(component.coefficient)
      if (coefficient === 1 || Number.isNaN(coefficient)) return component.name.trim()
      return `${String(coefficient).replace('.', 'p')} ${component.name.trim()}`
    })
    .join(' + ')

// The reaction formula, e.g. "O3 -> O + O2", "-> NO" (emission) or "O3 ->" (loss).
export function reactionFormula(reaction) {
  const reactants = getReactionReactants(reaction)
  const products = reaction?.products || reaction?.['gas-phase products'] || []
  const left = componentsToString(Array.isArray(reactants) ? reactants : [reactants])
  const right = componentsToString(Array.isArray(products) ? products : [products])
  return `${left} -> ${right}`.trim()
}

// The name of each rate-parameter reaction, by reaction id. A configured name is used as it
// is. A reaction without one gets its formula, with " (2)", " (3)", ... when another reaction
// of the same type already uses that name. The name is never stored: the mechanism keeps an
// empty name, and callers ask for it when they need it (display, headers, solver payload).
export function rateReactionNames(reactions = []) {
  const names = new Map()
  const used = new Map() // prefix -> Set of names

  const rateReactions = reactions.filter(hasRateParameter)
  const usedFor = (reaction) => {
    const prefix = RATE_PARAMETER_PREFIXES[reaction.type]
    if (!used.has(prefix)) used.set(prefix, new Set())
    return used.get(prefix)
  }

  // Configured names first, so a generated name never takes a configured one.
  rateReactions.forEach((reaction) => {
    const name = configuredName(reaction)
    if (name) {
      names.set(reaction.id, name)
      usedFor(reaction).add(name)
    }
  })
  rateReactions.forEach((reaction) => {
    if (configuredName(reaction)) return
    const taken = usedFor(reaction)
    const base = reactionFormula(reaction)
    let name = base
    for (let n = 2; taken.has(name); n++) name = `${base} (${n})`
    names.set(reaction.id, name)
    taken.add(name)
  })

  return names
}
