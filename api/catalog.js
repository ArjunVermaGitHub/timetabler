import { requireUser } from './_lib/auth.js'
import { loadCatalog } from './_lib/catalog.js'
import { getDb } from './_lib/db.js'
import { handle } from './_lib/http.js'

export default handle({
  async GET(req) {
    requireUser(req)
    return loadCatalog(await getDb())
  },
})
