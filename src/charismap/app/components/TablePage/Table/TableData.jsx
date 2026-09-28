'use client';

import React, { useRef, useLayoutEffect } from 'react';
import { Checkbox } from 'antd';

/**
 * Main grid: header block mirrors `.sticky-column-header-block` (sticky to `.table-scroll-stage`,
 * sibling of horizontal body scroll). `scrollLeft` is synced between header strip and body.
 */
export default function TableData({
  styles,
  stickyColumns,
  tableStyle,
  columnSuperHeadersJSX,
  customHeaderStyle,
  colHeaderRowRef,
  columnHeadersJSX,
  selectable,
  selectType,
  conditionalSelectable,
  setSelected,
  displayRows,
  selected,
  setSelectAllSelected,
  selectAllSelected,
  scrollBodyRef,
  rowDataJSX,
  tableRowsBodyStyle,
}) {
  const mainHeaderScrollRef = useRef(null);
  const bodyHScrollRef = useRef(null);

  // Horizontal scroll sync: body strip is the only scrollable surface (header
  // strip is `overflow-x: hidden`), and on every body scroll we mirror its
  // scrollLeft onto the header. One-way avoids the bidirectional feedback
  // loop that was making the header drift / "accelerate" on Safari and
  // momentum scroll: `el.scrollLeft = X` fires another `scroll` event, which
  //, with sub-pixel rounding, could leave the two values forever `!==` and
  // pump scrollLeft past the user's actual position.
  useLayoutEffect(() => {
    const headerEl = mainHeaderScrollRef.current;
    const bodyEl = bodyHScrollRef.current;
    if (!headerEl || !bodyEl) return undefined;

    const syncHeaderToBody = () => {
      const target = bodyEl.scrollLeft;
      if (headerEl.scrollLeft !== target) {
        headerEl.scrollLeft = target;
      }
    };

    bodyEl.addEventListener('scroll', syncHeaderToBody, { passive: true });
    syncHeaderToBody();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(syncHeaderToBody)
        : null;
    ro?.observe(bodyEl);

    return () => {
      bodyEl.removeEventListener('scroll', syncHeaderToBody);
      ro?.disconnect();
    };
  }, [columnHeadersJSX, columnSuperHeadersJSX, rowDataJSX]);

  return (
    <div
      className={styles['table-data']}
      style={{
        borderTopRightRadius: stickyColumns.filter((col) => col.show).length ? '0' : '5px',
        borderBottomRightRadius: stickyColumns.filter((col) => col.show).length ? '0' : '5px',
        borderRight: stickyColumns.filter((col) => col.show).length ? '0px' : '1px solid #E9E9EA;',
        ...tableStyle,
      }}
    >
      <div className={styles['mainColumnHeaderBlock']}>
        <div ref={mainHeaderScrollRef} className={styles['mainColumnHeaderScroll']}>
          <div className={styles['floatingHeaderOverlay']}>
            <div className={styles['floatingHeaderInner']}>
              {Array.isArray(columnSuperHeadersJSX) && columnSuperHeadersJSX.length > 0 ? (
                <div
                  className={`${styles['column-header-row']} ${styles['super-headers']}`}
                >
                  {columnSuperHeadersJSX}
                </div>
              ) : null}
              <div className={styles['column-headers']}>
                <div
                  className={styles['column-header-row']}
                  style={{ ...customHeaderStyle }}
                  ref={colHeaderRowRef}
                >
                  {columnHeadersJSX}
                </div>
                {selectable && selectType === 'checkbox' && (
                  <div className={styles['column-header-checkbox']}>
                    <Checkbox
                      disabled={conditionalSelectable?.includes(false)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(
                            new Set([...selected, ...displayRows?.map((row) => +row?.tableSerialNumber - 1)])
                          );
                        } else {
                          let s = new Set([...selected]);
                          for (const row of displayRows) {
                            s.delete(+row?.tableSerialNumber - 1);
                          }
                          setSelected(s);
                        }
                        setSelectAllSelected(e.target.checked);
                      }}
                      checked={selectAllSelected}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={bodyHScrollRef} className={styles['tableDataHScroll']}>
        <div ref={scrollBodyRef} className={styles['spf-table']}>
          <div className={styles['table-rows-body']} style={tableRowsBodyStyle}>
            {rowDataJSX}
          </div>
        </div>
      </div>
    </div>
  );
}
