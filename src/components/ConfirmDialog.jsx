import { useRef, useState } from 'react'
import Button from '@/app/components/Button'
import Modal from '@/app/components/Modal'
import '@/app/styles/_modal.scss'

/**
 * Confirmation on charismap's Modal. `request` is null (closed) or
 * `{ title, message, confirmLabel, onConfirm }`; leave out `onConfirm` for a
 * notice with only a Close button. The dialog closes once `onConfirm` settles.
 */
export function ConfirmDialog({ request, onClose }) {
  const [busy, setBusy] = useState(false)
  // Keep the last request so the content doesn't vanish during the fade-out
  const shown = useRef(request)
  if (request) shown.current = request
  const { title, message, confirmLabel = 'Delete', onConfirm } = shown.current ?? {}

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={Boolean(request)}
      onClose={onClose}
      title={title}
      maxWidth="440px"
      preventClose={busy}
    >
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {onConfirm ? 'Cancel' : 'Close'}
        </Button>
        {onConfirm ? (
          <Button variant="danger" onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        ) : null}
      </div>
    </Modal>
  )
}
