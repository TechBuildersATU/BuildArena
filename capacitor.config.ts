import type { CapacitorConfig } from '@capacitor/cli'

// Android app (APK) around the same web build: `npm run apk` (scripts/build-apk.mjs).
const config: CapacitorConfig = {
  appId: 'com.atutechbuilders.buildarena',
  appName: 'BuildArena',
  webDir: 'dist',
  android: {
    // the booth tablet has no internet: nothing is loaded from outside the app
    allowMixedContent: false,
    backgroundColor: '#FFF4E6',
  },
  plugins: {
    // MainActivity hides the system bars and handles the keyboard itself (it opens over the
    // game; the stage keeps its size), so Capacitor's inset padding is switched off
    SystemBars: { insetsHandling: 'disable' },
  },
}

export default config
