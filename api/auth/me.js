import { allowedDomain, currentUser } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { handle } from '../_lib/http.js'

export default handle({
  async GET(req) {
    const user = await currentUser(req)
    if (user && !user.allowed) {
      return { user: null, blocked: { email: user.email, domain: allowedDomain() } }
    }
    if (!user) return { user: null }
    const db = await getDb()
    const teacher = await db.collection('teachers').findOne(
      { email: user.email },
      { projection: { name: 1 } },
    )
    const chat = Boolean(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET)
    return {
      user: { email: user.email, admin: user.admin, teacher: teacher?.name ?? null, chat },
    }
  },
})
