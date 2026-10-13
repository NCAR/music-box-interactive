// Renders text with ^ before a superscript and _ before a subscript, e.g. "(# cm^-3)^-(n-1) s^-1"
// or "e^(C/T) and k_B". A script is a number or word with an optional minus, or a parenthesised
// expression. Parentheses show only when a minus precedes them, so "^(C/T)" reads "C/T" raised
// but "^-(n-1)" keeps its brackets.
const SCRIPT = /([\^_])(-?\([^)]*\)|-?\w+(?:\.\d+)?)/g

export function FormulaText({ text }) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(SCRIPT)) {
    parts.push(text.slice(last, match.index))
    const Tag = match[1] === '^' ? 'sup' : 'sub'
    const body = match[2].startsWith('(') ? match[2].slice(1, -1) : match[2]
    parts.push(<Tag key={match.index}>{body.replace(/^-/, '−')}</Tag>)
    last = match.index + match[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
