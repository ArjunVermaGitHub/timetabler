import { requireAdmin, requireUser } from './_lib/auth.js'
import { clean, getDb, nameKey, toId } from './_lib/db.js'
import { HttpError, handle, query, readJson } from './_lib/http.js'

async function parseClass(db, body) {
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
  if (!name || name.length > 30) throw new HttpError(400, 'Class needs a name')
  const dayEnd = body.dayEnd ? String(body.dayEnd) : null
  if (dayEnd && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dayEnd)) {
    throw new HttpError(400, 'Day end must look like 12:30')
  }
  const classTeacherId = body.classTeacherId ? String(body.classTeacherId) : null
  if (
    classTeacherId &&
    !(await db.collection('teachers').findOne({ _id: toId(classTeacherId) }))
  ) {
    throw new HttpError(400, 'Class teacher not found')
  }
  return { name, nameKey: nameKey(name), dayEnd, classTeacherId }
}

async function guardDuplicate(error) {
  if (error?.code === 11000) {
    throw new HttpError(409, 'A class with that name already exists')
  }
  throw error
}

export default handle({
  async GET(req) {
    requireUser(req)
    const db = await getDb()
    const classes = await db
      .collection('classes')
      .find()
      .sort({ order: 1 })
      .toArray()
    return { classes: classes.map(clean) }
  },

  async POST(req) {
    requireAdmin(req)
    const db = await getDb()
    const fields = await parseClass(db, await readJson(req))
    const [last] = await db
      .collection('classes')
      .find()
      .sort({ order: -1 })
      .limit(1)
      .toArray()
    const doc = { ...fields, order: (last?.order ?? -1) + 1, createdAt: new Date() }
    const { insertedId } = await db
      .collection('classes')
      .insertOne(doc)
      .catch(guardDuplicate)
    return { class: clean({ _id: insertedId, ...doc }) }
  },

  async PATCH(req) {
    requireAdmin(req)
    const _id = toId(query(req).id)
    const db = await getDb()
    const fields = await parseClass(db, await readJson(req))
    const doc = await db
      .collection('classes')
      .findOneAndUpdate({ _id }, { $set: fields }, { returnDocument: 'after' })
      .catch(guardDuplicate)
    if (!doc) throw new HttpError(404, 'Class not found')
    return { class: clean(doc) }
  },

  async DELETE(req) {
    requireAdmin(req)
    const id = query(req).id
    const _id = toId(id)
    const db = await getDb()
    const used = await db
      .collection('links')
      .countDocuments({ 'members.classId': id })
    if (used > 0) {
      throw new HttpError(
        409,
        `Still used by ${used} link${used === 1 ? '' : 's'} — remove those first`,
      )
    }
    await db.collection('classes').deleteOne({ _id })
    return { ok: true }
  },
})
