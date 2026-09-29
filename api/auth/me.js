import { allowedDomain, currentUser } from '../_lib/auth.js'
import { handle } from '../_lib/http.js'

export default handle({
  async GET(req) {
    const user = await currentUser(req)
    if (user && !user.allowed) {
      return { user: null, blocked: { email: user.email, domain: allowedDomain() } }
    }
    return { user: user && { email: user.email, admin: user.admin } }
  },
})
