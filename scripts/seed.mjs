// Load teachers, classes and links from src/data/rbsCatalog.json into MongoDB.
// Usage: node scripts/seed.mjs [--force]   (--force wipes existing data first)
import fs from 'node:fs'
import { MongoClient } from 'mongodb'

process.loadEnvFile(new URL('../.env', import.meta.url))
const catalog = JSON.parse(
  fs.readFileSync(new URL('../src/data/rbsCatalog.json', import.meta.url), 'utf8'),
)
const DAY_END = { Kopal: '12:30' }
const key = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ')

const client = await new MongoClient(process.env.MONGODB_URI).connect()
const db = client.db(process.env.MONGODB_DB || 'timetabler')
const force = process.argv.includes('--force')

try {
  const existing = await db.collection('links').countDocuments()
  if (existing > 0 && !force) {
    console.log(`Database already has ${existing} links; pass --force to replace.`)
    process.exit(1)
  }
  await Promise.all(
    ['teachers', 'classes', 'links'].map((c) => db.collection(c).deleteMany({})),
  )

  const now = new Date()
  const teacherNames = [
    ...new Set([...catalog.teachers, ...catalog.lessons.map((l) => l.teacher)]),
  ].sort((a, b) => a.localeCompare(b))
  const teacherIds = new Map()
  for (const name of teacherNames) {
    const { insertedId } = await db
      .collection('teachers')
      .insertOne({ name, nameKey: key(name), email: null, createdAt: now })
    teacherIds.set(name, String(insertedId))
  }

  const classIds = new Map()
  for (const [order, name] of catalog.classrooms.entries()) {
    const { insertedId } = await db.collection('classes').insertOne({
      name,
      nameKey: key(name),
      dayEnd: DAY_END[name] ?? null,
      classTeacherId: teacherIds.get(catalog.classTeachers[name]) ?? null,
      order,
      createdAt: now,
    })
    classIds.set(name, String(insertedId))
  }

  // Each catalog unit (sync group or lone lesson) becomes one block; identical
  // blocks collapse into one link that counts its singles and doubles.
  const units = new Map()
  for (const lesson of catalog.lessons) {
    const id = lesson.syncGroupId ?? lesson.id
    if (!units.has(id)) units.set(id, [])
    units.get(id).push(lesson)
  }
  const links = new Map()
  for (const unit of units.values()) {
    const members = unit.map((l) => ({
      classId: classIds.get(l.classroom),
      teacherId: teacherIds.get(l.teacher),
      subject: l.subject,
      timing: l.timing ?? null,
      stream: l.stream ?? null,
    }))
    const signature = JSON.stringify(
      members.map((m) => Object.values(m).join('|')).sort(),
    )
    if (!links.has(signature)) {
      links.set(signature, { members, singles: 0, doubles: 0 })
    }
    links.get(signature)[unit[0].span === 2 ? 'doubles' : 'singles'] += 1
  }
  await db.collection('links').insertMany(
    [...links.values()].map((link, order) => ({ ...link, order, createdAt: now })),
  )
  console.log(
    `Seeded ${teacherNames.length} teachers, ${classIds.size} classes, ${links.size} links (${units.size} blocks, ${catalog.lessons.length} lessons).`,
  )
} finally {
  await client.close()
}
