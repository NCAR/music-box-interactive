import { useEffect, useState } from 'react'

function RangeInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed)) onCommit(parsed)
    else setDraft(String(value))
  }

  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
      className="w-24 border rounded px-2 py-1 bg-white text-black"
    />
  )
}

export function MultiRange({ values, minIndex, maxIndex, onChange }) {
  const toValue = (idx) => values[Math.max(0, Math.min(idx, values.length - 1))] ?? 0
  const toIndex = (val) =>
    values.reduce(
      (bestIdx, v, i) => (Math.abs(v - val) < Math.abs(values[bestIdx] - val) ? i : bestIdx),
      0
    )

  const max = values.length - 1

  return (
    <div className="flex flex-col gap-2">
      {/* Number inputs */}
      <div className="flex gap-2 items-center">
        <RangeInput
          value={toValue(minIndex)}
          onCommit={(val) => {
            const snappedIdx = Math.min(toIndex(val), maxIndex)
            onChange({ minIndex: snappedIdx, maxIndex })
          }}
        />
        <span>to</span>
        <RangeInput
          value={toValue(maxIndex)}
          onCommit={(val) => {
            const snappedIdx = Math.max(toIndex(val), minIndex)
            onChange({ minIndex, maxIndex: snappedIdx })
          }}
        />
      </div>

      {/* Min/max labels */}
      <div className="flex justify-between text-sm text-gray-400">
        <span>{toValue(0)}</span>
        <span>{toValue(max)}</span>
      </div>
    </div>
  )
}
