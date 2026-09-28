/**
 * Expand stored links into the lesson list the timetable schedules.
 * A link is one teaching block: members taught together (parallel electives
 * or a joint class), repeated `singles` times as one period and `doubles`
 * times as two back-to-back periods.
 */
export function buildLessons(classes, teachers, links) {
  const classById = new Map(classes.map((c) => [String(c._id), c]))
  const teacherById = new Map(teachers.map((t) => [String(t._id), t.name]))
  const lessons = []

  for (const link of links) {
    const members = link.members.filter(
      (m) => classById.has(m.classId) && teacherById.has(m.teacherId),
    )
    if (members.length === 0) continue
    const joint = [...new Set(members.map((m) => m.classId))]
      .map((id) => classById.get(id))
      .sort((a, b) => a.order - b.order)
      .map((c) => c.name)
    const blocks = [
      ...Array.from({ length: link.singles }, (_, n) => [1, `s${n}`]),
      ...Array.from({ length: link.doubles }, (_, n) => [2, `d${n}`]),
    ]
    blocks.forEach(([span, tag]) => {
      const unitId = `${link._id}-${tag}`
      members.forEach((m, i) => {
        lessons.push({
          id: `${unitId}-${i}`,
          classroom: classById.get(m.classId).name,
          subject: m.subject,
          teacher: teacherById.get(m.teacherId),
          span,
          syncGroupId: members.length > 1 ? unitId : null,
          stream: m.stream ?? null,
          ...(joint.length > 1 ? { jointClasses: joint } : {}),
          ...(m.timing ? { timing: m.timing } : {}),
        })
      })
    })
  }
  return lessons
}

export async function loadCatalog(db) {
  const [classes, teachers, links] = await Promise.all([
    db.collection('classes').find().sort({ order: 1 }).toArray(),
    db.collection('teachers').find().sort({ nameKey: 1 }).toArray(),
    db.collection('links').find().sort({ order: 1, _id: 1 }).toArray(),
  ])
  const teacherName = new Map(teachers.map((t) => [String(t._id), t.name]))
  return {
    classrooms: classes.map((c) => ({
      name: c.name,
      dayEnd: c.dayEnd ?? null,
      classTeacher: teacherName.get(c.classTeacherId) ?? null,
    })),
    teachers: teachers.map((t) => t.name),
    lessons: buildLessons(classes, teachers, links),
  }
}
