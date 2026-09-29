import { requireAdmin, requireUser } from './_lib/auth.js'
import { getDb } from './_lib/db.js'
import { HttpError, handle, readJson } from './_lib/http.js'

const DOC_ID = 'current'
const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
const MAX_PLACEMENTS = 5000

/** `{ lessonId: { day, slotId } }`; anything else is refused rather than stored. */
function cleanPlacements(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Invalid placements')
  }
  const entries = Object.entries(value)
  if (entries.length > MAX_PLACEMENTS) throw new HttpError(400, 'Too many placements')
  const out = {}
  for (const [id, spot] of entries) {
    if (
      id.length > 120 ||
      !DAYS.has(spot?.day) ||
      typeof spot.slotId !== 'string' ||
      spot.slotId.length > 40
    ) {
      throw new HttpError(400, 'Invalid placements')
    }
    out[id] = { day: spot.day, slotId: spot.slotId }
  }
  return out
}

function view(doc) {
  return {
    placements: doc?.placements ?? {},
    version: doc?.version ?? 0,
    updatedAt: doc?.updatedAt ?? null,
    updatedBy: doc?.updatedBy ?? null,
  }
}

export default handle({
  async GET(req) {
    await requireUser(req)
    const db = await getDb()
    return view(await db.collection('schedule').findOne({ _id: DOC_ID }))
  },

  /** Saves only on top of the version the admin loaded, so two admins can't silently overwrite each other. */
  async PUT(req) {
    const user = await requireAdmin(req)
    const body = await readJson(req)
    const placements = cleanPlacements(body.placements)
    const baseVersion = Number.isInteger(body.version) ? body.version : -1
    const schedule = (await getDb()).collection('schedule')
    try {
      const saved = await schedule.findOneAndUpdate(
        { _id: DOC_ID, version: baseVersion === 0 ? { $in: [0, null] } : baseVersion },
        {
          $set: { placements, updatedAt: new Date(), updatedBy: user.email },
          $inc: { version: 1 },
        },
        { upsert: baseVersion === 0, returnDocument: 'after' },
      )
      if (saved) return view(saved)
    } catch (error) {
      if (error?.code !== 11000) throw error
    }
    const latest = view(await schedule.findOne({ _id: DOC_ID }))
    throw new HttpError(
      409,
      `${latest.updatedBy ?? 'Another admin'} changed the timetable since you opened it`,
      { latest },
    )
  },
})
