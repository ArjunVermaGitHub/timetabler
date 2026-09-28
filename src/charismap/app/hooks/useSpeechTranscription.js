// Stand-in for charismap's voice-input hooks: reports voice input as
// unsupported, so the copied Input never shows its mic button.
import { useCallback } from 'react'

export function isVoiceInputSupported() {
  return false
}

export function scrollFieldIntoView() {}

export function useVoiceField({ value } = {}) {
  const noop = useCallback(() => {}, [])
  return {
    listening: false,
    transcribing: false,
    liveTranscript: '',
    errorKey: null,
    levelBands: [],
    toggle: noop,
    cancel: noop,
    micBusy: false,
    displayValue: value ?? '',
  }
}
