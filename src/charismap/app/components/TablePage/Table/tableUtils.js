// import the required libraries
import { isValidElement } from 'react';
import { SET_PRIORITY_SORT_RANK } from '@/lib/setPriority';
import { normalizeFinalStatus, SET_FINAL_STATUS_SORT_RANK } from '@/lib/setFinalStatus';
import { followUpSortTimestamp } from '@/lib/setFollowUp';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as XLSX from 'xlsx'
import dayjs from 'dayjs';

// Set up pdfMake fonts - register the virtual file system
if (typeof pdfMake !== 'undefined') {
  // Register fonts from vfs_fonts
  if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  }
  
  // Set default fonts
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
}

export const getTextFromJSX = (renderedData) => {
    if (typeof renderedData === 'string' || typeof renderedData === 'number') {
        return String(renderedData);
    }
    if (renderedData == null || typeof renderedData === 'boolean') return null;

    if (Array.isArray(renderedData)) {
        const parts = renderedData.map(getTextFromJSX).filter(Boolean);
        return parts.length ? parts.join(' ') : null;
    }

    if (!renderedData?.props) return null;

    const { children } = renderedData.props;

    if (typeof children === 'string' || typeof children === 'number') {
        return String(children);
    }

    if (Array.isArray(children)) {
        const parts = children.map(getTextFromJSX).filter(Boolean);
        return parts.length ? parts.join(' ') : null;
    }

    if (children?.title) {
        return getTextFromJSX(children.title);
    }

    if (children?.props?.children != null) {
        return getTextFromJSX(children.props.children);
    }

    if (children && typeof children === 'object' && children.props != null) {
        return getTextFromJSX(children);
    }

    return null;
};
const processCurrencyColumn = (row, currencyType, currencyColKeys) => {
    if(!row || !currencyColKeys?.length) return row;

currencyColKeys.forEach(key => {
    if (key in row) {
        // Store original value if not already stored
        if (typeof row[`${key}_original`] === 'undefined') {
            row[`${key}_original`] = row[key];
        }

        // Use original value for conversion
        row[key] = renderAmountChange(row[`${key}_original`], currencyType);

    }
});

return row;
    }

const renderAmountChange= (val, currencyType) => {
    // Return dash for null/undefined values
    if (val == null) return '-';

    try {
        if (typeof val === 'string') {
            val = val.replace(/,/g, '');
            val = parseFloat(val).toFixed(2);
        }
        let conversion = utils.convertCurrencyIntoGivenType(val, currencyType);
        return utils.numberWithComma(parseFloat(conversion).toFixed(2));
    } catch (error) {
        console.error('Error in renderAmountChange:', error);
        return '-';
    }
}

/** Canvas measureText, match desktop grid body (1rem @ 16px root; see --table-grid-font-size ≥1024px) */
const TABLE_MEASURE_FONT_CELL = '400 16px Poppins, sans-serif';

/** Horizontal slack for border-box cell width: `.cell` padding (8px × 2) + 4px canvas-vs-render safety. */
const TABLE_MEASURE_BODY_PAD_X = 20;

/** First non-sticky cell carries `margin-left: 20px` (see table.module.scss `.cell:first-of-type`). */
function bodyCellMeasurePad(column) {
    const extra = column?.field === 'name' ? 20 : 0;
    return TABLE_MEASURE_BODY_PAD_X + extra;
}

/** Matches .column-header-row (~1rem on large viewports) */
const TABLE_MEASURE_FONT_HEADER_ROW = '700 16px Poppins, sans-serif';
/** Mock `sharedHeaderStyle` can scale headers up; only use for sticky chrome columns so we do not widen every mock column */
const TABLE_MEASURE_FONT_HEADER_MOCK = '700 17px Poppins, sans-serif';

const tableUtils = {
    attachWidthToColumns: function (columns, mwa) {
        return columns.map((column, index) => {
            const computed = Math.ceil(Math.max(mwa[index] ?? 0, column?.minWidth ?? 0));
            const explicit = column?.width;
            if (column?.fixedWidth && explicit != null && explicit !== '') {
                return { ...column, width: Number(explicit) || computed };
            }
            const width =
                explicit != null && explicit !== ''
                    ? Math.max(Number(explicit) || 0, computed)
                    : computed;
            return { ...column, width };
        });
    },

    /**
     * Estimated content width for one cell (for column auto-width).
     * Uses renderFunction when present; handles plain objects (e.g. contact: set).
     */
    measureCellContentWidth(column, row, rowIndex) {
        const font = TABLE_MEASURE_FONT_CELL;
        const pad = bodyCellMeasurePad(column);

        if (column?.fixedWidth && column?.width != null && column?.width !== '') {
            return Number(column.width) + pad;
        }

        const key = column?.field;
        const val = row?.[key];

        try {
            /* Cell only shows a chevron; expanded body renders under the main row, never measure embed JSX text. */
            if (column?.field === 'embedsContent') {
                return 40 + pad;
            }

            if (column?.field === 'contact') {
                const iconPad = 26;
                const lineWidths = [];
                if (row?.phoneNumber) {
                    lineWidths.push(
                        tableUtils.getTextWidth(String(row.phoneNumber), font) + iconPad
                    );
                }
                const ig = row?.instagramHandle
                    ? String(row.instagramHandle).trim()
                    : '';
                if (ig) {
                    lineWidths.push(
                        tableUtils.getTextWidth(ig.startsWith('@') ? ig : `@${ig}`, font) + iconPad
                    );
                }
                if (!lineWidths.length) {
                    return Math.max(56, column.renderMinWidth ?? 80) + pad;
                }
                return Math.max(
                    ...lineWidths,
                    column.renderMinWidth ?? 100
                ) + pad;
            }

            if (column?.renderFunction) {
                const el = column.renderFunction(val, rowIndex, row);
                if (el == null || el === false) return tableUtils.getTextWidth('-', font) + pad;
                if (typeof el === 'string' || typeof el === 'number') {
                    return tableUtils.getTextWidth(String(el), font) + pad;
                }
                const text = getTextFromJSX(el);
                if (text && String(text).trim()) {
                    if (column.field === 'priority') {
                        const chipFont = '800 13px Poppins, sans-serif';
                        const upper = String(text).toUpperCase().replace(/\s+/g, ' ');
                        return Math.max(
                            tableUtils.getTextWidth(upper, chipFont) + 36,
                            column.renderMinWidth ?? 96,
                        );
                    }
                    if (column.field === 'finalStatus') {
                        const chipFont = '800 13px Poppins, sans-serif';
                        const upper = String(text).toUpperCase().replace(/\s+/g, ' ');
                        return Math.max(
                            tableUtils.getTextWidth(upper, chipFont) + 32,
                            column.renderMinWidth ?? 108
                        );
                    }
                    return tableUtils.getTextWidth(String(text).replace(/\s+/g, ' '), font) + pad;
                }
                const field = column.field;
                if (field === 'rating') return 148 + pad;
                if (field === 'actions') return 128 + pad;
                return (column.renderMinWidth ?? 100) + pad;
            }

            if (val == null || val === '') return tableUtils.getTextWidth('-', font) + pad;

            if (typeof val === 'object') {
                if (isValidElement(val)) {
                    const text = getTextFromJSX(val);
                    return (
                        (text
                            ? tableUtils.getTextWidth(String(text).replace(/\s+/g, ' '), font)
                            : column.renderMinWidth ?? 80) + pad
                    );
                }
                const strs = [val.phoneNumber, val.instagramHandle, val.name, val.title]
                    .filter((s) => s != null && s !== '')
                    .map((s) => String(s));
                if (strs.length) {
                    const maxW = Math.max(...strs.map((s) => tableUtils.getTextWidth(s, font)));
                    return maxW + 28 + pad;
                }
                const j = JSON.stringify(val).slice(0, 120);
                return tableUtils.getTextWidth(j, font) + pad;
            }

            return tableUtils.getTextWidth(String(val), font) + pad;
        } catch {
            return (column?.renderMinWidth ?? 48) + pad;
        }
    },

    /** Same label string as `TableColumnHeader` renders */
    getColumnHeaderLabel(column) {
        return (
            tableUtils.camelToTitleCase(column?.header) ??
            tableUtils.camelToTitleCase(column?.field) ??
            ''
        );
    },

    getTableHeaderMeasureFontForCanvas(column) {
        const useCompactHeaderFont =
            column?.field === 'embedsContent' || column?.field === 'actions';
        return useCompactHeaderFont
            ? TABLE_MEASURE_FONT_HEADER_MOCK
            : TABLE_MEASURE_FONT_HEADER_ROW;
    },

    /**
     * Sum of horizontal padding (px) inside the header cell border box.
     * Mirrors `TableColumnHeader` (first main vs first sticky) + `.cell` 8px right.
     */
    getHeaderCellHorizontalPaddingPx({ columnIndex, selectable, columns }) {
        if (!Array.isArray(columns) || columnIndex < 0) return 16;
        const isShown = (c) => c && c.show !== false;
        let pad = 16;
        const firstNonStickyIdx = columns.findIndex((c) => isShown(c) && !c?.sticky);
        if (columnIndex === firstNonStickyIdx && firstNonStickyIdx !== -1) {
            pad = Math.max(pad, (selectable ? 63 : 20) + 8);
        }
        const stickyOrder = columns
            .map((c, i) => ({ c, i }))
            .filter(
                ({ c }) =>
                    isShown(c) &&
                    (c?.sticky === true || c?.field === 'tableSerialNumber')
            );
        const posInSticky = stickyOrder.findIndex(({ i }) => i === columnIndex);
        if (posInSticky === 0) {
            pad = Math.max(pad, 20 + 8);
        }
        return pad;
    },

    /**
     * Minimum border-box width for a column header (label + optional sort + padding).
     * Use with `measureCellContentWidth` as `Math.max(minHeaderBorderBoxWidth, contentMax, minWidth)`.
     */
    minHeaderBorderBoxWidth(column, {
        columnIndex,
        selectable,
        columns,
        sorting,
        columnsWithoutSorting,
    }) {
        const label = tableUtils.getColumnHeaderLabel(column);
        const font = tableUtils.getTableHeaderMeasureFontForCanvas(column);
        const textW = tableUtils.getTextWidth(label || ' ', font);
        const sortW =
            sorting &&
            columnsWithoutSorting &&
            typeof columnsWithoutSorting.has === 'function' &&
            !columnsWithoutSorting.has(column?.field)
                ? 28
                : 0;
        const padX = tableUtils.getHeaderCellHorizontalPaddingPx({
            columnIndex,
            selectable,
            columns,
        });
        return Math.ceil(textW + sortW + padX);
    },

    camelToTitleCase: s => {
        if (!s)
            return s;
        let op = s.replace(/(([A-Z]+)|([0-9]+))/g, ' $1').trim();
        return op[0].toUpperCase() + op.substring(1);
    },
    capitalize: s => (s && s[0].toUpperCase() + s.slice(1)) || "",
    downloadPDF: function (data, columns, title)
    {
        // Ensure fonts are registered
        if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
            pdfMake.vfs = pdfFonts.pdfMake.vfs;
        }

        // Process data to extract text values (handle render functions)
        const processedData = data.map(row => {
            return columns.map(col => {
                const value = row[col?.field];
                // If there's a render function, try to extract text
                if (col?.renderFunction && typeof value !== 'undefined') {
                    const rendered = col.renderFunction(value, 0, row);
                    // Extract text from JSX or return string
                    if (typeof rendered === 'string') {
                        return rendered;
                    }
                    // Try to get text from JSX
                    const textFromJSX = getTextFromJSX(rendered);
                    return textFromJSX || String(value || '-');
                }
                return value !== undefined && value !== null && value !== '' ? String(value) : '-';
            });
        });

        // Create header row
        const headerRow = columns.map(col => ({
            text: col?.header || col?.field || '',
            style: 'tableHeader',
            bold: true
        }));

        // Create body rows
        const bodyRows = processedData.map(row => 
            row.map(cell => ({
                text: String(cell || '-'),
                style: 'tableCell'
            }))
        );

        // define the document definition for pdfmake
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            defaultStyle: {
                font: 'Roboto',
                fontSize: 10
            },
            styles: {
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: 'black',
                    fillColor: '#f0f0f0',
                    alignment: 'left'
                },
                tableCell: {
                    fontSize: 9,
                    alignment: 'left'
                }
            },
            content: [
                {
                    text: title || 'Table Export',
                    style: 'header',
                    fontSize: 14,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: columns.map(() => 'auto'),
                        body: [
                            headerRow,
                            ...bodyRows
                        ],
                    },
                    layout: {
                        hLineWidth: function (i, node) {
                            return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
                        },
                        vLineWidth: function (i, node) {
                            return (i === 0 || i === node.table.widths.length) ? 1 : 0.5;
                        },
                        hLineColor: function () {
                            return '#cccccc';
                        },
                        vLineColor: function () {
                            return '#cccccc';
                        },
                        paddingLeft: function () {
                            return 5;
                        },
                        paddingRight: function () {
                            return 5;
                        },
                        paddingTop: function () {
                            return 3;
                        },
                        paddingBottom: function () {
                            return 3;
                        }
                    }
                },
            ],
        };

        // Generate filename with date
        const processedTitle = (title || 'table')
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        const filename = `${processedTitle}_${dayjs().format('DD-MM-YYYY')}.pdf`;

        // create and download the PDF
        try {
            const pdfDocGenerator = pdfMake.createPdf(docDefinition);
            // Try download method first (simpler)
            pdfDocGenerator.download(filename);
        } catch (error) {
            console.error('Error generating PDF with download method:', error);
            // Fallback: use getBlob method
            try {
                const pdfDocGenerator = pdfMake.createPdf(docDefinition);
                pdfDocGenerator.getBlob((blob) => {
                    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                        // For IE and Edge
                        window.navigator.msSaveOrOpenBlob(blob, filename);
                    } else {
                        // For other browsers
                        const a = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                        }, 100);
                    }
                });
            } catch (blobError) {
                console.error('Error generating PDF with blob method:', blobError);
                alert('Error generating PDF. Please try again.');
            }
        }
    },
    /**
     * Client-side search across the full row set (before pagination).
     * Matches raw fields, renderFunction output (including JSX via getTextFromJSX),
     * and shallow string/number values on object fields (e.g. contact: set).
     */
    filterTextFromRows: (search, sortedRowData, searchableFields) => {
        if (!sortedRowData?.length) return sortedRowData ?? [];
        if (!search || !String(search).trim()) return sortedRowData;

        const q = String(search).trim().toLowerCase();
        const fields = searchableFields || [];

        const pushRenderableStrings = (raw, renderFunction, rowIndex, row, bucket) => {
            if (renderFunction) {
                try {
                    const rendered = renderFunction(raw, rowIndex, row);
                    if (rendered != null && rendered !== false) {
                        if (typeof rendered === 'string' || typeof rendered === 'number') {
                            bucket.push(String(rendered));
                        } else {
                            const t = getTextFromJSX(rendered);
                            if (t) bucket.push(String(t));
                        }
                    }
                } catch {
                    /* renderFunction may not be pure outside React */
                }
            }
            if (raw == null || raw === '') return;
            if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
                bucket.push(String(raw));
                return;
            }
            if (isValidElement(raw)) {
                const t = getTextFromJSX(raw);
                if (t) bucket.push(String(t));
                return;
            }
            if (typeof raw === 'object') {
                for (const v of Object.values(raw)) {
                    if (v == null) continue;
                    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                        bucket.push(String(v));
                    }
                }
            }
        };

        return sortedRowData.filter((row, rowIndex) => {
            for (const searchableField of fields) {
                const raw = row?.[searchableField?.field];
                const bucket = [];
                pushRenderableStrings(raw, searchableField?.renderFunction, rowIndex, row, bucket);
                if (bucket.some((s) => s.toLowerCase().includes(q))) return true;
            }
            return false;
        });
    },

    tableToExcelData: ({ columns, displayRows, displayColumns, selected, selectable, sortedRowData }) => {
        // Use direct array if not selectable, otherwise filter selected rows        
        const exportData = selectable
            ? sortedRowData.filter(row => selected.has(+row.tableSerialNumber - 1))
            : displayRows;

        // Create column map once
        const columnMap = new Map(columns.map(col => [col.field, col]));
        const exportColumns = displayColumns
            .map(col => columnMap.get(col.field) || col)
            .filter(col => col?.show && !col?.hideInExcel);

        // Process rows
        return exportData.map(row => {
            const processedRow = exportColumns.reduce((acc, column) => {
                const fieldName = column?.field?.toLowerCase() || '';
                const fieldValue = row?.[column?.field];
                const renderedData = column?.renderFunction?.(fieldValue, acc, row);

                let processedValue;

                if (renderedData) {
                    // Check for excel function first
                    const excelVal = column?.excelFunction?.(fieldValue);
                    if (excelVal) {
                        processedValue = excelVal;
                    } else {
                        // Check for JSX children
                        const textInsideJSX = getTextFromJSX(renderedData);
                        processedValue = textInsideJSX || renderedData;
                    }
                } else {
                    // Handle default value
                    processedValue = (fieldValue !== undefined && fieldValue !== '' && fieldValue !== null) ||
                        row?.setBlank ||
                        row?.srNo === ''
                        ? fieldValue
                        : '-';
                }

                acc[column.field] = processedValue;
                return acc;
            }, {});

            // Replace undefined values with null
            return Object.fromEntries(
                Object.entries(processedRow).map(([key, value]) => [key, value === undefined ? null : value])
            );
        });

    },

    ExportTableToExcel: ({ title = "Table", data = [], columns = [] }) => {
        // Cells go straight into the sheet as text: no HTML parsing (so no markup
        // or script in a value can run) and no formulas (string cells never evaluate)
        const visibleColumns = columns.filter(column => column?.visible);
        const toText = (value) =>
            value === null || value === undefined ? '' : typeof value === 'object' && !(value instanceof Date) ? '' : String(value);

        const rows = [
            visibleColumns.map(column => (column?.header || column?.title || '').toString().toUpperCase()),
            ...data.map(row => visibleColumns.map(column => toText(row[column.field]))),
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: false });

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell) cell.t = 's';
            }
        }

        worksheet['!cols'] = visibleColumns.map((_, C) => {
            let maxWidth = 10;
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell?.v) maxWidth = Math.max(maxWidth, String(cell.v).length + 2);
            }
            return { wch: Math.min(maxWidth, 60) };
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

        const processedTitle = title
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            + '_'
            + dayjs().format('DD-MM-YYYY');

        const wbout = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
            cellDates: false  // Prevent date conversion
        });

        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = `${processedTitle}.xlsx`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
    },

    // define the function that generates and downloads the PDF
    limitOptions: [
        // {value: 5, label: 5},
        {value: 10, label: 10},
        {value: 25, label: 25},
        {value: 50, label: 50},
        {value: Infinity, label: "All"}
    ],

    /**
     * Page size dropdown: omit values larger than the current row count (e.g. hide 50 when only 46 rows).
     * "All" only appears when there is at least one row. When count is 0, returns [10] so the select stays valid.
     */
    filterLimitOptionsByRowTotal(rowTotal) {
        const rt = Math.max(0, Number(rowTotal) || 0);
        const filtered = this.limitOptions.filter((opt) => {
            if (opt.value === Infinity) return rt > 0;
            return opt.value <= rt;
        });
        if (filtered.length === 0) {
            return [{ value: 10, label: 10 }];
        }
        return filtered;
    },

    matchRowStyles: ({name, displayRows}) => {
        for(let row of displayRows){
            const targetRowWrapper = document?.getElementById(name + "-table-row-wrapper-" + (row?.tableSerialNumber - 1)),
                targetRow = document?.getElementById(name + "-table-row-" + (row?.tableSerialNumber - 1))
 
 
            let height = targetRowWrapper?.getBoundingClientRect().height + 'px',
            stickyRow = document.getElementById(name+"-table-row-sticky-"+(+row?.tableSerialNumber-1))
            if(height && height !== '0px'){
                if (stickyRow) {
                    stickyRow.style.height = height;
                    /* Do not copy getComputedStyle(targetRow).background: it resolves CSS variables to fixed
                     * RGB(A), so the sticky rail stops updating on theme toggle. Zebra + rowStyle already
                     * come from the same TableRow markup as the main grid row. */
                }
            }
        }
    },
    sortByColumn: function (arr, columnName, order)
    {  //order=1 for ascending, -1 for descending
        if (!columnName) return arr;

        if (columnName === 'priority') {
            const rank = (row) =>
                SET_PRIORITY_SORT_RANK[row?.priority] ?? SET_PRIORITY_SORT_RANK.medium;
            return [...arr].sort((a, b) => (rank(a) - rank(b)) * order);
        }

        if (columnName === 'finalStatus') {
            const rank = (row) => {
                const status = normalizeFinalStatus(row?.finalStatus);
                return SET_FINAL_STATUS_SORT_RANK[status] ?? SET_FINAL_STATUS_SORT_RANK.open;
            };
            return [...arr].sort((a, b) => (rank(a) - rank(b)) * order);
        }

        if (columnName === 'followUp') {
            const ts = (row) => followUpSortTimestamp(row?.nextFollowUpAt);
            return [...arr].sort((a, b) => (ts(a) - ts(b)) * order);
        }

        return [...arr].sort((a, b) =>
            a[columnName] > b[columnName] ? order : b[columnName] > a[columnName] ? -order : 0
        );
    },
    getTextWidth: function (text, font) {
        let canvas = tableUtils.getTextWidth.canvas || (tableUtils.getTextWidth.canvas = document.createElement("canvas"));
        let context = canvas.getContext("2d");
        context.font = font;
        let metrics = context.measureText(text);
        return metrics.width;
    },
    synchronizeStickyColumns: ({actions, displayRows, name, styles}) => {
        try{
            let colHeaderRowHeight = document.querySelector('.'+name)?.getElementsByClassName(styles['column-header-row'])?.[0]?.getBoundingClientRect().height
            tableUtils.matchRowStyles({name, displayRows})
            if(actions?.length && colHeaderRowHeight){
                const stickyHeaderRow = document
                    .querySelector('.' + name)
                    ?.getElementsByClassName(styles['sticky-column-holder'])?.[0]
                    ?.getElementsByClassName(styles['column-header-row'])?.[0];
                if (stickyHeaderRow) {
                    stickyHeaderRow.style.height = colHeaderRowHeight + 'px';
                }
            }
        }
        catch(err){
            console.error(err)
        }
            
    },
    debounce: function (func, delay) {
        let timeoutId;
        
        return function(...args) {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                func.apply(this, args)
            }, delay);
        };
    },
    convertCurrencyIntoGivenType: (amount, type) => {
        let denominator = 1;
        if (amount === undefined || typeof amount === 'string' || amount === null) {
            return amount;
        }
        switch (type) {
            case 'thousands':
                denominator = 1000;
                break;
            case 'lakhs':
                denominator = 1_00_000;
                break;
            case 'millions':
                denominator = 1_000_000;
                break;
            case 'crores':
                denominator = 1_00_00_000;
                break;
            case 'billions':
                denominator = 1_000_000_000;
                break;
            default:
                denominator = 1;
        }
        if (typeof amount === 'number' && !isNaN(amount)) {
            amount = (Math.round((amount / denominator) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
            return amount;
        }
        return 'Invalid data';
    },
    currencyOptions: [
        {
            value: "None",
            label: "None"
        },
        {
            value: "In Thousands",
            label: "In Thousands"
        },
        {
            value: "In Lakhs",
            label: "In Lakhs"
        },
        {
            value: "In Millions",
            label: "In Millions"
        },
        {
            value: "In Crores",
            label: "In Crores"
        },
        {
            value: "In Billions",
            label: "In Billions"
        },
    ],
    amountChangeFromTable: (currencyType, currencyColKeys, data) => {
        // Return early if no currency columns or display rows
        if (!currencyColKeys?.length || !data?.length) return;

        // Create new array with updated rows to trigger re-render
        const updatedRows = data.map(row =>
            processCurrencyColumn({ ...row }, currencyType, currencyColKeys)
        );
        return updatedRows
    },

};


export default tableUtils;