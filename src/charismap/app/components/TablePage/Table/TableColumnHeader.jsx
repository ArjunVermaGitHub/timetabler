import React, { useEffect, useRef } from 'react'
import tableUtils from './tableUtils';
import styles from './table.module.scss';
import TableColumnSortIcon from './TableColumnSortIcon';

const SORT_LAYER_UPPER = '[data-table-sort-layer="upper"]';
const SORT_LAYER_LOWER = '[data-table-sort-layer="lower"]';

export default function TableColumnHeader({
    column,
    columnsWithoutSorting,
    customSort,
    index,
    inStickySection,
    sorting,
    sortKey,
    sortOrder,
    setSortOrder,
    setSortKey,
    selectable,
    sharedHeaderStyle = {},
}) {
  const ref = useRef()
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const upper = root.querySelector(SORT_LAYER_UPPER)
    const lower = root.querySelector(SORT_LAYER_LOWER)
    if (!upper || !lower) return

    const light = '0.35'
    const strong = '1'

    if (sortKey === column?.field) {
      if (sortOrder === 1) {
        upper.style.opacity = light
        lower.style.opacity = strong
      } else if (sortOrder === -1) {
        upper.style.opacity = strong
        lower.style.opacity = light
      } else {
        /* unsorted (0) or unknown, neither arrow emphasized */
        upper.style.opacity = light
        lower.style.opacity = light
      }
    } else {
      upper.style.opacity = light
      lower.style.opacity = light
    }
  }, [sortOrder, sortKey, column?.field])
  
  return (
    <div
      className={styles['column-header']}
      key={column?.field}
      ref={ref}
      style={{
        boxSizing: 'border-box',
        ...sharedHeaderStyle,
        ...column.headerStyle,
        /* Mirror the cell-sizing scheme from TableRow so the header tracks the
           body: sticky rail headers stay at their fixed column.width, main-grid
           headers flex-grow equally with column.width as a min-width floor. */
        ...(inStickySection
          ? { width: column?.width, minWidth: column?.width, flexShrink: 0 }
          : column?.fixedWidth
            ? {
                width: column?.width,
                minWidth: column?.width,
                maxWidth: column?.width,
                flex: '0 0 auto',
                flexShrink: 0,
              }
            : { minWidth: column?.width, flex: '1 1 0%' }),
        ...(index === 0
          ? {
              paddingLeft: selectable && !inStickySection ? '63px' : '20px',
              marginLeft: 0,
            }
          : {}),
      }}
    >
      {tableUtils.camelToTitleCase(column?.header) ?? tableUtils.camelToTitleCase(column?.field)}{' '}
      {sorting && !columnsWithoutSorting.has(column?.field) && (
        <button
          type="button"
          className={styles['column-header-sort-trigger']}
          aria-label={`Sort by ${tableUtils.camelToTitleCase(column?.header) ?? column?.field}`}
          onClick={
            customSort
              ? column?.onClick ?? (() => null)
              : () => {
                  if (sortKey !== column?.field) {
                    setSortKey(column?.field);
                    setSortOrder(1);
                    return;
                  }
                  setSortOrder(sortOrder === 1 ? -1 : sortOrder === -1 ? 0 : 1);
                }
          }
        >
          <TableColumnSortIcon className={styles['column-header-sort-icon']} />
        </button>
      )}
    </div>
  )
}
