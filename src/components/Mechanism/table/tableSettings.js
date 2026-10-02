import { useCallback, useState } from 'react'

// The column choice and the page size of a table, saved per browser (localStorage), so a
// table looks the same after a reload.

export const PAGE_SIZES = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

const storageKey = (tableId) => `musicbox.table.${tableId}`

function readSettings(tableId) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey(tableId)) || '{}')
    return {
      hidden: Array.isArray(stored.hidden) ? stored.hidden : [],
      pageSize: PAGE_SIZES.includes(stored.pageSize) ? stored.pageSize : DEFAULT_PAGE_SIZE,
    }
  } catch {
    return { hidden: [], pageSize: DEFAULT_PAGE_SIZE }
  }
}

function saveSettings(tableId, settings) {
  try {
    window.localStorage.setItem(storageKey(tableId), JSON.stringify(settings))
  } catch {
    // Storage can be blocked (private windows). The choice then lasts for this page only.
  }
}

export function useTableSettings(tableId) {
  const [settings, setSettings] = useState(() => readSettings(tableId))

  const update = useCallback(
    (change) =>
      setSettings((previous) => {
        const next = { ...previous, ...change }
        saveSettings(tableId, next)
        return next
      }),
    [tableId]
  )

  const hidden = new Set(settings.hidden)
  return {
    hidden,
    pageSize: settings.pageSize,
    setColumnShown: (id, shown) => {
      const next = new Set(hidden)
      if (shown) next.delete(id)
      else next.add(id)
      update({ hidden: [...next] })
    },
    setPageSize: (pageSize) => update({ pageSize }),
  }
}
