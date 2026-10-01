import { useState } from 'react'
import { Dropdown } from '../ui/dropdown'
import { CATEGORIES } from '../../services/conditions/conditionItems'
import { TEXT_INPUT_SM } from '../Mechanism/fieldStyles'

const ALL = 'all'

function DataPointCount({ count }) {
  return (
    <span
      className={`w-16 flex-shrink-0 text-right text-xs ${count > 0 ? 'text-action' : 'text-muted'}`}
    >
      {count === 0 ? 'No data' : `${count} ${count === 1 ? 'point' : 'points'}`}
    </span>
  )
}

const linkButton =
  'text-sm font-medium text-action hover:underline disabled:text-muted disabled:no-underline'

// A checkbox list of condition items with a text search, a category filter and a type filter.
// Select all / Deselect all act on the items that the filters show.
//   items    - [{ key, header, label, category, group }]
//   selected - Set of selected keys
//   onChange - receives the next Set of selected keys
//   dataCounts - optional Map of key -> number of data points, shown in the list
export function ConditionItemPicker({ items, selected, onChange, dataCounts }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [group, setGroup] = useState(ALL)

  const categoryOptions = [
    { value: ALL, label: 'All categories' },
    ...CATEGORIES.filter((c) => items.some((item) => item.category === c.id)).map((c) => ({
      value: c.id,
      label: c.label,
    })),
  ]
  const groups = [
    ...new Set(
      items
        .filter((item) => category === ALL || item.category === category)
        .map((item) => item.group)
    ),
  ]
  const groupOptions = [
    { value: ALL, label: 'All types' },
    ...groups.map((name) => ({ value: name, label: name })),
  ]

  const query = search.trim().toLowerCase()
  const visible = items.filter(
    (item) =>
      (category === ALL || item.category === category) &&
      (group === ALL || item.group === group) &&
      (query === '' ||
        item.label.toLowerCase().includes(query) ||
        item.header.toLowerCase().includes(query))
  )

  const setVisible = (isSelected) => {
    const next = new Set(selected)
    visible.forEach((item) => (isSelected ? next.add(item.key) : next.delete(item.key)))
    onChange(next)
  }

  const toggle = (key) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          aria-label="Search conditions"
          className={`${TEXT_INPUT_SM} w-full text-left`}
        />
        <Dropdown
          value={category}
          options={categoryOptions}
          onChange={(value) => {
            setCategory(value)
            setGroup(ALL)
          }}
          className="h-9"
        />
        <Dropdown value={group} options={groupOptions} onChange={setGroup} className="h-9" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted">
          {selected.size} of {items.length} selected
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            className={linkButton}
            onClick={() => setVisible(true)}
            disabled={visible.length === 0}
          >
            Select all
          </button>
          <button
            type="button"
            className={linkButton}
            onClick={() => setVisible(false)}
            disabled={visible.length === 0}
          >
            Deselect all
          </button>
        </div>
      </div>

      <ul className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {visible.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-muted">No matches</li>
        )}
        {visible.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-hover">
              <input
                type="checkbox"
                checked={selected.has(item.key)}
                onChange={() => toggle(item.key)}
                className="h-4 w-4 flex-shrink-0 accent-action"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{item.label}</span>
                <span className="block truncate font-mono text-xs text-muted">{item.header}</span>
              </span>
              <span className="flex-shrink-0 text-xs text-muted">{item.group}</span>
              {dataCounts && <DataPointCount count={dataCounts.get(item.key) ?? 0} />}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ConditionItemPicker
