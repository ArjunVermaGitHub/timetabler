import React, { useEffect } from 'react';
import styles from './table.module.scss';
import { Checkbox, Radio } from "antd";
import Button from '../../Button';

export default function TableRow({
    actions = [],
    columns,
    conditionalSelectable,
    customCellStyle,
    columnStyles,
    displayColumns,
    embedDisplays,
    index,
    inStickySection,
    name,
    row,
    rowStyle,
    selectable,
    selected,
    selectedCB,
    selectType,
    setEmbedDisplays,
    setSelectAllSelected,
    setSelected,
    handleRowAction
}) {
    let arr = [];

    useEffect(() => {
        if (inStickySection) {
            let embeddedHeight = document.getElementById(name + '-table-embedded-' + (+row?.tableSerialNumber - 1))?.getBoundingClientRect().height
            if (name) {
                try {
                    // document.getElementById(name+'-table-embedded-'+(+row?.tableSerialNumber-1)).style.width = document.querySelector('.table-wrapper')?.getBoundingClientRect().width+'px'
                    document.getElementById(name + "-table-row-sticky-" + (+row?.tableSerialNumber - 1)).style.marginBottom = (embeddedHeight || 0) + 'px'
                    document.getElementById(name + '-table-row-wrapper-' + (+row?.tableSerialNumber - 1)).style.marginBottom = (embeddedHeight || 0) + 'px'
                }
                catch (err) {
                    console.error(err)
                }
            }
        }
    }, [embedDisplays])

    const rowIndex = +row?.tableSerialNumber - 1;

    displayColumns
        .filter((_, idx) => {
            const col = columns?.[idx];
            if (!col?.show) return false;
            // Legacy: `actions` were only supplied via the `actions` prop (see block below). Custom columns use `field: 'actions'` + renderFunction.
            if (col?.field === 'actions' && !col?.renderFunction) return false;
            return inStickySection === col?.sticky;
        })
        .forEach((column, colIndex) => {
            const columnStyleFromProp =
                typeof columnStyles === 'function'
                    ? (columnStyles(row?.[column?.field], rowIndex, row, column) || {})
                    : (columnStyles?.[column?.field] || {});
            const firstColGutter =
                colIndex === 0
                    ? selectable && !inStickySection
                        ? '63px'
                        : '20px'
                    : null;
            arr.push(<div className={styles['row-data'] + ' ' + (column?.field === 'embedsContent' ? styles['action-holder'] : '')}
                key={column?.field}
                style={{
                    boxSizing: 'border-box',
                    ...column?.style,
                    ...columnStyleFromProp,
                    ...(typeof customCellStyle === 'function'
                        ? customCellStyle(row, column, index, colIndex)
                        : customCellStyle),
                    /* Sticky rail cells keep fixed widths; main-grid cells flex-grow
                       equally (basis 0) with the computed intrinsic width as a
                       min-width floor. Gives 1/N distribution when the row fits the
                       viewport and lets the content-driven min-widths trigger the
                       usual horizontal scroll once the total exceeds it. */
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
                    ...(column?.style?.whiteSpace === 'nowrap'
                        ? { overflow: 'visible', textOverflow: 'clip' }
                        : {}),
                    ...(firstColGutter != null
                        ? { paddingLeft: firstColGutter, marginLeft: 0 }
                        : {}),
                    ...(column?.styleFunction ? column.styleFunction(row?.[column?.field], rowIndex, row) : {}),
                    ...(column?.styleArray?.[rowIndex] || {}),
                }} >
                {
                    column?.field !== 'embedsContent' ?
                        column?.renderFunction ?
                            column?.renderFunction(row?.[column?.field], index, row)
                            :
                            (row?.[column?.field] !== undefined && row?.[column?.field] !== '' && row?.[column?.field] !== null) || (row?.setBlank) || (row?.srNo === '') ? row?.[column?.field] : '-'
                        :
                        <button
                            type="button"
                            className={styles['embed-toggle-btn']}
                            aria-expanded={Boolean(embedDisplays?.[index])}
                            aria-label={embedDisplays?.[index] ? 'Collapse row details' : 'Expand row details'}
                            onClick={() => {
                                setEmbedDisplays({ ...embedDisplays, [index]: embedDisplays?.[index] ? false : row?.embedsContent })
                            }}
                            style={{
                                visibility: (row?.embedsContent && inStickySection) ? 'visible' : 'hidden',
                                height: (row?.embedsContent && inStickySection) ? 'auto' : '0',
                            }}
                        >
                            <svg
                                className={
                                    styles['embed-toggle-chevron'] +
                                    (embedDisplays?.[index] ? ' ' + styles['embed-toggle-chevron-open'] : '')
                                }
                                width={18}
                                height={18}
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden
                            >
                                <path
                                    d="M6 9l6 6 6-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                }
            </div>);
        });

    const hasCustomActionsColumn = displayColumns.some(
        (col) => col?.field === 'actions' && col?.show && col?.renderFunction
    );
    if (
        inStickySection &&
        actions.length &&
        displayColumns.some((col) => col?.field === 'actions' && col?.show) &&
        !hasCustomActionsColumn
    ) {
        const actionsJSX = <div className={styles["action"] + ' ' + styles['row-data']} style={{width:displayColumns.find(col=>col.field==='actions').width }}>
        {
            <div
                className={styles['action-holder']}
                key={+row?.tableSerialNumber - 1}
                id={name + '-action-holder-' + (+row?.tableSerialNumber - 1)}
                // style={{ ...rowStyle }}    
            >
                {
                    actions?.map(action => <Button 
                        variant="secondary"
                        {...action}
                        onClick={e => {
                            // General action callback
                            action?.onActionClick?.(e, row, handleRowAction);
                        }}
                        
                        disabled={
                            typeof action?.disabled === 'function' ? action.disabled(row) : action?.disabled
                        }
                    >
                        {typeof action.icon === 'function' ? action.icon(row) : action.icon}
                    </Button>
                    )
                }
            </div>
        }
        </div>

        if (displayColumns.some(col => col.field === 'embedsContent')) {
            arr.splice(arr.length - 1, 0, actionsJSX)
        }
        else {
            arr.push( actionsJSX )
        }
    }

    const hasCustomRowBackground = Boolean(
        rowStyle?.backgroundColor != null && rowStyle.backgroundColor !== ''
            || rowStyle?.background != null && rowStyle.background !== ''
    );
    const zebraClass = hasCustomRowBackground
        ? ''
        : ' ' + styles[(index % 2 == 0 ? 'odd' : 'even') + '-row-bg-color'];

    return (
        <>
            <div
                id={name + "-table-row-" + (inStickySection ? 'sticky-' : '') + (+row?.tableSerialNumber - 1)}
                className={styles['row'] + zebraClass}
                style={{ ...rowStyle }}
                key={name + "-table-row-" + (inStickySection ? 'sticky-' : '') + (+row?.tableSerialNumber - 1)}
            >
                {arr}
                {
                    !inStickySection && selectable && <div className={styles['row-selector']}>
                        {selectType === "checkbox" ?
                            <Checkbox
                                disabled={(conditionalSelectable?.length > 0 && !conditionalSelectable[index]) ?? false} //this is added for disable functionality in table
                                checked={selected.has(+row?.tableSerialNumber - 1)}
                                onChange={(e) => {
                                    let s = new Set([...selected]);
                                    e.target.checked ? s.add(+row?.tableSerialNumber - 1) : s.delete(+row?.tableSerialNumber - 1);
                                    setSelected(s);
                                    setSelectAllSelected(false);
                                    selectedCB(e.target.checked, row);
                                }}
                            /> :
                            <Radio
                                onChange={e => {
                                    setSelected(new Set([+row?.tableSerialNumber - 1]));
                                    selectedCB(e.target.checked, row, index);
                                }}
                                value={+row?.tableSerialNumber - 1}
                            />
                        }
                    </div>
                }
            </div>
            {row?.embedsContent && embedDisplays?.[index] && !inStickySection && <div
                className={styles['embedded'] + ' ' + styles[(index % 2 === 0 ? 'odd-row-bg-color' : 'even-row-bg-color')]}
                id={name + "-table-embedded-" + (+row?.tableSerialNumber - 1)}
            >
                {row?.embedsContent}
            </div>}
        </>);
}
