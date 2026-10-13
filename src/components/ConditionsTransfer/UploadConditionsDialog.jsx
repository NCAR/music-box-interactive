import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { ConditionItemPicker } from './ConditionItemPicker'
import { useNotify } from '@/hooks/use-notify'
import { setConditionsTable, setRowReactionTypes } from '../../redux/slices/conditionsSlice'
import { applyConditionsUpload } from '../../services/conditions/importConditions'

const MODES = [
  {
    id: 'replace',
    label: 'Replace all conditions',
    detail:
      'Clears all the conditions first. The table then holds only the selected columns of the file.',
  },
  {
    id: 'merge',
    label: 'Merge by column',
    detail:
      'Changes only the selected columns at the times in the file. All other conditions stay.',
  },
]

const MAX_LISTED_SKIPPED = 5

// Shows the columns of an uploaded conditions file before it is applied. `upload` comes from
// buildConditionsUpload.
export function UploadConditionsDialog({ fileName, upload, onClose }) {
  const dispatch = useDispatch()
  const notify = useNotify()
  const table = useSelector((state) => state.conditions.table)
  const rowReactionTypes = useSelector((state) => state.conditions.rowReactionType)

  // The picker shows each column under the header that the file uses.
  const items = useMemo(
    () => upload.columns.map(({ item, header }) => ({ ...item, header })),
    [upload]
  )
  const [selected, setSelected] = useState(() => new Set(items.map((item) => item.key)))
  const [mode, setMode] = useState('replace')
  const [emptyOverwrites, setEmptyOverwrites] = useState(false)

  const { times, skipped } = upload
  const timeSummary =
    times.length === 0
      ? 'no rows'
      : `${times.length} ${times.length === 1 ? 'time' : 'times'}, from ${times[0]} s to ${times[times.length - 1]} s`

  const handleApply = () => {
    const next = applyConditionsUpload(table, upload, { keys: selected, mode, emptyOverwrites })
    dispatch(setConditionsTable(next))
    // A row tag only means something for a row that still exists.
    dispatch(
      setRowReactionTypes(
        mode === 'replace'
          ? {}
          : Object.fromEntries(
              Object.entries(rowReactionTypes || {}).filter(([time]) =>
                next.times.includes(Number(time))
              )
            )
      )
    )

    notify.success('Conditions Uploaded', `Applied ${selected.size} columns from ${fileName}.`)
    if (skipped.length > 0) {
      const listed = skipped.slice(0, MAX_LISTED_SKIPPED).map((s) => s.header)
      const more = skipped.length - listed.length
      notify.warning(
        'Columns Skipped',
        `${listed.join(', ')}${more > 0 ? ` and ${more} more` : ''} ${skipped.length === 1 ? 'was' : 'were'} not applied.`
      )
    }
    onClose()
  }

  return (
    <Dialog
      title="Upload Conditions"
      description={`${fileName}: ${upload.columns.length} columns, ${timeSummary}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selected.size === 0 && mode === 'merge'}>
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Columns to apply</h3>
          {items.length > 0 ? (
            <ConditionItemPicker items={items} selected={selected} onChange={setSelected} />
          ) : (
            <p className="text-sm text-muted">The file has no columns that the mechanism uses.</p>
          )}
        </section>

        {skipped.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink">
              Skipped columns ({skipped.length})
            </h3>
            <ul className="max-h-32 overflow-y-auto rounded-lg border border-border bg-caution px-3 py-2 text-xs">
              {skipped.map((s) => (
                <li key={`${s.file}:${s.header}`} className="py-0.5">
                  <span className="font-mono text-ink">{s.header}</span>
                  <span className="text-muted">
                    {' '}
                    ({s.file}): {s.reason}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">How to apply</h3>
          <div className="space-y-2">
            {MODES.map((option) => (
              <div key={option.id}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="conditions-upload-mode"
                    checked={mode === option.id}
                    onChange={() => setMode(option.id)}
                    className="mt-1 accent-action"
                  />
                  <span>
                    <span className="block text-sm text-ink">{option.label}</span>
                    <span className="block text-xs text-muted">{option.detail}</span>
                  </span>
                </label>

                {/* The option belongs to Merge: Replace clears everything first, so an empty
                    cell has no existing value to overwrite. */}
                {option.id === 'merge' && (
                  <label
                    className={`ml-7 mt-2 flex items-start gap-3 ${
                      mode === 'merge' ? 'cursor-pointer' : 'opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={emptyOverwrites}
                      disabled={mode !== 'merge'}
                      onChange={(e) => setEmptyOverwrites(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-action"
                    />
                    <span>
                      <span className="block text-sm text-ink">
                        Empty cells overwrite existing data
                      </span>
                      <span className="block text-xs text-muted">
                        When on, an empty cell clears the existing value at that time. When off,
                        the existing value stays.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Dialog>
  )
}

export default UploadConditionsDialog
