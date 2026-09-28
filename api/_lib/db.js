import { MongoClient, ObjectId } from 'mongodb'
import { HttpError } from './http.js'

async function connect() {
  const client = await new MongoClient(process.env.MONGODB_URI).connect()
  const db = client.db(process.env.MONGODB_DB || 'timetabler')
  await Promise.all([
    db.collection('authTokens').createIndex({ hash: 1 }, { unique: true }),
    db.collection('authTokens').createIndex({ email: 1, purpose: 1 }),
    db
      .collection('authTokens')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db
      .collection('teachers')
      .createIndex({ nameKey: 1 }, { unique: true }),
    db.collection('classes').createIndex({ nameKey: 1 }, { unique: true }),
  ])
  return db
}

/** One pooled connection per server instance (survives dev hot reloads). */
export function getDb() {
  if (!process.env.MONGODB_URI) {
    return Promise.reject(new Error('MONGODB_URI is not set'))
  }
  globalThis.__timetablerDb ??= connect().catch((error) => {
    globalThis.__timetablerDb = null
    throw error
  })
  return globalThis.__timetablerDb
}

export function toId(value) {
  if (typeof value !== 'string' || !ObjectId.isValid(value)) {
    throw new HttpError(400, 'Invalid id')
  }
  return new ObjectId(value)
}

export function nameKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Mongo document → API shape (string `id`, no internals). */
export function clean(doc) {
  if (!doc) return doc
  const { _id, nameKey: _key, ...rest } = doc
  return { id: String(_id), ...rest }
}
