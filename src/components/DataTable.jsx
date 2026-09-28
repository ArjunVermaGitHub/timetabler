import TablePage from '@/app/components/TablePage'

/**
 * Charismap's TablePage, verbatim. It themes itself from CSS variables set in
 * charismap-theme.css; pass `themeVars` to override any of them per table.
 */
export function DataTable({ themeVars, name, columns, data, searchableFields, ...tableProps }) {
  return (
    <div className="charismap-table" style={themeVars}>
      <TablePage
        name={name}
        tableTitle=""
        columns={columns}
        initialData={data}
        beFiltering={false}
        sorting
        searchable
        showTitle={false}
        downloadable
        selectable={false}
        showPagination={data.length > 10}
        // TablePage matches on `{ field }` objects; plain names match nothing
        searchableFields={searchableFields?.map((f) =>
          typeof f === 'string' ? { field: f } : f,
        )}
        {...tableProps}
      />
    </div>
  )
}
