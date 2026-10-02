import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { ColumnLabel } from './ColumnLabel'

// The Add card above a table, laid out as a one-row table: the column labels on top, one field
// under each label. The styling follows the tables below it.
//   columns - [{ id, label, unit?, unitTitle?, className? }]
//   render  - (column) => the field for that column
//   action  - shown at the top right of the card, e.g. the Add button
export function AddRowCard({ title, columns, render, action }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-border">
          <table className="w-full text-sm" aria-label={title}>
            <thead className="bg-assist-secondary text-assist-secondary-foreground">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={`px-4 py-2 text-left font-semibold ${column.className ?? ''}`}
                  >
                    <ColumnLabel {...column} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`px-4 py-2 align-middle ${column.className ?? ''}`}
                  >
                    {render(column)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default AddRowCard
