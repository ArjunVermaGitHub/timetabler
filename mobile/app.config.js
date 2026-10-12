module.exports = {
  expo: {
    name: 'RBS Timetable',
    slug: 'rbs-timetable',
    version: '1.0.0',
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
      versionCode: 1,
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
    },
  },
}
