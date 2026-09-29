import { requireAdmin, requireUser } from './_lib/auth.js'
import { clean, getDb, toId } from './_lib/db.js'
import { HttpError, handle, query, readJson } from './_lib/http.js'

const TIMINGS = new Set(['pre-lunch', 'end-of-day'])

function count(value, label) {
  const n = Number(value ?? 0)
  if (!Number.isInteger(n) || n < 0 || n > 20) {
    throw new HttpError(400, `${label} must be a whole number from 0 to 20`)
  }
  return n
}

async function parseLink(db, body) {
  const members = Array.isArray(body.members) ? body.members : []
  if (members.length === 0 || members.length > 30) {
    throw new HttpError(400, 'A link needs at least one class, subject and teacher')
  }
  const parsed = members.map((m) => {
    const subject = String(m.subject ?? '').trim().replace(/\s+/g, ' ')
    if (!subject || subject.length > 60) {
      throw new HttpError(400, 'Every row needs a subject')
    }
    const timing = m.timing || null
    if (timing && !TIMINGS.has(timing)) throw new HttpError(400, 'Unknown timing')
    const stream = String(m.stream ?? '').trim() || null
    return {
      classId: String(m.classId ?? ''),
      teacherId: String(m.teacherId ?? ''),
      subject,
      timing,
      stream,
    }
  })

  const classIds = [...new Set(parsed.map((m) => m.classId))]
  const teacherIds = [...new Set(parsed.map((m) => m.teacherId))]
  const [classCount, teacherCount] = await Promise.all([
    db.collection('classes').countDocuments({ _id: { $in: classIds.map(toId) } }),
    db
      .collection('teachers')
      .countDocuments({ _id: { $in: teacherIds.map(toId) } }),
  ])
  if (classCount !== classIds.length) throw new HttpError(400, 'Unknown class')
  if (teacherCount !== teacherIds.length) {
    throw new HttpError(400, 'Unknown teacher')
  }

  const singles = count(body.singles, 'Single periods')
  const doubles = count(body.doubles, 'Double periods')
  if (singles + doubles === 0) {
    throw new HttpError(400, 'Add at least one single or double period')
  }
  return { members: parsed, singles, doubles }
}

export default handle({
  async GET(req) {
    await requireUser(req)
    const db = await getDb()
    const links = await db
      .collection('links')
      .find()
      .sort({ order: 1, _id: 1 })
      .toArray()
    return { links: links.map(clean) }
  },

  async POST(req) {
    await requireAdmin(req)
    const db = await getDb()
    const fields = await parseLink(db, await readJson(req))
    const [last] = await db
      .collection('links')
      .find()
      .sort({ order: -1 })
      .limit(1)
      .toArray()
    const doc = { ...fields, order: (last?.order ?? -1) + 1, createdAt: new Date() }
    const { insertedId } = await db.collection('links').insertOne(doc)
    return { link: clean({ _id: insertedId, ...doc }) }
  },

  async PATCH(req) {
    await requireAdmin(req)
    const _id = toId(query(req).id)
    const db = await getDb()
    const fields = await parseLink(db, await readJson(req))
    const doc = await db
      .collection('links')
      .findOneAndUpdate({ _id }, { $set: fields }, { returnDocument: 'after' })
    if (!doc) throw new HttpError(404, 'Link not found')
    return { link: clean(doc) }
  },

  async DELETE(req) {
    await requireAdmin(req)
    const _id = toId(query(req).id)
    const db = await getDb()
    await db.collection('links').deleteOne({ _id })
    return { ok: true }
  },
})
