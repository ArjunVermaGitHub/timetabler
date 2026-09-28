'use client';

import styles from './TranscribeMicButton.module.scss';

const ERR_HINT = {
  'not-allowed': 'Microphone permission denied. Allow access in the browser to use voice input.',
  'service-not-allowed': 'Speech service not allowed. Check browser settings or HTTPS.',
  network: 'Network error while using speech recognition.',
  'audio-capture': 'No microphone found or it could not be opened.',
  'start-failed': 'Could not start speech recognition.',
  'transcribe-failed': 'Could not transcribe that clip. Try again in a quieter spot.',
};

const DEFAULT_BANDS = [0, 0, 0, 0, 0, 0, 0, 0];

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M19 11a7 7 0 01-14 0M12 18v3M8 21h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VoiceFieldStatus({
  listening = false,
  transcribing = false,
  liveTranscript = '',
  className = '',
}) {
  if (!listening || transcribing) return null;
  return (
    <p className={`${styles.fieldStatus} ${className}`.trim()} aria-live="polite">
      Listening… pause when you’re done
    </p>
  );
}

export default function TranscribeMicButton({
  compact = false,
  listening = false,
  transcribing = false,
  errorKey = null,
  levelBands = DEFAULT_BANDS,
  onToggle,
  onCancel,
  disabled = false,
  className = '',
  positionClassName = '',
}) {
  const errHint = errorKey ? ERR_HINT[errorKey] || `Speech error: ${errorKey}` : '';
  const title = transcribing
    ? 'Transcribing…'
    : listening
      ? 'Listening. Pause when you’re done — no need to tap again.'
      : errHint || 'Voice to text. Tap once, speak, then pause.';

  const bands = levelBands?.length === 8 ? levelBands : DEFAULT_BANDS;
  const maxBar = 22;
  const canCancel = Boolean((listening || transcribing) && onCancel);

  const handleClick = () => {
    void onToggle?.();
  };

  const handleCancel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onCancel?.();
  };

  return (
    <div
      className={`${styles.root} ${compact ? styles.rootCompact : ''} ${listening ? styles.listening : ''} ${transcribing ? styles.transcribing : ''} ${errorKey ? styles.hasError : ''} ${className} ${positionClassName}`.trim()}
    >
      {canCancel && (
        <button
          type="button"
          className={styles.cancel}
          onClick={handleCancel}
          onMouseDown={(event) => event.preventDefault()}
          title="Cancel voice input and start over"
          aria-label="Cancel voice input and start over"
        >
          <CancelIcon />
        </button>
      )}
      {listening && (
        <div className={styles.waveform} aria-hidden>
          {bands.map((v, i) => (
            <span
              key={i}
              className={styles.waveBar}
              style={{ height: `${Math.max(2, v * maxBar)}px` }}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        className={styles.circle}
        onClick={handleClick}
        disabled={disabled || transcribing}
        title={title}
        aria-label={
          transcribing
            ? 'Transcribing'
            : listening
              ? 'Listening. Pause when you’re done'
              : 'Start voice input'
        }
        aria-pressed={listening}
        aria-busy={transcribing}
      >
        {listening && !transcribing && <span className={styles.recordingDot} aria-hidden />}
        {transcribing ? (
          <span className={styles.transcribingSpinner} aria-hidden />
        ) : (
          <MicIcon />
        )}
      </button>
    </div>
  );
}
