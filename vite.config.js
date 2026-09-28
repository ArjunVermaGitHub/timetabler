import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/** Resolve /api/a/b to api/a/b.js, falling back to a dynamic api/a/[param].js. */
function resolveApiFile(root, pathname) {
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  if (parts.length === 0 || parts.some((p) => p.startsWith('_') || p === '..')) {
    return null
  }
  const exact = path.join(root, 'api', ...parts) + '.js'
  if (fs.existsSync(exact)) return exact
  const dir = path.join(root, 'api', ...parts.slice(0, -1))
  if (!fs.existsSync(dir)) return null
  const dynamic = fs
    .readdirSync(dir)
    .find((name) => /^\[[^\]]+\]\.js$/.test(name))
  return dynamic ? path.join(dir, dynamic) : null
}

/** Serve the Vercel-style `api/` functions from the dev server. */
function apiRoutes() {
  return {
    name: 'timetabler-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const [key, value] of Object.entries(env)) {
        process.env[key] ??= value
      }
      server.middlewares.use(async (req, res, next) => {
        const { pathname } = new URL(req.url, 'http://local')
        if (!pathname.startsWith('/api/')) return next()
        const file = resolveApiFile(server.config.root, pathname)
        if (!file) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: 'Not found' }))
        }
        try {
          const mod = await server.ssrLoadModule(file)
          await mod.default(req, res)
        } catch (error) {
          console.error(error)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Server error' }))
          }
        }
      })
    },
  }
}

/** Redirect imports of copied charismap files that can't load outside Next.js. */
function charismapShims() {
  const shims = {
    'app/components/TablePage/TableFilter/TableFilter': 'shims/TableFilter.jsx',
  }
  const root = path.resolve(import.meta.dirname, 'src/charismap')
  return {
    name: 'charismap-shims',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null
      const target = path
        .relative(root, path.resolve(path.dirname(importer), source))
        .replace(/\.jsx?$/, '')
      return shims[target] ? path.join(root, shims[target]) : null
    },
  }
}

export default defineConfig({
  plugins: [react(), apiRoutes(), charismapShims()],
  resolve: {
    // Mirrors charismap's `@/` root so its copied components import unchanged
    alias: { '@': path.resolve(import.meta.dirname, 'src/charismap') },
  },
})
