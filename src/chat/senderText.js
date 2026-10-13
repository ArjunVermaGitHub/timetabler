import { Fragment, createElement } from 'react'
import { renderText } from 'stream-chat-react'
import { SenderName } from './MessageParts'

/** Stream's text rendering, with the sender's name leading the bubble. */
export const renderWithSender = (text, mentionedUsers, options) =>
  createElement(
    Fragment,
    null,
    createElement(SenderName, { text }),
    renderText(text, mentionedUsers, options),
  )
