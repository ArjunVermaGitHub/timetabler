import { isValidEmail, normalizeEmail, requireAdmin, requireUser } from './_lib/auth.js'
import { clean, getDb, nameKey, toId } from './_lib/db.js'
import { HttpError, handle, query, readJson } from './_lib/http.js'

function parseTeacher(body) {
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
  if (!name || name.length > 80) throw new HttpError(400, 'Teacher needs a name')
  const email = normalizeEmail(body.email)
  if (email && !isValidEmail(email)) throw new HttpError(400, 'Invalid email')
  return { name, nameKey: nameKey(name), email: email || null }
}

async function guardDuplicate(error) {
  if (error?.code === 11000) {
    throw new HttpError(409, 'A teacher with that name already exists')
  }
  throw error
}

export default handle({
  async GET(req) {
    await requireUser(req)
    const db = await getDb()
    const teachers = await db
      .collection('teachers')
      .find()
      .sort({ nameKey: 1 })
      .toArray()
    return { teachers: teachers.map(clean) }
  },

  async POST(req) {
    await requireAdmin(req)
    const doc = { ...parseTeacher(await readJson(req)), createdAt: new Date() }
    const db = await getDb()
    const { insertedId } = await db
      .collection('teachers')
      .insertOne(doc)
      .catch(guardDuplicate)
    return { teacher: clean({ _id: insertedId, ...doc }) }
  },

  async PATCH(req) {
    await requireAdmin(req)
    const _id = toId(query(req).id)
    const db = await getDb()
    const doc = await db
      .collection('teachers')
      .findOneAndUpdate(
        { _id },
        { $set: parseTeacher(await readJson(req)) },
        { returnDocument: 'after' },
      )
      .catch(guardDuplicate)
    if (!doc) throw new HttpError(404, 'Teacher not found')
    return { teacher: clean(doc) }
  },

  async DELETE(req) {
    await requireAdmin(req)
    const id = query(req).id
    const _id = toId(id)
    const db = await getDb()
    const used = await db
      .collection('links')
      .countDocuments({ 'members.teacherId': id })
    if (used > 0) {
      throw new HttpError(
        409,
        `Still teaching in ${used} link${used === 1 ? '' : 's'} — remove those first`,
      )
    }
    await db
      .collection('classes')
      .updateMany({ classTeacherId: id }, { $set: { classTeacherId: null } })
    await db.collection('teachers').deleteOne({ _id })
    return { ok: true }
  },
})
