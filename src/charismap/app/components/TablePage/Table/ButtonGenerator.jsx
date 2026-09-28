import React from 'react';
import Button from '../../Button';
import styles from './table.module.scss';
import IconProvider from '../../IconProvider';

function paginationBtnClass(active) {
  const parts = [styles['pagination-nav-btn']];
  if (active) parts.push(styles['page-active']);
  return parts.join(' ');
}

export default function ButtonGenerator({ tableParams, setTableParams, total }) {
  const { limit, skip } = tableParams;
  const effLimit =
    !Number.isFinite(limit) || limit <= 0 || limit === Infinity
      ? Math.max(total, 1)
      : limit;
  const buttonNumber = Math.floor(skip / effLimit) + 1;

  const totalButtons = Math.max(1, Math.ceil(total / effLimit));
  let relativeNeighborIndexes = [-2, -1, 0, 1, 2];
  if (buttonNumber === 4) relativeNeighborIndexes = [-3, ...relativeNeighborIndexes];
  if (buttonNumber === 5) relativeNeighborIndexes = [-4, -3, ...relativeNeighborIndexes];
  if (buttonNumber === totalButtons - 3) relativeNeighborIndexes.push(3);
  if (buttonNumber === totalButtons - 4) relativeNeighborIndexes.push(3, 4);

  const handleSkipChange = (newSkip) => {
    setTableParams({
      ...tableParams,
      skip: newSkip,
    });
  };

  return (
    <div className={styles['button-holder']}>
      {skip !== 0 && (
        <Button
          key="left-arrow"
          variant="pagination"
          className={styles['pagination-nav-btn']}
          onClick={() => handleSkipChange(skip - effLimit)}
          aria-label="Previous page"
        >
          <IconProvider name="chevronLeft" size={16} />
        </Button>
      )}

      {buttonNumber >= 6 && (
        <>
          <Button
            key={1}
            variant="pagination"
            className={paginationBtnClass(skip === 0)}
            active={skip === 0}
            onClick={() => handleSkipChange(0)}
          >
            1
          </Button>
          <span className={styles['pagination-ellipsis']} aria-hidden>…</span>
        </>
      )}
      {relativeNeighborIndexes.map((i) => {
        const pageNum = buttonNumber + i;
        const active = skip === (pageNum - 1) * effLimit;
        return (
          pageNum > 0 &&
          pageNum <= totalButtons && (
            <Button
              key={pageNum}
              variant="pagination"
              className={paginationBtnClass(active)}
              active={active}
              onClick={() => handleSkipChange((pageNum - 1) * effLimit)}
            >
              <span>{pageNum}</span>
            </Button>
          )
        );
      })}
      {buttonNumber < totalButtons - 4 && (
        <>
          <span className={styles['pagination-ellipsis']} aria-hidden>…</span>
          <Button
            key={totalButtons}
            variant="pagination"
            className={paginationBtnClass(skip === (totalButtons - 1) * effLimit)}
            active={skip === (totalButtons - 1) * effLimit}
            onClick={() => handleSkipChange((totalButtons - 1) * effLimit)}
          >
            {totalButtons}
          </Button>
        </>
      )}

      {skip < total - effLimit && (
        <Button
          key="right-arrow"
          variant="pagination"
          className={styles['pagination-nav-btn']}
          onClick={() => handleSkipChange(skip + effLimit)}
          aria-label="Next page"
        >
          <IconProvider name="chevronRight" size={16} />
        </Button>
      )}
    </div>
  );
}
