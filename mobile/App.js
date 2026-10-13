import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { savePdf } from './src/files'
import {
  chatUser,
  initialPath,
  notifyMention,
  onNotificationTap,
  onPushTokenChange,
  setChatDevice,
  startNotifying,
} from './src/mentions'

const SITE = Constants.expoConfig.extra.siteUrl
const BANNER = '#1a6b66'

/** Tells the page it's inside the app before any of its scripts run. */
const bootScript = () =>
  `window.TimetablerApp = { platform: 'android', chatUser: ${JSON.stringify(chatUser())} }; true;`

const chatUserScript = (userId) =>
  `window.TimetablerApp && (window.TimetablerApp.chatUser = ${JSON.stringify(userId)}); true;`

/** In-app navigation through the site's own router (no reload). */
const navigateScript = (path) =>
  `window.history.pushState(null, '', ${JSON.stringify(path)});
   window.dispatchEvent(new PopStateEvent('popstate')); true;`

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  )
}

function Shell() {
  const web = useRef(null)
  const canGoBack = useRef(false)
  const [startPath] = useState(initialPath)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(
    () => onNotificationTap((path) => web.current?.injectJavaScript(navigateScript(path))),
    [],
  )

  useEffect(() => {
    startNotifying().catch(() => {})
    return onPushTokenChange()
  }, [])

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false
      web.current?.goBack()
      return true
    })
    return () => sub.remove()
  }, [])

  const onMessage = useCallback(async (event) => {
    let message
    try {
      message = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    if (message.type === 'pdf') await savePdf(message.fileName, message.base64)
    if (message.type === 'notify') await notifyMention(message.id, message.title, message.body)
    if (message.type === 'chat-device') {
      await setChatDevice(message.key, message.userId)
      web.current?.injectJavaScript(chatUserScript(message.key ? message.userId : null))
    }
  }, [])

  // Anything that isn't a web page (mail, phone, maps…) goes to the right app
  const onShouldStartLoadWithRequest = useCallback((request) => {
    if (/^https?:/i.test(request.url) || request.url === 'about:blank') return true
    Linking.openURL(request.url).catch(() => {})
    return false
  }, [])

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor={BANNER} />
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.title}>Can&apos;t reach the timetable</Text>
          <Text style={styles.body}>Check your internet connection and try again.</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setFailed(false)
              setAttempt((n) => n + 1)
            }}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={attempt}
          ref={web}
          source={{ uri: `${SITE}${startPath}` }}
          style={styles.web}
          injectedJavaScriptBeforeContentLoaded={bootScript()}
          onMessage={onMessage}
          onNavigationStateChange={(state) => {
            canGoBack.current = state.canGoBack
          }}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onError={() => setFailed(true)}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <ActivityIndicator size="large" color={BANNER} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BANNER },
  web: { flex: 1, backgroundColor: '#e0b090' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#e0b090',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#3b2418', marginBottom: 8 },
  body: { fontSize: 15, color: '#3b2418', textAlign: 'center', marginBottom: 20 },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#e2553d',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
