import React from 'react';
import styles from './table.module.scss';

/**
 * Stacked up/down triangles for column sort. Layers are toggled by TableColumnHeader:
 * sortOrder 1 (asc): lower triangle emphasized; -1 (desc): upper; 0 / unsorted: both dim.
 */
export default function TableColumnSortIcon({ className = '' }) {
  return (
    <svg
      className={`${styles['column-header-sort-svg']} ${className}`.trim()}
      width={16}
      height={16}
      viewBox="0 0 12 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Upper = point up (emphasized when descending) */}
      <g data-table-sort-layer="upper" style={{ opacity: 0.35 }}>
        <path d="M 6 2.5 L 9.5 7.5 L 2.5 7.5 Z" fill="currentColor" />
      </g>
      {/* Lower = point down (emphasized when ascending) */}
      <g data-table-sort-layer="lower" style={{ opacity: 0.35 }}>
        <path d="M 6 13.5 L 9.5 8.5 L 2.5 8.5 Z" fill="currentColor" />
      </g>
    </svg>
  );
}
