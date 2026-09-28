'use client';

import { useEffect } from 'react';
import IconProvider from '../IconProvider';

// variant="practice": width rules in globals (.modal--practice); omit maxWidth for those modals.
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px',
  hideHeader = false,
  preventClose = false,
  variant,
  elevated = false,
}) {
  const isPractice = variant === 'practice';
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !preventClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, preventClose]);

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'modal-open' : 'modal-closed'}${elevated ? ' modal-overlay--elevated' : ''}`}
      onClick={(e) => {
        if (isOpen && !preventClose) {
        onClose();
        }
      }}
    >
      <div
        className={`modal${isPractice ? ' modal--practice' : ''}${elevated ? ' modal--elevated' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={isPractice ? undefined : { maxWidth }}
      >
        {!hideHeader && (
        <div className="modal-header">
          {title && <h3>{title}</h3>}
          <button 
            className="close-btn" 
            onClick={(e) => {
                if (!preventClose) {
              onClose();
                }
            }}
          >
            <IconProvider name="close" size={20} color="currentColor" />
          </button>
        </div>
        )}
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
