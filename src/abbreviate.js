import { createContext, useContext } from 'react'
import { SUBJECT_ABBR, TEACHER_ABBR } from './data/mockLessons'

export const AbbreviateContext = createContext(false)

/** Subject and teacher labels for cards, honouring the "Use abbreviations" toggle. */
export function useNames() {
  const abbreviate = useContext(AbbreviateContext)
  return {
    abbreviate,
    // Zero-width space after "/" lets "HIS/POL SCI" wrap there in narrow cells
    subject: (name) =>
      ((abbreviate && SUBJECT_ABBR.get(name)) || name).replaceAll('/', '/\u200b'),
    teacher: (name) => (abbreviate && TEACHER_ABBR.get(name)) || name,
  }
}
