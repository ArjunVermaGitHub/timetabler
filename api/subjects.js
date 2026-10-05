import { requireAdmin, requireUser } from './_lib/auth.js'
import { getDb, nameKey } from './_lib/db.js'
import { HttpError, handle, readJson } from './_lib/http.js'

/**
 * Subjects are free text on links; this collection only stores the optional
 * abbreviation for each name, so renaming a subject on its links simply drops
 * back to the automatic one.
 */
export default handle({
  async GET(req) {
    await requireUser(req)
    const db = await getDb()
    const [links, stored] = await Promise.all([
      db.collection('links').find({}, { projection: { members: 1 } }).toArray(),
      db.collection('subjects').find().toArray(),
    ])
    const abbrByKey = new Map(stored.map((s) => [s.nameKey, s.abbr]))
    const linkCount = new Map()
    for (const link of links) {
      for (const subject of new Set(link.members.map((m) => m.subject))) {
        linkCount.set(subject, (linkCount.get(subject) ?? 0) + 1)
      }
    }
    const subjects = [...linkCount]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, links]) => ({
        id: nameKey(name),
        name,
        links,
        abbr: abbrByKey.get(nameKey(name)) ?? null,
      }))
    return { subjects }
  },

  async PUT(req) {
    await requireAdmin(req)
    const body = await readJson(req)
    const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
    if (!name || name.length > 60) throw new HttpError(400, 'Subject needs a name')
    const abbr = String(body.abbr ?? '').trim().replace(/\s+/g, ' ')
    if (abbr.length > 12) {
      throw new HttpError(400, 'Abbreviation can be at most 12 characters')
    }
    const db = await getDb()
    const subjects = db.collection('subjects')
    if (abbr) {
      await subjects.updateOne(
        { nameKey: nameKey(name) },
        { $set: { name, abbr, updatedAt: new Date() } },
        { upsert: true },
      )
    } else {
      await subjects.deleteOne({ nameKey: nameKey(name) })
    }
    return { subject: { id: nameKey(name), name, abbr: abbr || null } }
  },
})
