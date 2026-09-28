import React from 'react';
import { Select, Input, Dropdown } from 'antd';
import Button from '../../Button';
import tableUtils from './tableUtils';
import styles from './TableControls.module.scss';
import TableMenu from './TableMenu';
import pluralize from "pluralize";
import IconProvider from '../../IconProvider';

// Separate component for the limit selector
const LimitSelector = ({ tableParams, setTableParams, count, total = 0 }) => {
  const rowTotal = Math.max(total ?? 0, count ?? 0);
  const limitOpts = tableUtils.filterLimitOptionsByRowTotal(rowTotal).map((opt) => ({
    label: opt.label,
    value: opt.value === Infinity ? 'all' : opt.value,
  }));
  return (
  <>
    <span className='mt-[8px]'>{"Show "}</span>
    <Select
      className="rounded-[5px] p-2 mx-2 w-[70px] h-[40px]"
      defaultValue={10}
      disabled={false}
      options={limitOpts}
      onChange={(val) => {
        const rt = Math.max(total ?? 0, count ?? 0);
        const nextLimit =
          val === 'all' || val === Infinity ? rt : typeof val === 'number' ? val : Number(val);
        setTableParams({
          ...tableParams,
          limit: nextLimit,
          skip: 0,
          page: 1,
        });
      }}
      style={{
        borderRadius: "5px",
        padding: "0 0 4px", 
      }}
    />
  </>
  );
};

// Separate component for the search input
const SearchInput = ({ debouncedSearch }) => (
  <Input
    onChange={e => debouncedSearch(e.target.value)}
    className={styles["table-search"]}
    disabled={false}
    placeholder={"Search"}
    suffix={<IconProvider name="search" size={16} />}
  />
);

// Separate component for currency filter
const CurrencyFilter = ({ getFormItem, amountChangeFromTable }) => (
  <div className='w-[150px] mr-3'>
    {getFormItem(
      "select",
      {
        key: "curencyConverterActive",
        name: "curencyConverterActive",
        className: '!mb-0'
      },
      {
        options: tableUtils.currencyOptions,
        defaultValue: "none",
        sort: false,
        onChange: amountChangeFromTable,
      }
    )}
  </div>
);

// Separate component for export button
const ExportButton = ({ menuProps, disableExport }) => (
  <div className={styles["options"]}>
    <Dropdown menu={menuProps} disabled={disableExport}>
      <Button variant="secondary" type="button">
        <span className={styles.btnIconLabel}>
          <IconProvider name="export" size={18} />
          <span>Export</span>
        </span>
      </Button>
    </Dropdown>
  </div>
);

const TableControls = ({
  hideAllOptions,
  showAll,
  tableParams,
  setTableParams,
  count,
  total = 0,
  item,
  name,
  title,
  searchable,
  debouncedSearch,
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
}) => {
  if (hideAllOptions) return null;

  return (
    <div className={`${styles["table-control-section"]} pb-[10px] min-w-full sampleTable`}>
      {!showAll ? (
        <>
          <LimitSelector 
            tableParams={tableParams}
            setTableParams={setTableParams}
            count={count}
            total={total}
          />
          <span className='mt-[8px] mr-[5px]'>
            {pluralize(tableUtils.capitalize(item))}
          </span>
        </>
      ) : (
        <div className={`${name}-title`}>{title}</div>
      )}

      {searchable && <SearchInput debouncedSearch={debouncedSearch} />}

      <div className="flex items-center">
        {currencyFilterable && (
          <CurrencyFilter 
            getFormItem={getFormItem}
            amountChangeFromTable={amountChangeFromTable}
          />
        )}

        {currencyBtn && <span className='mr-[10px]'>{currencyBtn}</span>}
        
        {showCustomisedMenu && (
          <TableMenu 
            name={name}
            columns={columns.filter(column => column)} 
            setColumns={setColumns}
            downloadable={downloadable}
            menuButtons={menuButtons}
          />
        )}

        {downloadable && (
          <ExportButton 
            menuProps={menuProps}
            disableExport={disableExport}
          />
        )}

        {extraMenuButtons && (
          <div className={styles["options"]}>{extraMenuButtons}</div>
        )}
      </div>
    </div>
  );
};

export default TableControls;
