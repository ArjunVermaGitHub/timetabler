'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect, forwardRef } from 'react';
import styles from './Input.module.scss';
import { useVoiceField, isVoiceInputSupported, scrollFieldIntoView } from '../../hooks/useSpeechTranscription';
import TranscribeMicButton, { VoiceFieldStatus } from '../TranscribeMicButton';
import IconProvider from '../IconProvider';

const MAX_GROUPED_DIGITS = 12;

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function groupIntegerDigits(value) {
  const digits = digitsOnly(value).slice(0, MAX_GROUPED_DIGITS);
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

function caretIndexForDigitCount(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

const Input = forwardRef(function Input(
  {
    type = 'text',
    label,
    placeholder,
    value,
    defaultValue,
    onChange,
    required = false,
    className = '',
    voiceInput = true,
    voiceLang,
    onBlur,
    onFocus,
    thousandsSeparator = false,
    disabled = false,
    readOnly = false,
    ...props
  },
  forwardedRef
) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasAutofill, setHasAutofill] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const inputRef = useRef(null);
  const groupedCaretDigitsRef = useRef(null);

  const isControlled = value !== undefined;
  const groupedDisplay = thousandsSeparator ? groupIntegerDigits(value) : null;

  const setRefs = useCallback(
    (node) => {
      inputRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  useEffect(() => {
    setVoiceSupported(isVoiceInputSupported());
  }, []);

  const valueRef = useRef(value);
  valueRef.current = isControlled ? value : undefined;

  const applyVoiceValue = useCallback(
    (next) => {
      onChange?.({ target: { value: next } });
    },
    [onChange]
  );

  const getSessionValue = useCallback(() => {
    return isControlled
      ? (valueRef.current ?? '')
      : (inputRef.current?.value ?? '');
  }, [isControlled]);

  const {
    listening,
    transcribing,
    liveTranscript,
    errorKey,
    levelBands,
    toggle: toggleVoice,
    cancel: cancelVoice,
    micBusy,
    displayValue,
  } = useVoiceField({
    value: isControlled
      ? (thousandsSeparator ? groupedDisplay : (value ?? ''))
      : (inputRef.current?.value ?? defaultValue ?? ''),
    onValue: applyVoiceValue,
    lang: voiceLang,
    getSessionValue,
  });

  useEffect(() => {
    const el = inputRef.current;
    if (!el || !micBusy) return;
    el.scrollLeft = el.scrollWidth;
    scrollFieldIntoView(el);
  }, [displayValue, micBusy]);

  useLayoutEffect(() => {
    if (!thousandsSeparator || groupedCaretDigitsRef.current == null) return;
    const node = inputRef.current;
    if (!node) {
      groupedCaretDigitsRef.current = null;
      return;
    }
    const pos = caretIndexForDigitCount(node.value, groupedCaretDigitsRef.current);
    node.setSelectionRange(pos, pos);
    groupedCaretDigitsRef.current = null;
  }, [thousandsSeparator, displayValue]);

  const showVoice =
    voiceInput &&
    type !== 'password' &&
    type !== 'number' &&
    !thousandsSeparator &&
    voiceSupported &&
    typeof onChange === 'function';
  const showPasswordToggle = type === 'password';
  const isNumberField = type === 'number';

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Autofill detection
  useEffect(() => {
    const checkAutofill = () => {
      if (inputRef.current) {
        const computedStyle = window.getComputedStyle(inputRef.current);
        const backgroundColor = computedStyle.backgroundColor;
        const boxShadow = computedStyle.boxShadow;

        if (
          (backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') ||
          boxShadow !== 'none'
        ) {
          setHasAutofill(true);
        } else {
          setHasAutofill(false);
        }
      }
    };

    checkAutofill();
    const timer = setTimeout(checkAutofill, 100);

    return () => clearTimeout(timer);
  }, [value, isControlled]);

  const inputType = thousandsSeparator
    ? 'text'
    : type === 'password' && showPassword
      ? 'text'
      : type;
  const labelText = label || placeholder;
  const isLabelActive = true; // Always show label in active state
  const numberFieldMinWidth =
    isNumberField && labelText
      ? `${Math.max(labelText.length + 3, 6)}ch`
      : isNumberField
        ? '6ch'
        : undefined;

  return (
    <div
      className={`${styles.inputContainer} ${isNumberField ? styles.inputContainerNumber : ''} ${className}`.trim()}
      style={
        numberFieldMinWidth
          ? { '--number-field-min-width': numberFieldMinWidth }
          : undefined
      }
    >
      <div className={styles.inputWrapper}>
        <input
          ref={setRefs}
          {...props}
          type={inputType}
          placeholder={
            listening ? 'Listening…' : placeholder
          }
          inputMode={thousandsSeparator ? 'numeric' : props.inputMode}
          autoComplete={thousandsSeparator ? 'off' : props.autoComplete}
          {...(isControlled || micBusy ? { value: displayValue } : { defaultValue: defaultValue ?? '' })}
          onChange={(e) => {
            if (micBusy) return;
            if (thousandsSeparator) {
              const nextDigits = digitsOnly(e.target.value).slice(0, MAX_GROUPED_DIGITS);
              const digitsBeforeCaret = digitsOnly(
                e.target.value.slice(0, e.target.selectionStart ?? e.target.value.length),
              ).length;
              groupedCaretDigitsRef.current = Math.min(digitsBeforeCaret, nextDigits.length);
              onChange?.({ target: { value: nextDigits } });
              return;
            }
            onChange?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          required={false}
          aria-required={required || undefined}
          readOnly={Boolean(readOnly || listening)}
          disabled={Boolean(disabled || transcribing)}
          aria-busy={micBusy}
          className={`${styles.inputField} ${showVoice ? (showPasswordToggle ? styles.withTranscribeMicAndPassword : styles.withTranscribeMic) : ''} ${showVoice && micBusy ? styles.transcribeListeningPad : ''}`}
        />

        {showVoice && (
          <TranscribeMicButton
            compact
            listening={listening}
            transcribing={transcribing}
            errorKey={errorKey}
            levelBands={levelBands}
            onToggle={toggleVoice}
            onCancel={cancelVoice}
            positionClassName={showPasswordToggle ? styles.transcribeMicBeforePassword : styles.transcribeMicInput}
          />
        )}

        {showPasswordToggle && (
          <button
            type="button"
            className={`${styles.passwordToggle} ${showPassword ? styles.active : ''}`}
            onClick={togglePasswordVisibility}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            <IconProvider
              name={showPassword ? 'eyeOff' : 'eye'}
              size={20}
              color="currentColor"
              className={styles.passwordToggleIcon}
            />
          </button>
        )}
      </div>

      {labelText && (
        <label className={`${styles.floatingLabel} ${isLabelActive ? styles.active : ''}`}>
          {labelText}
          {required ? <span className={styles.requiredMark} aria-hidden="true">*</span> : null}
        </label>
      )}
      {showVoice ? (
        <VoiceFieldStatus
          listening={listening}
          transcribing={transcribing}
          liveTranscript={liveTranscript}
          className={styles.voiceStatus}
        />
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
