import React from 'react';
import styles from './table.module.scss';
import tableUtils from './tableUtils';
import pluralize from "pluralize";
import ButtonGenerator from './ButtonGenerator';
import Input from '../../Input';

// Main pagination component
const TablePagination = ({ 
  showPagination,
  total,
  tableParams,
  setTableParams,
  totalButtons,
  searchByPageNo,
  item
}) => {
  if (!showPagination) return null;
    const { skip, limit, page } = tableParams;
    const effLimit =
      !Number.isFinite(limit) || limit <= 0 || limit === Infinity
        ? Math.max(total, 1)
        : limit;
    const rangeEnd = total === 0 ? 0 : Math.min(skip + effLimit, total);
    
  return (
      <div className={styles["pagination"]}>
          <p className={styles['pagination-summary']}>
              Showing {total === 0 ? 0 : skip + 1} - {rangeEnd} of {total} {pluralize(tableUtils.capitalize(item))}
          </p>
          {totalButtons > 1 && <ButtonGenerator {...{ tableParams, setTableParams, total  }} />}
          <div className={styles['pagination-page-jump']}>
              {searchByPageNo ? (
                <Input
                  label="Page"
                  placeholder="Page no."
                  voiceInput={false}
                  className={styles['table-search-input-tight']}
                  value={page === 0 ? '' : String(page)}
                  onKeyDown={(e) => {
                      if (e.key === "Enter") {                          
                          setTableParams({ ...tableParams, page: page === 0 ? 1 : page, skip :limit * (+ e.target.value - 1)});
                      }
                  }}
                  onChange={e => {
                      if (e.target.value === "")
                        setTableParams({ ...tableParams, page: 0 });
                      if (Number.isInteger(+e.target.value) && +e.target.value > 0 && +e.target.value <= totalButtons)
                          setTableParams({ ...tableParams, page: +e.target.value });
                      
                  }}
                />
              ) : null}
          </div>
      </div>
  );
};

export default TablePagination;
