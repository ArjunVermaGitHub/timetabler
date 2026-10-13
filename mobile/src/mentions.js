import * as BackgroundTask from 'expo-background-task'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import * as TaskManager from 'expo-task-manager'

const SITE = Constants.expoConfig.extra.siteUrl
const CHAT_PATH = '/chat'
const CHANNEL = 'staff-room'
const TASK = 'staff-room-mentions'
const KEY = 'chat-device-key'
const USER = 'chat-device-user'
const SEEN = 'chat-seen-mentions'

const PUSH = Constants.expoConfig.extra.push

// Only reached while the app is open, where the page already announces new messages itself
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.trigger?.type !== 'push'
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
    }
  },
})

// Android wakes the app now and then (15 minutes at the soonest) to run this
TaskManager.defineTask(TASK, async () => {
  try {
    await checkMentions()
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

/** Opening the app from a chat notification lands in the staff room. */
export function initialPath() {
  return Notifications.getLastNotificationResponse() ? CHAT_PATH : ''
}

export function onNotificationTap(go) {
  const sub = Notifications.addNotificationResponseReceivedListener(() => go(CHAT_PATH))
  return () => sub.remove()
}

/** The chat user this phone checks mentions for, so the site knows not to sign it in again. */
export function chatUser() {
  return SecureStore.getItem(USER)
}

/** Shows a mention once, whether the open page or the background check saw it first. */
export async function notifyMention(id, title, body) {
  const seen = JSON.parse((await SecureStore.getItemAsync(SEEN)) ?? '[]')
  if (seen.includes(id)) return
  await SecureStore.setItemAsync(SEEN, JSON.stringify([id, ...seen].slice(0, 50)))
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { channelId: CHANNEL },
  })
}

async function checkMentions() {
  const key = await SecureStore.getItemAsync(KEY)
  if (!key) return
  const response = await fetch(`${SITE}/api/chat/device`, {
    headers: { Authorization: `Device ${key}` },
  })
  if (response.status === 401) return forget()
  if (!response.ok) throw new Error(`Mention check failed (${response.status})`)
  const { mentions } = await response.json()
  for (const mention of mentions) {
    await notifyMention(
      mention.id,
      mention.title ?? `${mention.from} mentioned you`,
      mention.text.slice(0, 160),
    )
  }
}

async function allowNotifications() {
  // Android 13+ only asks for permission once a channel exists
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Staff room',
    importance: Notifications.AndroidImportance.HIGH,
  })
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') await Notifications.requestPermissionsAsync()
}

/** The site signed in to chat (a fresh key) or out (null). */
export async function setChatDevice(key, userId) {
  const old = await SecureStore.getItemAsync(KEY)
  if (old && old !== key) {
    fetch(`${SITE}/api/chat/device`, {
      method: 'DELETE',
      headers: { Authorization: `Device ${old}`, 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {})
  }
  if (!key) return forget()
  await SecureStore.setItemAsync(KEY, key)
  await SecureStore.setItemAsync(USER, userId)
  await allowNotifications()
  await startNotifying()
}

/** Push when Firebase is set up and reachable, otherwise the slow background checks. */
export async function startNotifying() {
  if (!(await SecureStore.getItemAsync(KEY))) return
  const token = PUSH ? await Notifications.getDevicePushTokenAsync().catch(() => null) : null
  const pushed = await registerPush(token?.data)
  // Polling alongside push would show every message twice
  if (pushed) await stopChecks()
  else await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 })
}

/** Hands this phone's Firebase token to the site so Stream can push to it. */
async function registerPush(token) {
  const key = await SecureStore.getItemAsync(KEY)
  if (!PUSH || !key || !token) return false
  try {
    const response = await fetch(`${SITE}/api/chat/device`, {
      method: 'PUT',
      headers: { Authorization: `Device ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken: token }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Firebase rotates tokens now and then; keep the site's copy current. */
export function onPushTokenChange() {
  const sub = Notifications.addPushTokenListener(({ data }) => registerPush(data))
  return () => sub.remove()
}

async function stopChecks() {
  if (await TaskManager.isTaskRegisteredAsync(TASK)) {
    await BackgroundTask.unregisterTaskAsync(TASK)
  }
}

async function forget() {
  await SecureStore.deleteItemAsync(KEY)
  await SecureStore.deleteItemAsync(USER)
  await stopChecks()
}
