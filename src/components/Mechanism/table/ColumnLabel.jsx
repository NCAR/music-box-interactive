// A column header: the label, then the unit in brackets, e.g. "C [K]". `unitTitle` explains a
// unit that needs it, as a tooltip.
export function ColumnLabel({ label, unit, unitTitle }) {
  return (
    <>
      {label}
      {unit && (
        <span className="ml-1 font-normal whitespace-nowrap" title={unitTitle}>
          [{unit}]
        </span>
      )}
    </>
  )
}

export default ColumnLabel
