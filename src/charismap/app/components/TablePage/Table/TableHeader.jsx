import React from 'react';
import styles from './TableHeader.module.scss';

const TableHeader = ({ title, pageButtons, showAll, hideAllOptions, showTitle, name }) => {
  if (!title && !pageButtons) return null;

  return (
    <div className={styles["title"]}>
      {(!showAll || hideAllOptions) && showTitle && (
        <h1 className={`${name}-title`}>{title}</h1>
      )}
      {pageButtons && (
        <div className={styles["title-buttons"]}>{pageButtons}</div>
      )}
    </div>
  );
};

export default TableHeader;
