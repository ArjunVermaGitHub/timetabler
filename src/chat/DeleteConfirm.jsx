import { useEffect, useRef, useState } from 'react'

function preview(message) {
  if (message.text?.trim()) return message.text.trim()
  const count = message.attachments?.length ?? 0
  return count === 1 ? 'An attachment' : `${count} attachments`
}

/** Asks before deleting, over the conversation only, showing what's about to go. */
export function DeleteConfirm({ pending, onClose }) {
  const [state, setState] = useState({ busy: false, error: null })
  const cancelRef = useRef(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const confirm = async () => {
    setState({ busy: true, error: null })
    try {
      await pending.remove()
      onClose()
    } catch (e) {
      setState({ busy: false, error: e?.message || "Couldn't delete the message" })
    }
  }

  return (
    <div className="chat-delete" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chat-delete-card" role="alertdialog" aria-modal="true" aria-labelledby="chat-delete-title">
        <h2 id="chat-delete-title">Delete this message?</h2>
        <blockquote className="chat-delete-preview">{preview(pending.message)}</blockquote>
        <p className="chat-delete-note">
          It will be removed for {pending.audience}. This can’t be undone.
        </p>
        {state.error ? (
          <p className="chat-delete-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="chat-delete-actions">
          <button type="button" className="chat-delete-cancel" ref={cancelRef} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="chat-delete-go" disabled={state.busy} onClick={confirm}>
            {state.busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
