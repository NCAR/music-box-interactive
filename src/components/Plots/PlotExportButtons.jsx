import { useCallback, useRef, useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useNotify } from '../../hooks/use-notify'
import { copyPlot, savePlot } from '../../utils/plotExport'

const ICON_BUTTON =
  'flex items-center justify-center w-7 h-7 rounded-md border border-border bg-white dark:bg-surface text-muted hover:text-ink hover:bg-surface-hover'

const FORMATS = [
  { id: 'png', label: 'PNG image' },
  { id: 'svg', label: 'SVG image' },
]

/**
 * Copy and Save buttons for one plot.
 * @param {Function} getSvg - Returns the SVG element of the plot
 * @param {Function} [getLegend] - Returns the legend entries, as {value, color}
 * @param {string} fileName - The file name without the extension
 */
export function PlotExportButtons({ getSvg, getLegend, fileName, className = '', style }) {
  const notify = useNotify()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useClickOutside(menuRef, closeMenu, menuOpen)

  const copy = async () => {
    const svg = getSvg()
    if (!svg) return
    try {
      await copyPlot(svg, { legend: getLegend?.() })
      notify.success('Plot Copied', 'The plot is on the clipboard as a PNG image.')
    } catch (error) {
      notify.error('Copy Failed', error.message || 'The plot could not be copied.')
    }
  }

  const save = async (format) => {
    setMenuOpen(false)
    const svg = getSvg()
    if (!svg) return
    try {
      await savePlot(svg, { legend: getLegend?.(), fileName, format })
    } catch (error) {
      notify.error('Save Failed', error.message || 'The plot could not be saved.')
    }
  }

  return (
    <div className={`flex gap-1 ${className}`} style={style}>
      <button
        type="button"
        onClick={copy}
        className={ICON_BUTTON}
        title="Copy plot to clipboard"
        aria-label="Copy plot to clipboard"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={ICON_BUTTON}
          title="Save plot"
          aria-label="Save plot"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-32 bg-white dark:bg-surface border border-border rounded-lg shadow-lg py-1"
          >
            {FORMATS.map((format) => (
              <button
                key={format.id}
                type="button"
                role="menuitem"
                onClick={() => save(format.id)}
                className="w-full text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
              >
                {format.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlotExportButtons
