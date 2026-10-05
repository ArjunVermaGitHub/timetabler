const SUBJECT_DEFAULTS = {
  accountancy: 'ACC',
  'applied maths': 'AM',
  'art education': 'ART',
  bharatnatyam: 'BN',
  biology: 'BIO',
  'business studies': 'BST',
  chemistry: 'CHEM',
  'computer lab': 'CLAB',
  'computer science': 'CS',
  craft: 'CRAFT',
  culture: 'CUL',
  dance: 'DANCE',
  economics: 'ECO',
  english: 'ENG',
  'environmental studies': 'EVS',
  'free play': 'FP',
  games: 'GAMES',
  geography: 'GEO',
  hindi: 'HIN',
  history: 'HIS',
  'information technology': 'IT',
  library: 'LIB',
  'life skills': 'LS',
  maths: 'MATH',
  music: 'MUS',
  painting: 'PAINT',
  'performing arts': 'PA',
  'physical education': 'PE',
  physics: 'PHY',
  'political science': 'POL SCI',
  'pol. sci': 'POL SCI',
  pottery: 'POT',
  psychology: 'PSY',
  'remedial english': 'REM ENG',
  'remedial maths': 'REM MATH',
  sanskrit: 'SAN',
  science: 'SCI',
  'social studies': 'SST',
  storytelling: 'STORY',
  tabla: 'TAB',
  'visual arts': 'VA',
  vocal: 'VOC',
}

const key = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ')

function subjectWord(word) {
  const known = SUBJECT_DEFAULTS[key(word)]
  if (known) return known
  // Already an acronym or code ("CTP", "LRC", "R-2")
  if (word === word.toUpperCase()) return word
  return word.replace(/\.$/, '').slice(0, 3).toUpperCase()
}

/** "Accountancy" → "ACC", "CTP/Culture" → "CTP/CUL", "LRC English" → "LRC ENG". */
export function defaultSubjectAbbr(subject) {
  return subject
    .split('/')
    .map((part) => {
      const known = SUBJECT_DEFAULTS[key(part)]
      if (known) return known
      return part.trim().split(/\s+/).map(subjectWord).join(' ')
    })
    .join('/')
}

/**
 * Teacher candidates from shortest to longest. "Anjali Bhagchandani" → AB,
 * ANB, ANJB…; single names start at three letters ("Komal" → KOM).
 */
function teacherCandidate(name, level) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 3 + level).toUpperCase()
  const [first, ...rest] = words
  return (first.slice(0, 1 + level) + rest.map((w) => w[0]).join('')).toUpperCase()
}

/**
 * Explicit abbreviations win. Auto ones that clash with each other all grow a
 * letter (so neither Pathak keeps the bare "AP"), and any that clash with an
 * explicit one grow until they're unique.
 */
export function resolveTeacherAbbreviations(teachers) {
  const result = new Map()
  const taken = new Set()
  for (const { name, abbr } of teachers) {
    if (abbr) {
      result.set(name, abbr)
      taken.add(abbr.toUpperCase())
    }
  }

  const levels = new Map(teachers.filter((t) => !t.abbr).map((t) => [t.name, 0]))
  for (let round = 0; round < 12; round += 1) {
    const byCandidate = new Map()
    for (const [name, level] of levels) {
      const candidate = teacherCandidate(name, level)
      byCandidate.set(candidate, [...(byCandidate.get(candidate) ?? []), name])
    }
    let clashed = false
    for (const [candidate, names] of byCandidate) {
      if (names.length > 1 || taken.has(candidate)) {
        clashed = true
        for (const name of names) levels.set(name, levels.get(name) + 1)
      }
    }
    if (!clashed) break
  }

  const counts = new Map()
  for (const [name, level] of levels) {
    let abbr = teacherCandidate(name, level)
    // Names too short to grow further fall back to a number
    const seen = counts.get(abbr) ?? 0
    counts.set(abbr, seen + 1)
    if (seen > 0 || taken.has(abbr)) abbr = `${abbr}${seen + 1}`
    result.set(name, abbr)
  }
  return result
}

/** `explicit` maps subject name → abbreviation, matched case-insensitively. */
export function resolveSubjectAbbreviations(subjects, explicit = {}) {
  const byKey = new Map(Object.entries(explicit).map(([name, abbr]) => [key(name), abbr]))
  const result = new Map()
  const counts = new Map()
  for (const subject of subjects) {
    const own = byKey.get(key(subject))
    const abbr = own || defaultSubjectAbbr(subject)
    const seen = counts.get(abbr) ?? 0
    counts.set(abbr, seen + 1)
    result.set(subject, seen > 0 && !own ? `${abbr}${seen + 1}` : abbr)
  }
  return result
}
