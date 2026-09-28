import React, { useRef, useEffect } from 'react';
import styles from './table.module.scss';
import { Dropdown } from "antd";
import TableMenu from './TableMenu';
import tableUtils from './tableUtils';
import TableRow from "./TableRow";
import pluralize from "pluralize";
import IconProvider from '../../IconProvider';
import Button from '../../Button';
import Input from '../../Input';
import Select from '../../Select/Select';
import TablePagination from './TablePagination';
import TableData from './TableData';

const TableHeader = ({ title, pageButtons, showAll, hideAllOptions, showTitle, name }) => (
  <>
    {(title || pageButtons) && (
      <div className={styles.title}>
        {(!showAll || hideAllOptions) && showTitle && title ? (
          <h4 className={styles['table-heading']} id={`${name}-title`}>
            {title}
          </h4>
        ) : null}
        {pageButtons ? <div className={styles['title-buttons']}>{pageButtons}</div> : null}
      </div>
    )}
  </>
);

const TableControls = ({
  showAll,
  name,
  title,
  tableParams,
  setTableParams,
  count,
  total,
  /** Full row count before search, drives “Show N entries” options only */
  overallRowTotal = 0,
  item,
  searchable,
  /** Debounced callback, table filters on `tableParams.search` only after typing pauses */
  onSearchCommit,
  currencyFilterable,
  getFormItem,
  amountChangeFromTable,
  currencyBtn,
  showCustomisedMenu,
  columns,
  setColumns,
  downloadable,
  menuButtons,
  menuProps,
  disableExport,
  extraMenuButtons,
  customJSX,
  currencyColKeys,
  data,
  currencyType,
  isColumn
}) => {
  const tableSearchRef = useRef(null);
  const prevCommittedSearchRef = useRef(tableParams?.search ?? '');

  useEffect(() => {
    const curr = tableParams?.search ?? '';
    const prev = prevCommittedSearchRef.current ?? '';
    prevCommittedSearchRef.current = curr;
    if (prev && !curr && tableSearchRef.current) {
      tableSearchRef.current.value = '';
    }
  }, [tableParams?.search]);

  const limit = tableParams?.limit ?? 10;
  const pageSizeSelectId = `${name}-page-size`;
  const optionCap =
    overallRowTotal > 0 ? overallRowTotal : Math.max(1, Number(total) || 0, Number(count) || 0);
  const limitOptionValue = (opt) => (opt.value === Infinity ? 'all' : String(opt.value));
  const selectValue =
    !Number.isFinite(limit) || limit === Infinity ? 'all' : String(limit);

  const pageSizeOptions = tableUtils.filterLimitOptionsByRowTotal(optionCap).map((opt) => ({
    label: String(opt.label),
    value: limitOptionValue(opt),
  }));

  return (
    <div className={styles['table-control-section']}>
      <div data-table-toolbar="left">
        {!showAll ? (
        <div className={styles['table-page-size-wrap']}>
          <span className={styles['table-page-size-label']}>Show</span>
          <Select
            id={pageSizeSelectId}
            compact
            clearable={false}
            placeholder=""
            value={selectValue}
            onChange={(v) => {
              const s = v == null ? '' : String(v);
              const next = s === 'all' ? Infinity : Number(s);
              setTableParams({
                ...tableParams,
                limit: Number.isFinite(next) ? next : Infinity,
                skip: 0,
              });
            }}
            options={pageSizeOptions}
            aria-label="Number of rows per page"
          />
          <span className={styles['table-page-size-suffix']}>
            {pluralize(tableUtils.capitalize(item))}
          </span>
        </div>
      ) : (
        title ? <p>{title}</p> : null
      )}

      {searchable ? (
        <div className={styles['table-search-wrap']}>
          <Input
            ref={tableSearchRef}
            label="Search"
            placeholder="e.g. Eevee or Absol"
            defaultValue={tableParams?.search ?? ''}
            voiceInput={false}
            className={styles['table-search-input-tight']}
            onChange={(e) => onSearchCommit?.(e.target.value)}
          />
        </div>
        ) : null}
      </div>

      <div data-table-toolbar="right">
      {currencyFilterable ? (
        <div className={styles['table-currency-wrap']}>
          {getFormItem(
            'select',
            {
              key: 'curencyConverterActive',
              name: 'curencyConverterActive',
              className: '!mb-0',
            },
            {
              options: tableUtils.currencyOptions,
              defaultValue: 'none',
              sort: false,
              onChange: amountChangeFromTable,
            }
          )}
        </div>
      ) : null}

      {currencyBtn}

      {showCustomisedMenu ? (
        <TableMenu
          name={name}
          columns={columns.filter((column) => column)}
          setColumns={setColumns}
          downloadable={downloadable}
          menuButtons={menuButtons}
          isColumn={isColumn}
        />
      ) : null}

      {downloadable ? (
        <div className={styles.options}>
          <Dropdown
            menu={menuProps}
            disabled={disableExport}
            classNames={{ root: styles.tableAntDropdown }}
          >
            <Button variant="secondary" type="button">
              <span className={styles.btnIconLabel}>
                <IconProvider name="export" size={18} />
                <span>Export</span>
              </span>
            </Button>
          </Dropdown>
        </div>
      ) : null}

      {extraMenuButtons ? <div className={styles.options}>{extraMenuButtons}</div> : null}

      {customJSX ? <div className={styles.options}>{customJSX}</div> : null}
      </div>
    </div>
  );
};

const TableContents = ({
    name,
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
    selected,
    displayRows,
    rowsToRender,
    setSelectAllSelected,
    selectAllSelected,
    maxHeight,
    scrollBodyRef,
    tableWrapperRef,
    paginationFooterRef,
    rowDataJSX,
    stickyColumnHeadersJSX,
    resolveRowStyle,
    customCellStyle,
    actions,
    actionHeader,
    columns,
    displayColumns,
    embedDisplays,
    embedFunction, 
    selectedCB,
    setEmbedDisplays,
    showPagination,
    tableParams,
    total,
    limit,
    searchByPageNo,
    item,
    setTableParams,
    selectionDisclaimer,
    handleClearSelection,
    handleRowAction,
    columnStyles,
}) => {
  /** Body min-height follows actual rows on the page, not the chosen page-size cap */
  const pageSlotCount =
    showPagination && (displayRows?.length ?? 0) > 0 ? displayRows.length : 0;
  const stickyRows = rowsToRender ?? displayRows;
  const tableRowsBodyStyle =
    pageSlotCount > 0 && displayRows?.length > 0
      ? { '--table-page-slot-count': String(pageSlotCount) }
      : undefined;

  return (
    <div className={name + ' ' + styles["pagination-wrapper"]}>

        { /* main table */}
        <div
            ref={tableWrapperRef}
            className={styles['table-wrapper']}
            style={
                maxHeight != null &&
                maxHeight !== '' &&
                String(maxHeight).toLowerCase() !== 'auto'
                    ? { maxHeight }
                    : undefined
            }
        >
            <div className={styles['table-scroll-stage']}>
              <div className={styles['table-inner-row']}>
                <TableData
                  styles={styles}
                  stickyColumns={stickyColumns}
                  tableStyle={tableStyle}
                  columnSuperHeadersJSX={columnSuperHeadersJSX}
                  customHeaderStyle={customHeaderStyle}
                  colHeaderRowRef={colHeaderRowRef}
                  columnHeadersJSX={columnHeadersJSX}
                  selectable={selectable}
                  selectType={selectType}
                  conditionalSelectable={conditionalSelectable}
                  setSelected={setSelected}
                  displayRows={displayRows}
                  selected={selected}
                  setSelectAllSelected={setSelectAllSelected}
                  selectAllSelected={selectAllSelected}
                  scrollBodyRef={scrollBodyRef}
                  rowDataJSX={rowDataJSX}
                  tableRowsBodyStyle={tableRowsBodyStyle}
                />

                {!!stickyColumnHeadersJSX.length && (
                  <div className={styles['sticky-column-holder']}>
                    <div className={styles['sticky-column-header-block']}>
                      <div className={styles['column-headers']}>
                        <div className={styles['column-header-row']}>
                          {stickyColumnHeadersJSX}
                        </div>
                      </div>
                    </div>
                    <div
                      className={styles['sticky-column-rows']}
                      style={tableRowsBodyStyle}
                    >
                      {stickyRows.map((row, index) => (
                        <div className={styles['row-wrapper']}
                        key={+row?.tableSerialNumber - 1}>
                        <TableRow
                            key={+row?.tableSerialNumber - 1}
                            handleRowAction={handleRowAction}
                            inStickySection
                            rowStyle={typeof resolveRowStyle === 'function' ? resolveRowStyle(row) : {}}
                            customCellStyle={customCellStyle}
                            columnStyles={columnStyles}
                            {...{ actions, actionHeader, name, columns, conditionalSelectable, row, index, displayRows, displayColumns, selectable, embedDisplays, embedFunction, selected, selectedCB, selectType, setEmbedDisplays, setSelectAllSelected, setSelected }}
                        />
                    </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
        { /* main table */}
 
        {/* footer for table */}
        {showPagination && (
          <div ref={paginationFooterRef}>
            <TablePagination
            showPagination={showPagination}
            total={total}
            tableParams={tableParams}
            setTableParams={setTableParams}
            totalButtons={(() => {
              const raw = limit;
              const eff =
                !Number.isFinite(raw) || raw <= 0 || raw === Infinity
                  ? Math.max(total, 1)
                  : raw;
              return Math.max(1, Math.ceil(total / eff));
            })()}
            searchByPageNo={searchByPageNo}
            item={item}
            />
          </div>
        )}
        {/* footer for table */}

    </div>
  );
};

const TableWrapper = (props) => {
  const {
    styles,
    name,
    title,
    pageButtons,
    showAll,
    hideAllOptions,
    showTitle,
    scrollBodyRef,
    tableWrapperRef,
    paginationFooterRef,
    ...rest
  } = props;

  return (
    <div className={styles['table-page']}>
      <TableHeader
        title={title}
        pageButtons={pageButtons}
        showAll={showAll}
        hideAllOptions={hideAllOptions}
        showTitle={showTitle}
        name={name}
      />

      {!hideAllOptions && (
        <TableControls
          name={name}
          title={title}
          showAll={showAll}
          {...rest}
        />
      )}

          <TableContents
            name={name}
            title={title}
            showAll={showAll}
            scrollBodyRef={scrollBodyRef}
            tableWrapperRef={tableWrapperRef}
            paginationFooterRef={paginationFooterRef}
            {...rest}
          />
    </div>
  );
};

export default TableWrapper;
