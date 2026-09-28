'use client';

import React from 'react';
import styles from '../Button/Button.module.scss';
import { useActivityLog } from '@/app/hooks/useActivityLog';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false, 
  onClick, 
  className = '',
  type = 'button',
  isSocial = false,
  icon = null,
  /** Square pagination control; use with variant="pagination". */
  active = false,
  /** Adds an animated light-sweep + glow for high-attention CTAs (e.g. "Start Practice"). */
  shine = false,
  /** Opt-in activity logging: when set, click is logged as an `action` event. */
  track = null,
  trackMeta = null,
  ...props 
}) => {
  const { logAction } = useActivityLog();
  const baseClass = styles.charismaBtn;

  const handleClick = (event) => {
    if (track) logAction(track, trackMeta || undefined);
    onClick?.(event);
  };
  
  const variantClasses = {
    primary: styles.charismaBtnPrimary,
    secondary: styles.charismaBtnSecondary,
    danger: styles.charismaBtnDanger,
    pagination: styles.charismaBtnPagination,
  };
  
  const sizeClasses = {
    small: styles.charismaBtnSmall,
    medium: '',
    large: styles.charismaBtnLarge,
  };

  const sizeClass = variant === 'pagination' ? '' : sizeClasses[size];

  // The icon-only square treatment (`charismaIconBtn`) is just for buttons with no label.
  const isIconOnly = Boolean(icon) && !children;

  const classes = [
    baseClass,
    variantClasses[variant],
    sizeClass,
    loading ? styles.charismaBtnLoading : '',
    isSocial ? styles.charismaSocialBtn : '',
    isIconOnly ? styles.charismaIconBtn : '',
    shine ? styles.charismaBtnShine : '',
    variant === 'pagination' && active ? styles.charismaBtnPaginationActive : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      {...(track ? { 'data-track': track } : {})}
      {...props}
      {...(variant === 'pagination' && active ? { 'aria-current': 'page' } : {})}
    >
      {icon && (
        <span className={styles.icon}>
          {typeof icon === 'string' && icon.startsWith('<svg') ? (
            <span dangerouslySetInnerHTML={{ __html: icon }} />
          ) : (
            icon
          )}
        </span>
      )}
      {children}
    </button>
  );
};

export default Button; 