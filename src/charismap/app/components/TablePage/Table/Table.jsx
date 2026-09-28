'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import styles from './table.module.scss';
import { mockRowData, mockColumnDefs, mockRowStyles, mockSuperHeaders } from './mockData';
import tableUtils from './tableUtils';
import TableRow from "./TableRow";
import IconProvider from '../../IconProvider';
import Loader from '../../Loader';
import TableColumnHeader from './TableColumnHeader';
import TableWrapper from './TableWrapper';

/** Breathing room under the table block inside `.app-content` (mock + interactions host) */
const TABLE_VIEWPORT_BOTTOM_GAP_PX = 12;

// Mock functions to replace Redux and external dependencies
const useDispatch = () => () => {}; // No-op dispatch
const useSelector = () => ({ values: {} }); // Return empty state
const getFormItem = () => null; // Placeholder

const EMPTY_ARRAYS = [[], [], [], [], [], [], [], [], [], []];

const Table = ({
  actions = EMPTY_ARRAYS[0],
  actionHeader = "Actions",
  beFiltering = false,
  columnsWithoutSorting = EMPTY_ARRAYS[1],
  customSort = false,
  customHeaderStyle = {},
  customCellStyle = {},
  data = EMPTY_ARRAYS[2],
  downloadable = true,
  downloaderFileNotAllowed = EMPTY_ARRAYS[3],
  embedsHeader = "Operations",
  embedFunction,
  fetchFunction = () => { },
  tableParams: parentTableParams,
  setTableParams: parentSetTableParams,
  item = "item",
  maxHeight = "auto",
  menuButtons = <></>,
  mockData = false,
  /** External "data is still loading" signal, swaps the empty rows area for a loader. */
  loading = false,
  name = "unnamed-table",
  noDataMessage = "No records found",
  numberOfItems = 0,
  pageButtons = null,
  currencyBtn = null,
  rowStyles = EMPTY_ARRAYS[4],
  selectable = false,
  selectType = "checkbox",
  selectedCB = () => { },
  searchable = true,
  searchableFields = EMPTY_ARRAYS[5],
  searchByPageNo = false,
  serialize = true,
  serializeHeader = "#",
  setData = () => { },
  showAll = false,
  showTitle = true,
  hideAllOptions = false,
  showCustomisedMenu = true,
  showPagination = true,
  sorting = false,
  superHeaders = EMPTY_ARRAYS[6],
  tableColumns = EMPTY_ARRAYS[7],
  tableStyle = {},
  title = "",
  conditionalSelectable = EMPTY_ARRAYS[8],
  disableExport = false,
  selectionDisclaimer = false,
  exportColumns = EMPTY_ARRAYS[9],
  onSelectionChange = () => { },
  currencyFilterable = false,
  extraMenuButtons = null,
  customJSX = null,
  isColumn = true,
  columnStyles = null,
  /** Merged into every column header before each column’s `headerStyle` */
  columnHeadersStyle = null,
}) => {
  const dispatch = useDispatch();
  const colHeaderRowRef = useRef();
  const dataRowRefs = useRef([]);
  const isMounted = useRef(false);
  const tableScrollBodyRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const paginationFooterRef = useRef(null);
  const [scrollViewportMaxHeightPx, setScrollViewportMaxHeightPx] = useState(null);

  /** Bounded scroll inside `.interactions-table` (mock + live data share one layout path). */
  const updateScrollViewportMaxHeight = useCallback(() => {
    const twEl = tableWrapperRef.current;
    const scrollEl = tableScrollBodyRef.current;
    if (!twEl || typeof window === 'undefined') return;

    if (!twEl.closest('.interactions-table')) {
      setScrollViewportMaxHeightPx(null);
      return;
    }

    // Prefer the visible app column (navbar + main padding already reflected in geometry).
    const appContent = twEl.closest('.app-content');
    const mainEl = twEl.closest('main.main-content');
    let bottomEdge =
      appContent?.getBoundingClientRect().bottom ??
      mainEl?.getBoundingClientRect().bottom;
    if (bottomEdge == null || !Number.isFinite(bottomEdge)) {
      const vv = window.visualViewport;
      bottomEdge = vv ? vv.offsetTop + vv.height : window.innerHeight;
    }
    const bottomLimit = bottomEdge - TABLE_VIEWPORT_BOTTOM_GAP_PX;

    // Anchor to .table-wrapper (grid chrome), not the outer interactions host.
    const tableWrapperTop = twEl.getBoundingClientRect().top;

    const pagEl = paginationFooterRef.current;
    const pagH =
      showPagination && pagEl
        ? Math.ceil(pagEl.getBoundingClientRect().height)
        : 0;

    // Sticky column rail can extend below the main body rows; reserve that delta.
    let tailBelowScrollPx = 0;
    if (scrollEl) {
      const twBottom = twEl.getBoundingClientRect().bottom;
      const scrollBottom = scrollEl.getBoundingClientRect().bottom;
      tailBelowScrollPx = Math.max(0, Math.round(twBottom - scrollBottom));
    }

    const next = Math.floor(
      bottomLimit - tableWrapperTop - pagH - tailBelowScrollPx
    );
    setScrollViewportMaxHeightPx(Math.max(120, next));
  }, [showPagination]);

  useLayoutEffect(() => {
    let rafId = 0;
    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateScrollViewportMaxHeight();
        // Second pass: maxHeight changes layout; tail below scroll + pagination height stabilize.
        requestAnimationFrame(() => {
          updateScrollViewportMaxHeight();
        });
      });
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleUpdate);
      ro.observe(document.documentElement);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      ro?.disconnect();
    };
  }, [updateScrollViewportMaxHeight]);

  // Remove Redux dependency - use local state instead
  const [prevSelectedState, setPrevSelectedState] = useState(new Set());
  const prevSelected = prevSelectedState;
  const [count, setCount] = useState(data.length || 0);
  const [embedDisplays, setEmbedDisplays] = useState({});
  const defaultParams = {
    sort: '',
    skip: 0,
    page: 1,
    limit: 10,
    total: 0,
    filter: '',
    search: ''
  };
  const [internalTableParams, setInternalTableParams] = useState(defaultParams);
  const tableParams = parentTableParams || internalTableParams;
  const setTableParams = parentSetTableParams || setInternalTableParams;
  const { limit, page, search, skip, filter } = tableParams || {};

  /** Stable debounced writer so we do not recreate the debouncer every render (that breaks delay). */
  const setTableParamsRef = useRef(setTableParams);
  useEffect(() => {
    setTableParamsRef.current = setTableParams;
  }, [setTableParams]);
  const debouncedCommitSearch = useMemo(
    () =>
      tableUtils.debounce((value) => {
        setTableParamsRef.current((prev) => ({ ...prev, search: value, skip: 0 }));
      }, 400),
    []
  );

  const [selectAllSelected, setSelectAllSelected] = useState(false);
  const [selected, setSelected] = useState(prevSelected ?? new Set());
  const [sortKey, setSortKey] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const previousSelectionRef = useRef({ selected: new Set(), selectAllSelected: false });

  let rowData = mockData ? mockRowData : data;
  const hasCustomRowStyles =
    typeof rowStyles === 'function' ||
    (Array.isArray(rowStyles) && rowStyles.length > 0);
  rowStyles = mockData
    ? (hasCustomRowStyles ? rowStyles : mockRowStyles)
    : rowStyles;
  const hasCustomSuperHeaders = Array.isArray(superHeaders) && superHeaders.length > 0;
  superHeaders = mockData
    ? (hasCustomSuperHeaders ? superHeaders : mockSuperHeaders)
    : superHeaders;
  const superHeadersList = Array.isArray(superHeaders) ? superHeaders : [];
  rowData = rowData?.map((row, i) => ({ tableSerialNumber: beFiltering ? skip + i + 1 : i + 1, ...row, ...(embedFunction ? { embedsContent: embedFunction(row, i) } : {}) }));
  columnsWithoutSorting = new Set([...columnsWithoutSorting, 'actions', 'embedsContent']);
  searchableFields = searchableFields?.length === 0 ? ((mockData ? mockColumnDefs : tableColumns) || [])?.map(column => ({ field: column?.field, renderFunction: column?.renderFunction })) : searchableFields;

  const sortedRowData = beFiltering ? rowData : tableUtils.sortByColumn(rowData, sortKey, sortOrder);

  const searchData = beFiltering
    ? sortedRowData
    : tableUtils.filterTextFromRows(search, sortedRowData, searchableFields);

  /** Full dataset size (ignores search), page-size dropdown and limit clamp use this only */
  const overallRowTotal = sortedRowData?.length ?? 0;
  const pageSliceLen =
    !Number.isFinite(limit) || limit === Infinity
      ? (searchData?.length ?? 0)
      : limit;
  const displayRows = beFiltering
    ? searchData
    : searchData?.slice(skip, Math.min(skip + pageSliceLen, searchData?.length ?? 0));
  const total = beFiltering ? count : (searchData?.length || 0);
  const searchDataLen = searchData?.length ?? 0;

  useEffect(() => {
    if (!Number.isFinite(limit) || limit === Infinity) return;
    const maxCap = overallRowTotal;
    if (limit <= maxCap) return;
    setTableParams((prev) => ({
      ...prev,
      limit: maxCap === 0 ? 10 : maxCap,
      skip: 0,
    }));
  }, [overallRowTotal, limit, setTableParams]);

  /** After search/filter, keep skip on a valid page (do not shrink the user’s chosen page size) */
  useEffect(() => {
    if (beFiltering) return;
    const n = searchDataLen;
    if (n === 0) return;
    if (skip >= n) {
      setTableParams((prev) => ({ ...prev, skip: 0, page: 1 }));
    }
  }, [beFiltering, searchDataLen, skip, setTableParams]);

  const RENDER_ROW_CHUNK = 400;
  const displayLen = displayRows.length;
  const [renderRowCap, setRenderRowCap] = useState(RENDER_ROW_CHUNK);

  useLayoutEffect(() => {
    if (displayLen <= RENDER_ROW_CHUNK) {
      setRenderRowCap(displayLen);
    } else {
      setRenderRowCap(RENDER_ROW_CHUNK);
    }
  }, [displayLen, skip, limit, filter, sortOrder, sortKey, search, beFiltering]);

  useLayoutEffect(() => {
    updateScrollViewportMaxHeight();
  }, [updateScrollViewportMaxHeight, displayLen]);

  useEffect(() => {
    if (renderRowCap >= displayLen) return undefined;
    const id = requestAnimationFrame(() => {
      setRenderRowCap((c) => Math.min(displayLen, c + RENDER_ROW_CHUNK));
    });
    return () => cancelAnimationFrame(id);
  }, [renderRowCap, displayLen]);

  const rowsToRender =
    renderRowCap >= displayLen ? displayRows : displayRows.slice(0, renderRowCap);

  const columnDefsSource = mockData ? mockColumnDefs : tableColumns;
  const columnDefsInitial = Array.isArray(columnDefsSource) ? columnDefsSource : [];

  const [columns, setColumns] = useState(() =>
    columnDefsInitial.map((columnDef) => ({
      ...columnDef,
      visible: columnDef?.visible ?? true,
      show: columnDef?.visible ?? true,
    }))
  );

  const colKeys = columns?.map(column => column?.field);
  const mwa = colKeys?.map((_, index) => {
    const column = columns?.[index];
    const lengthArr = (displayRows ?? []).map((row, rowIndex) =>
      tableUtils.measureCellContentWidth(column, row, rowIndex)
    );
    const headerBorderBox = tableUtils.minHeaderBorderBoxWidth(column, {
      columnIndex: index,
      selectable,
      columns,
      sorting,
      columnsWithoutSorting,
    });
    const contentMax = lengthArr.length ? Math.max(...lengthArr) : 0;
    return Math.max(headerBorderBox, contentMax, column?.minWidth ?? 0);
  });

  const currencyColKeys = columns?.map(column => column?.isCurrency ? column.field : null).filter(Boolean);
  const displayColumns = tableUtils.attachWidthToColumns(columns, mwa);

  const resolveRowStyle = (row) => {
    if (typeof rowStyles === 'function') {
      return rowStyles(row, row?.tableSerialNumber - 1) ?? {};
    }
    return rowStyles?.[row?.tableSerialNumber - 1] ?? {};
  };
  const stickyColumns = displayColumns?.filter(
    (col) => col?.sticky || col?.field === 'tableSerialNumber'
  );

  let colSpanIndex = 0;
  const columnSuperHeadersJSX = superHeadersList.map((header) => {
    let width = 0, padding = 0;
    for (let i = colSpanIndex; i < colSpanIndex + (header?.colSpan || 1); i++) {
      if (displayColumns[i]?.show) {
        width += displayColumns[i]?.width;
        padding += i === colSpanIndex ? 8 : 16;
      }
    }
    colSpanIndex += header?.colSpan || 1;
    return (
      <div
        className={styles['column-header']}
        style={{
          width,
          padding: `8px ${padding}px 8px 8px`,
          ...header?.style
        }}
      >
        {header?.header}
      </div>
    );
  });

  const sharedHeaderStyle =
    columnHeadersStyle && typeof columnHeadersStyle === 'object'
      ? columnHeadersStyle
      : {};

  const columnHeadersJSX = displayColumns
    ?.filter((column) => column.show && !column.sticky)
    ?.map((column, index) => (
      <TableColumnHeader
        key={column.field}
        sharedHeaderStyle={sharedHeaderStyle}
        {...{
          column,
          columnsWithoutSorting,
          customSort,
          index,
          sorting,
          sortKey,
          sortOrder,
          setSortOrder,
          setSortKey,
          selectable,
        }}
      />
    ));

  const stickyColumnHeadersJSX = stickyColumns
    ?.filter((column) => column.show)
    ?.map((column, index) => (
      <TableColumnHeader
        key={column.field}
        inStickySection
        sharedHeaderStyle={sharedHeaderStyle}
        {...{
          column,
          columnsWithoutSorting,
          customSort,
          index,
          sorting,
          sortKey,
          sortOrder,
          setSortOrder,
          setSortKey,
          selectable,
        }}
      />
    ));

  let rowDataJSX = rowsToRender.map((row, index) => (
    <div className={styles["row-wrapper"]} id={`${name}-table-row-wrapper-${row?.tableSerialNumber - 1}`} key={row?.tableSerialNumber - 1}>
      <TableRow
        key={row?.tableSerialNumber - 1}
        dataRowRefs={dataRowRefs}
        rowStyle={resolveRowStyle(row)}
        customCellStyle={customCellStyle}
        columnStyles={columnStyles}
        {...{ name, columns, conditionalSelectable, row, index, displayColumns, selectable, embedDisplays, selected, selectedCB, selectType, setEmbedDisplays, setSelectAllSelected, setSelected, embedFunction }}
      />
    </div>
  ));

  if (rowsToRender.length) {
    if (selectType === "radio") {
      // Radio group functionality - using div wrapper instead of antd Radio.Group
      rowDataJSX = <div role="radiogroup">{rowDataJSX}</div>;
    }
  } else if (loading) {
    rowDataJSX = (
      <div className={styles["no-records"]}>
        <Loader size="medium" />
      </div>
    );
  } else {
    rowDataJSX = (
      <div className={styles["no-records"]}>
        <span className={styles["no-records-text"]}>{noDataMessage}</span>
      </div>
    );
  }

  useEffect(() => {
    tableUtils.synchronizeStickyColumns({ name, actions, displayRows: rowsToRender, styles });
  }, [skip, limit, filter, sortOrder, sortKey, search, embedDisplays, columns, renderRowCap, displayLen]);

  useEffect(() => {
    setSelectAllSelected(false);
  }, [skip, limit, filter, sortOrder, sortKey, search, embedDisplays]);

  useEffect(() => {
    if (Object.keys(embedDisplays).length !== 0) setEmbedDisplays({});
  }, [search, skip, limit, filter, sortOrder, sortKey]);

  useEffect(() => {
    tableUtils.synchronizeStickyColumns({ name, actions, displayRows: rowsToRender, styles });
    setSelectAllSelected(false);
  }, [name, data, renderRowCap, displayLen]);

  useEffect(() => {
    tableUtils.synchronizeStickyColumns({ name, actions, displayRows: rowsToRender, styles });
    setSelectAllSelected(false);
    if (!beFiltering) {
      setTableParams({ ...tableParams, skip: 0, page: 1, total: data.length });
      setCount(data?.length ?? 0);
    }
    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (!beFiltering) {
      setCount(searchDataLen);
    }
  }, [beFiltering, searchDataLen]);

  useEffect(() => {
    if (isMounted.current && beFiltering && fetchFunction) {
      fetchFunction({
        skip,
        page,
        sort: sortKey && sortOrder ? `${sortKey}:${sortOrder}` : tableParams?.sort,
        limit: !beFiltering ? 1000 : limit,
        filters: tableParams?.filter,
        search
      }).then(res => {
        setCount(res?.count || res?.data?.length);
        setData(res.data);
      }).catch(err => {
        console.error(err);
        setCount(0);
        setData([]);
      });
    }
  }, [search, skip, limit, filter, sortKey, sortOrder]);

  useEffect(() => {
    const prevSelected = previousSelectionRef.current.selected;
    if (selected.size !== prevSelected.size || ![...selected].every(item => prevSelected.has(item))) {
      previousSelectionRef.current = { selected: new Set(selected) };
      const selectedRows = displayRows.filter(row => selected.has(row.tableSerialNumber - 1));
      const originalSelectedRows = convertIntoOriginalData(selectedRows);
      onSelectionChange(Array.from(selected), originalSelectedRows);
    }
  }, [selected, onSelectionChange, displayRows]);

  useEffect(() => {
    // Removed Redux dispatch - using local state instead
    setPrevSelectedState(new Set(selected));
    tableUtils.synchronizeStickyColumns({ name, actions, displayRows: rowsToRender, styles });
  }, [selected, renderRowCap, displayLen]);

  useEffect(() => {
    setSelected(prevSelected);
  }, [name]);

  const memoizedTableParams = useMemo(
    () => ({
      limit: showAll ? (mockData ? mockRowData.length : data?.length || 0) : 10,
    }),
    [showAll, data, mockData]
  );

  useEffect(() => {
    if (showAll && memoizedTableParams.limit > 0) {
      setTableParams({ ...tableParams, ...memoizedTableParams });
    }
  }, [showAll, data, mockData, memoizedTableParams]);


  useEffect(() => {
    if (selectable && selectType === 'checkbox') {
      selectedCB("", displayRows.filter(row => selected.has(row.tableSerialNumber - 1)));
      // Removed Redux dispatch - using local state instead
    }
  }, [selectAllSelected]);

  useEffect(() => {
    const baseCols = mockData ? mockColumnDefs : tableColumns;
    let columnDefs = Array.isArray(baseCols) ? [...baseCols] : [];
    if (serialize) {
      columnDefs = [{ field: "tableSerialNumber", header: serializeHeader, show: serialize }, ...columnDefs];
    }
    const displayRowsEmbedContent = displayRows.some(row => row.embedsContent || embedFunction);
    if (actions.length) {
      columnDefs.push({ field: "actions", header: actionHeader, hideInExcel: true, sticky: true, show: true });
    }
    if (displayRowsEmbedContent) {
      columnDefs.push({ field: "embedsContent", header: embedsHeader, hideInExcel: true, sticky: true, show: true, headerStyle: { textAlign: 'center' } });
    }
    /* Preserve the user's column-selector toggles across re-runs. This effect
       fires whenever the parent re-creates `tableColumns` (which most pages do
       inline every render, refetches via React Query then routinely trigger
       it), so unconditionally writing the default `show` would wipe whatever
       the user just unchecked in the Columns popover. Merge by field key:
       fields the user has already touched keep their `show`; fields that are
       new (or were re-added by `actions` / `embedsContent` / serial) get the
       declarative default from the column definition. */
    setColumns((prev) => {
      const prevShowByField = new Map(
        (Array.isArray(prev) ? prev : []).map((c) => [c?.field, c?.show])
      );
      return columnDefs.map((columnDef) => {
        const defaultShow = columnDef?.visible ?? columnDef?.show ?? true;
        const userShow = prevShowByField.has(columnDef?.field)
          ? prevShowByField.get(columnDef?.field)
          : defaultShow;
        return {
          ...columnDef,
          visible: columnDef?.visible ?? true,
          show: userShow,
        };
      });
    });
  }, [mockData, tableColumns]);

  const convertIntoOriginalData = (rows) => {
    return rows.map((row) => {
      const updatedRow = { ...row };
      currencyColKeys.forEach(key => {
        if (key in updatedRow && typeof updatedRow[`${key}_original`] !== 'undefined') {
          updatedRow[key] = updatedRow[`${key}_original`];
        }
      });
      return updatedRow;
    });
  };

  const handleClearSelection = () => {
    setSelectAllSelected(false);
    setSelected(new Set());
  };

  const handleRowAction = (e, row, actionType) => {
    switch (actionType) {
      case 'update':
        // Update logic
        updateRow(row);
        break;
      case 'delete':
        // Delete logic
        deleteRow(row);
        break;
      default:
        console.warn(`Unhandled action type: ${actionType}`);
    }
  }

  const updateRow = (row) => {
    setData(prevRows => prevRows.map(r => r.sr_no === row.sr_no ? { ...r, ...row } : r));
  }

  const deleteRow = (row) => {
    setData(prevRows => prevRows.filter(r => r.sr_no !== row.sr_no));
  }

  const customisedExportedColumns = () => {
    let newExportColumns = displayColumns;
    if (exportColumns && exportColumns.length > 0) {
      const columnMap = new Map(displayColumns.map(col => [col.field, col]));
      newExportColumns = exportColumns.map(col => columnMap.get(col.field) || col);
    }
    return newExportColumns;
  };

  const exportData = tableUtils.tableToExcelData({
    columns,
    displayRows: convertIntoOriginalData(displayRows),
    displayColumns: customisedExportedColumns(),
    selected,
    selectable,
    sortedRowData: convertIntoOriginalData(sortedRowData)
  });
  disableExport = exportData.length <= 0  ?true: false

  const exportMenuSource = [
    {
      label: (
        <div className='flex' onClick={() => tableUtils.ExportTableToExcel({
          title: title || name,
          data: exportData,
          columns: customisedExportedColumns()?.filter(column => column?.show && !column?.hideInExcel)
        })}>
          <span>
            <IconProvider name="file" size={16} style={{ marginRight: '8px' }} />
          </span>
          <span>Excel</span>
        </div>
      ),
      key: '1',
      fileType: 'excel',
    },
    {
      label: (
        <div className='flex' onClick={() => {
          const pdfColumns = customisedExportedColumns()?.filter(column => column?.show && !column?.hideInExcel);
          // Use the same exportData that's already processed for Excel
          tableUtils.downloadPDF(exportData, pdfColumns, title || name);
        }}>
          <span>
            <IconProvider name="file" size={16} style={{ marginRight: '8px' }} />
          </span>
          <span>PDF</span>
        </div>
      ),
      key: '2',
      fileType: 'pdf',
    },
  ];

  const menuProps = {
    items: exportMenuSource
      .filter((item) => !downloaderFileNotAllowed.includes(item.fileType))
      .map(({ fileType, ...menuItem }) => menuItem),
    onClick: () => null,
  };

  const amountChangeFromTable = (val) => {
    setData([...tableUtils.amountChangeFromTable(val, currencyColKeys, data)]);
  };

  const resolvedMaxHeight =
    scrollViewportMaxHeightPx != null
      ? `${scrollViewportMaxHeightPx}px`
      : maxHeight;

  return (
    <TableWrapper
      name={name}
      stickyColumns={stickyColumns}
      tableStyle={tableStyle}
      columnSuperHeadersJSX={columnSuperHeadersJSX}
      customHeaderStyle={customHeaderStyle}
      customCellStyle={customCellStyle}
      resolveRowStyle={resolveRowStyle}
      colHeaderRowRef={colHeaderRowRef}
      columnHeadersJSX={columnHeadersJSX}
      selectable={selectable}
      selectType={selectType}
      conditionalSelectable={conditionalSelectable}
      setSelected={setSelected}
      selected={selected}
      displayRows={displayRows}
      rowsToRender={rowsToRender}
      setSelectAllSelected={setSelectAllSelected}
      selectAllSelected={selectAllSelected}
      maxHeight={resolvedMaxHeight}
      scrollBodyRef={tableScrollBodyRef}
      tableWrapperRef={tableWrapperRef}
      paginationFooterRef={paginationFooterRef}
      rowDataJSX={rowDataJSX}
      stickyColumnHeadersJSX={stickyColumnHeadersJSX}
      rowStyles={rowStyles}
      actions={actions}
      actionHeader={actionHeader}
      columns={columns}
      displayColumns={displayColumns}
      embedDisplays={embedDisplays}
      embedFunction={embedFunction}
      selectedCB={selectedCB}
      setEmbedDisplays={setEmbedDisplays}
      showPagination={showPagination}
      tableParams={tableParams}
      total={total}
      overallRowTotal={overallRowTotal}
      limit={limit}
      searchByPageNo={searchByPageNo}
      item={item}
      setTableParams={setTableParams}
      selectionDisclaimer={selectionDisclaimer}
      handleClearSelection={handleClearSelection}
      styles={styles}
      title={title}
      pageButtons={pageButtons}
      showAll={showAll}
      hideAllOptions={hideAllOptions}
      showTitle={showTitle}
      count={count}
      searchable={searchable}
      onSearchCommit={debouncedCommitSearch}
      currencyFilterable={currencyFilterable}
      getFormItem={getFormItem}
      amountChangeFromTable={amountChangeFromTable}
      currencyColKeys={currencyColKeys}
      data={data}
      currencyBtn={currencyBtn}
      showCustomisedMenu={showCustomisedMenu}
      setColumns={setColumns}
      downloadable={downloadable}
      menuButtons={menuButtons}
      menuProps={menuProps}
      disableExport={disableExport}
      extraMenuButtons={extraMenuButtons}
      customJSX={customJSX}
      handleRowAction={handleRowAction}
      isColumn={isColumn}
      columnStyles={columnStyles}
    />
  );
};

export default Table;