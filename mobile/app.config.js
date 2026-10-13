const { existsSync } = require('node:fs')
const { homedir } = require('node:os')
const { join } = require('node:path')

// From the Firebase console, kept beside the signing key; without it the app
// falls back to background checks
const KEYS = process.env.TIMETABLER_KEYS ?? join(homedir(), '.timetabler-android')
const GOOGLE_SERVICES = join(KEYS, 'google-services.json')
const push = existsSync(GOOGLE_SERVICES)

module.exports = {
  expo: {
    name: 'RBS Timetable',
    slug: 'rbs-timetable',
    version: '1.2.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    backgroundColor: '#e0b090',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#e0b090',
    },
    android: {
      package: 'org.rajghatbesantschool.timetable',
      versionCode: 3,
      ...(push && { googleServicesFile: GOOGLE_SERVICES }),
      adaptiveIcon: {
        backgroundColor: '#e0b090',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    ios: {
      bundleIdentifier: 'org.rajghatbesantschool.timetable',
      supportsTablet: true,
    },
    plugins: [
      'expo-sharing',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#1a6b66',
          defaultChannel: 'staff-room',
        },
      ],
    ],
    extra: {
      siteUrl: 'https://timetabler-alpha.vercel.app',
      push,
    },
  },
}
