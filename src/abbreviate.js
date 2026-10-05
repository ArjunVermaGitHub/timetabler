import { createContext, useContext } from 'react'
import { SUBJECT_ABBR, TEACHER_ABBR } from './data/mockLessons'

export const AbbreviateContext = createContext(false)

/** Subject and teacher labels for cards, honouring the "Use abbreviations" toggle. */
export function useNames() {
  const abbreviate = useContext(AbbreviateContext)
  return {
    abbreviate,
    subject: (name) => (abbreviate && SUBJECT_ABBR.get(name)) || name,
    teacher: (name) => (abbreviate && TEACHER_ABBR.get(name)) || name,
  }
}
