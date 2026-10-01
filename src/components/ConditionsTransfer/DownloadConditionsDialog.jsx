import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { ConditionItemPicker } from './ConditionItemPicker'
import { useNotify } from '@/hooks/use-notify'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import { countDataPoints, listConditionItems } from '../../services/conditions/conditionItems'
import { downloadConditions } from '../../services/conditions/exportConditions'

const LAYOUTS = [
  { id: 'single', label: 'One CSV file', detail: 'conditions.csv, with all the selected columns' },
  {
    id: 'perCategory',
    label: 'One CSV file for each category',
    detail: 'conditions.zip, with environment, species and rate parameter files',
  },
]

const parseTime = (text) => (text.trim() === '' ? null : Number(text))

// Lets the user select the condition columns, the layout and the time range to download.
export function DownloadConditionsDialog({ onClose }) {
  const notify = useNotify()
  const species = useSelector((state) => state.mechanism.config.mechanism?.species || EMPTY_ARRAY)
  const reactions = useSelector(
    (state) => state.mechanism.config.mechanism?.reactions || EMPTY_ARRAY
  )
  const table = useSelector((state) => state.conditions.table)

  const items = useMemo(
    () => listConditionItems({ species, reactions, table }),
    [species, reactions, table]
  )
  const dataCounts = useMemo(() => countDataPoints(table), [table])

  const [selected, setSelected] = useState(() => new Set(items.map((item) => item.key)))
  const [layout, setLayout] = useState('single')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const startTime = parseTime(start)
  const endTime = parseTime(end)
  const rangeError =
    (startTime !== null && !(startTime >= 0)) || (endTime !== null && !(endTime >= 0))
      ? 'Times must be numbers of 0 or more.'
      : startTime !== null && endTime !== null && startTime > endTime
        ? 'The start time must not be after the end time.'
        : null

  const handleDownload = () => {
    try {
      downloadConditions({
        table,
        items: items.filter((item) => selected.has(item.key)),
        layout,
        timeRange: { start: startTime, end: endTime },
      })
      notify.success('Conditions Downloaded', `Downloaded ${selected.size} condition columns.`)
      onClose()
    } catch (error) {
      notify.error('Download Failed', error.message)
    }
  }

  return (
    <Dialog
      title="Download Conditions"
      description="Unset values are left empty in the file."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={selected.size === 0 || rangeError !== null}>
            Download
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Columns</h3>
          <ConditionItemPicker
            items={items}
            selected={selected}
            onChange={setSelected}
            dataCounts={dataCounts}
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">Time range (s)</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="Start"
              aria-label="Start time"
              className={`${TEXT_INPUT_SM} w-32`}
            />
            <span className="text-sm text-muted">to</span>
            <input
              type="number"
              min="0"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="End"
              aria-label="End time"
              className={`${TEXT_INPUT_SM} w-32`}
            />
          </div>
          <p className={`mt-1 text-xs ${rangeError ? 'text-danger' : 'text-muted'}`}>
            {rangeError ?? 'Leave a field empty for no limit.'}
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">File layout</h3>
          <div className="space-y-2">
            {LAYOUTS.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="conditions-layout"
                  checked={layout === option.id}
                  onChange={() => setLayout(option.id)}
                  className="mt-1 accent-action"
                />
                <span>
                  <span className="block text-sm text-ink">{option.label}</span>
                  <span className="block text-xs text-muted">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </Dialog>
  )
}

export default DownloadConditionsDialog
