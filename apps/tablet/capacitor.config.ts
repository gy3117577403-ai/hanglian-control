import type { CapacitorConfig } from '@capacitor/cli'

const lanDebug = process.env.CAPACITOR_LAN_DEBUG === 'true'
const loggingBehavior = lanDebug ? 'debug' : 'none'
const remoteWebUrl = process.env.CAPACITOR_REMOTE_WEB_URL?.trim() ?? ''
const server = remoteWebUrl
  ? {
      url: remoteWebUrl,
      cleartext: false,
      errorPath: 'offline.html',
    }
  : {
      hostname: 'localhost',
      androidScheme: 'https',
    }

const config: CapacitorConfig = {
  appId: 'com.hanglian.control',
  appName: '线束资料工作台',
  webDir: 'dist',
  loggingBehavior,
  backgroundColor: '#fff7ed',
  server,
  android: {
    allowMixedContent: lanDebug,
    backgroundColor: '#fff7ed',
    loggingBehavior,
    webContentsDebuggingEnabled: lanDebug,
    zoomEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#fff7ed',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#fff7ed',
      overlaysWebView: false,
      style: 'LIGHT',
    },
  },
}

export default config
