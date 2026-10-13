// Connect Stream chat to Firebase so the Android app gets real push notifications.
// Usage: node scripts/stream-push.mjs [service-account.json]
// The key comes from Firebase console → Project settings → Service accounts →
// Generate new private key. Keep it out of the repo (default: ~/.timetabler-android).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { StreamChat } from 'stream-chat'

process.loadEnvFile(new URL('../.env', import.meta.url))
const PROVIDER = 'timetabler-fcm'
const file = process.argv[2] ?? path.join(os.homedir(), '.timetabler-android', 'firebase-admin.json')
const credentials = fs.readFileSync(file, 'utf8')
const { project_id: project, client_email: account } = JSON.parse(credentials)
if (!project || !account) throw new Error(`${file} isn't a Firebase service account key`)

const server = StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET)

// Push providers with names (and the templates below) need Stream's v2 push
const { app } = await server.getAppSettings()
if ((app.push_config?.version ?? 'v1') === 'v1') {
  await server.updateAppSettings({ push_config: { version: 'v2' } })
}

await server.upsertPushProvider({
  name: PROVIDER,
  type: 'firebase',
  description: 'RBS Timetable Android app',
  firebase_credentials: credentials,
  // Staff-room pushes only arrive for @mentions (see api/chat/device.js)
  firebase_notification_template: JSON.stringify({
    title: "{{#equal channel.type 'team'}}{{ sender.name }} mentioned you{{else}}{{ sender.name }}{{/equal}}",
    body: '{{ truncate message.text 150 }}',
  }),
  firebase_data_template: JSON.stringify({
    sender: 'stream.chat',
    type: '{{ event_type }}',
    id: '{{ message.id }}',
    cid: '{{ channel.cid }}',
  }),
})

console.log(`Stream now pushes through Firebase project ${project} as "${PROVIDER}".`)
