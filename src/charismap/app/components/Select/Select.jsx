'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Select.module.scss';

export default function Select({ 
  label,
  placeholder,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  className = '',
  /** When false, hides the clear row (e.g. required picks like page size). */
  clearable = true,
  /** Shorter control for toolbars (no floating label slot). */
  compact = false,
  ...props 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  /** Filter for the open list only, empty on open so all options show while input still displays the selection. */
  const [listFilter, setListFilter] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState('below'); // 'above' or 'below'
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);
  const isClearingRef = useRef(false);
  const isSelectingRef = useRef(false);

  const labelText = label; // Only use explicit label, not placeholder
  const isLabelActive = true; // Always keep label at top

  
  // Calculate dropdown position based on viewport space
  const calculateDropdownPosition = () => {
    if (!selectRef.current) return { position: 'below', style: {}, maxHeight: 200 };
    
    const rect = selectRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const minDropdownHeight = 100; // Minimum height for dropdown
    const maxDropdownHeight = 300; // Maximum height for dropdown
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Calculate available space - leave some padding (20px) from viewport edges
    const availableSpaceBelow = Math.max(minDropdownHeight, spaceBelow - 20);
    const availableSpaceAbove = Math.max(minDropdownHeight, spaceAbove - 20);
    
    const style = {
      left: rect.left,
      width: rect.width,
      zIndex: 100000, // Much higher than modal (1000) to ensure dropdown is always on top
      position: 'fixed'
    };
    
    let maxHeight = maxDropdownHeight;
    let position = 'below';
    
    // If there's not enough space below but enough space above, open upward
    if (spaceBelow < minDropdownHeight && spaceAbove > minDropdownHeight) {
      position = 'above';
      maxHeight = Math.min(maxDropdownHeight, availableSpaceAbove);
      style.top = Math.max(20, rect.top - maxHeight); // Position above, respecting top padding
    } else {
      // Default: open below
      position = 'below';
      maxHeight = Math.min(maxDropdownHeight, availableSpaceBelow);
      style.top = rect.bottom + 2; // Add 2px to avoid cutting into field
    }
    
    return { position, style: { ...style, maxHeight: `${maxHeight}px` } };
  };
  
  // List uses listFilter only (reset when menu opens) so reopening shows every option in original order
  const filteredData = options.filter((item) => {
    if (!item || item.label == null) return false;
    const q = typeof listFilter === 'string' ? listFilter.trim().toLowerCase() : '';
    if (!q) return true;
    return String(item.label).toLowerCase().includes(q);
  });

  const handleSelect = (selectedValue, selectedLabel) => {
    // Create a synthetic event object to match standard input behavior
    if (selectedValue !== undefined && selectedValue !== null) {
      isSelectingRef.current = true; // Flag that we're selecting
      // Set searchTerm immediately to show the selected value
      setSearchTerm(selectedLabel || '');
      // Call onChange to update parent component
      onChange && onChange(selectedValue);
      // Reset flag after a short delay to allow state updates
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
    setIsOpen(false);
    setListFilter('');
  };

  const handleClear = (e) => {
    e?.stopPropagation(); // Prevent event bubbling
    e?.preventDefault(); // Prevent default behavior
    isClearingRef.current = true; // Flag that we're clearing
    onChange && onChange(''); // Pass empty string to clear the value
    setSearchTerm(''); // Clear search term to show placeholder
    setListFilter('');
    setHighlightedIndex(-1);
    setIsOpen(false); // Close the dropdown
    selectRef.current?.blur(); // Defocus the input field
    // Reset flag after a short delay to allow state updates
    setTimeout(() => {
      isClearingRef.current = false;
    }, 100);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setListFilter('');
    setHighlightedIndex(-1);

    // Small delay to ensure DOM is ready for positioning calculation
    setTimeout(() => {
      const { position, style } = calculateDropdownPosition();
      setDropdownPosition(position);
      setDropdownStyle(style);
    }, 0);
  };

  // Recalculate position on scroll and window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      const { position, style } = calculateDropdownPosition();
      setDropdownPosition(position);
      setDropdownStyle(style);
    };

    const handleResize = () => {
      const { position, style } = calculateDropdownPosition();
      setDropdownPosition(position);
      setDropdownStyle(style);
    };

    window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scrolls
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleBlur = () => {
    // Don't interfere if we're in the middle of clearing
    if (isClearingRef.current) {
      return;
    }
    
    setHighlightedIndex(-1);
    
    // If user typed something that doesn't match any option, save it as the value
    if (searchTerm && searchTerm.trim() !== '') {
      const matchingOption = options.find(item =>
        String(item.label).toLowerCase() === searchTerm.toLowerCase() ||
        String(item.value).toLowerCase() === searchTerm.toLowerCase()
      );
      
      if (!matchingOption) {
        // User typed something that's not in options - save it as the value
        // This allows free-form text input for fields like city
        onChange(searchTerm.trim());
        // Keep the searchTerm as is so it displays
        setTimeout(() => {
          setIsOpen(false);
          setListFilter('');
        }, 200);
        return;
      }
    }
    
    // Only revert to selected value if no valid selection was made
    const selectedItem = options.find(item => item.value === value);
    if (selectedItem) {
      // If we have a selected item, show its label
      setSearchTerm(selectedItem.label);
    } else if (value && value.trim() !== '') {
      // If value exists but no matching option, display the value itself
      setSearchTerm(value);
    } else {
      // Always clear search term if there's no value (to show placeholder)
      setSearchTerm('');
    }
    
    // Delay closing to allow for option selection
    setTimeout(() => {
      setIsOpen(false);
      setListFilter('');
    }, 200);
  };

  const handleInputChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setListFilter(newSearchTerm);
    setIsOpen(true);
    setHighlightedIndex(-1); // Reset highlight when typing
    
    // Recalculate position when typing
    const { position, style } = calculateDropdownPosition();
    setDropdownPosition(position);
    setDropdownStyle(style);
    
    // Don't clear the value when typing - let the user search freely
    // The value will only be set when they actually select an option
  };

  // Scroll highlighted option into view
  const scrollToHighlighted = (index) => {
    if (optionRefs.current[index] && dropdownRef.current) {
      const optionElement = optionRefs.current[index];
      const dropdownElement = dropdownRef.current;
      
      const optionRect = optionElement.getBoundingClientRect();
      const dropdownRect = dropdownElement.getBoundingClientRect();
      
      // Check if option is above the visible area
      if (optionRect.top < dropdownRect.top) {
        optionElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      // Check if option is below the visible area
      else if (optionRect.bottom > dropdownRect.bottom) {
        optionElement.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setListFilter('');
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = highlightedIndex < filteredData.length - 1 ? highlightedIndex + 1 : 0;
        setHighlightedIndex(nextIndex);
        setTimeout(() => scrollToHighlighted(nextIndex), 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = highlightedIndex > 0 ? highlightedIndex - 1 : filteredData.length - 1;
        setHighlightedIndex(prevIndex);
        setTimeout(() => scrollToHighlighted(prevIndex), 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredData[highlightedIndex]) {
          const item = filteredData[highlightedIndex];
          handleSelect(item.value, item.label);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setListFilter('');
        setHighlightedIndex(-1);
        break;
    }
  };



  // Sync searchTerm with value prop
  useEffect(() => {
    // Don't interfere if we're in the middle of selecting or clearing
    if (isSelectingRef.current || isClearingRef.current) {
      return;
    }
    
    // If value is empty/null/undefined, always clear searchTerm to show placeholder
    if (!value || value === '' || value === null || value === undefined) {
      setSearchTerm('');
      return;
    }
    
    // If value exists, try to find matching option
    const selectedItem = options.find(item => item.value === value);
    if (selectedItem) {
      // Update searchTerm to show the selected option's label
      setSearchTerm(selectedItem.label);
    } else {
      // If value exists but no matching option found, display the value itself
      // This allows displaying values that aren't in the options list (e.g., auto-filled cities)
      setSearchTerm(value);
    }
  }, [value, options]);


  
  return (
    <div
      className={`${styles.selectContainer} ${compact ? styles.selectContainerCompact : ''} ${isOpen ? styles.dropdownOpen : ''} ${className}`}
    >
      <div className={styles.selectWrapper}>
        <input
          ref={selectRef}
          type="text"
          placeholder={placeholder}
          value={typeof searchTerm === 'string' ? searchTerm : ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={false}
          aria-required={required || undefined}
          disabled={disabled}
          className={`${styles.selectField} ${compact ? styles.selectFieldCompact : ''}`}
          autoComplete="off"
          {...props}
        />
        
        <div className={styles.actionButtons}>
          <div className={`${styles.dropdownArrow} ${isOpen ? styles.open : ''}`}>
            ▼
          </div>
        </div>
      </div>
      
      {isOpen && createPortal(
        <div 
          className={`${styles.dropdown} ${dropdownPosition === 'above' ? styles.dropdownAbove : styles.dropdownBelow}`}
          style={dropdownStyle}
        >
          <div ref={dropdownRef} className={styles.dropdownList}>
          {filteredData.length === 0 ? (
            <div className={styles.noOptions}>No options found</div>
          ) : (
            <>
              {clearable ? (
                <div
                  ref={el => optionRefs.current[-1] = el}
                  className={`${styles.option} ${styles.clearOption}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleClear(e);
                  }}
                >
                  ✕ Clear selection
                </div>
              ) : null}
              {filteredData.map((item, index) => (
                <div
                  key={item.value}
                  ref={el => optionRefs.current[index] = el}
                  className={`${styles.option} ${value && item.value === value ? styles.selected : ''} ${index === highlightedIndex ? styles.highlighted : ''}`}
                  onClick={() => handleSelect(item.value, item.label)}
                >
                  {item.label}
                </div>
              ))}
            </>
          )}
          </div>
        </div>,
        document.body
      )}
      
      {labelText && !compact && (
        <label 
          className={`${styles.floatingLabel} ${isLabelActive ? styles.active : ''}`}
          title={labelText}
        >
          {labelText}
          {required ? <span className={styles.requiredMark} aria-hidden="true">*</span> : null}
        </label>
      )}
    </div>
  );
}
