import React from 'react';
import { Popover } from 'antd';
import Button from '../../Button';
import IconProvider from '../../IconProvider';
import Checkbox from '../../Checkbox';
import styles from './table.module.scss';

const TableMenu = ({ columns = [], setColumns, title = '', menuButtons, isColumn = true, name = 'table' }) => {
  const onChange = (e, field) => {
    const checked = e.target.checked;
    const data = columns.map((column) =>
      column.field === field ? { ...column, show: checked } : column
    );
    setColumns(data);
  };

  const content = () => (
    <div className={styles['column-selector-list']}>
      {columns
        .filter((col) => col.visible)
        .map((column) => {
          const { field, header, show } = column;
          const id = `${name}-col-${String(field).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          return (
            <Checkbox
              key={field}
              id={id}
              label={header ?? field}
              checked={show ?? true}
              onChange={(e) => onChange(e, field)}
            />
          );
        })}
    </div>
  );

  return (
    <>
      {menuButtons}
      {isColumn ? (
        <Popover
          placement="bottomRight"
          title={title || undefined}
          content={content}
          trigger="click"
          arrow={false}
          classNames={{ root: styles.columnSelectorPopover }}
        >
          <Button variant="secondary" type="button">
            <span className={styles.btnIconLabel}>
              <IconProvider name="columns" size={18} />
              <span>Columns</span>
            </span>
          </Button>
        </Popover>
      ) : null}
    </>
  );
};

export default TableMenu;
