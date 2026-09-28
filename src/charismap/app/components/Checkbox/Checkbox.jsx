import React from 'react';
import styles from './Checkbox.module.scss';

const Checkbox = ({ 
  id, 
  label, 
  checked, 
  onChange, 
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <label 
      className={`${styles.checkboxLabel} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''} ${className}`}
      htmlFor={id}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={styles.checkbox}
        {...props}
      />
      <span className={styles.checkboxText}>{label}</span>
    </label>
  );
};

export default Checkbox;
