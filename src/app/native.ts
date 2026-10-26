import { Capacitor } from '@capacitor/core'

// Inside the Android app (APK built with Capacitor, `npm run apk`) a few things work differently
// from the browser. Everything here is a no-op on the web.

/** True inside the APK. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform()

/**
 * The Android back button steps back inside the app but never closes it, so a visitor can't
 * leave the booth game by accident (the staff pin the screen for a full kiosk).
 */
export function setupNativeApp(): void {
  if (!isNativeApp()) return
  void import('@capacitor/app').then(({ App }) =>
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
    }),
  )
}

export type SaveResult = 'saved' | 'cancelled' | 'failed'

/**
 * The app's WebView can't download files, so a PNG is written to the app cache and handed to
 * Android's share sheet (save to Gallery / Files / Drive, or send to the club's social media team).
 */
export async function sharePng(base64: string, fileName: string): Promise<SaveResult> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ])
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    })
    await Share.share({ title: fileName, files: [uri], dialogTitle: 'Görseli kaydet ya da paylaş' })
    return 'saved'
  } catch (error) {
    return /cancel/i.test(String(error)) ? 'cancelled' : 'failed'
  }
}
