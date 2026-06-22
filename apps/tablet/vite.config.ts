import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

const androidViewportContent = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
const androidBuildModes = new Set(['android', 'android-staging'])

function readSimpleEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {}
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]
      }),
  )
}

function loadAndroidStagingEnv(mode: string) {
  if (mode !== 'android-staging') return {}
  const viteEnv = loadEnv(mode, __dirname, 'VITE_')
  const exampleEnv = readSimpleEnvFile(path.resolve(__dirname, '.env.android.staging.example'))
  const localEnv = readSimpleEnvFile(path.resolve(__dirname, '.env.android.staging.local'))
  return { ...exampleEnv, ...viteEnv, ...localEnv }
}

function androidViewportPlugin(enabled: boolean) {
  return {
    name: 'hanglian-android-viewport-lock',
    transformIndexHtml(html: string) {
      if (!enabled) return html
      const withoutViewport = html.replace(/\s*<meta\s+name=["']viewport["'][^>]*>\s*/gi, '\n')
      const viewport = `    <meta name="viewport" content="${androidViewportContent}" />`
      if (/<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(withoutViewport)) {
        return withoutViewport.replace(/(<meta\s+charset=["']UTF-8["']\s*\/?>)/i, `$1\n${viewport}`)
      }
      return withoutViewport.replace(/<head>/i, `<head>\n${viewport}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const nativeAndroidBuild = androidBuildModes.has(mode)
  const androidStagingBuild = mode === 'android-staging'
  const androidStagingEnv = loadAndroidStagingEnv(mode)

  if (androidStagingBuild) {
    for (const [key, value] of Object.entries(androidStagingEnv)) {
      if (key.startsWith('VITE_')) process.env[key] = value
    }
  }

  return {
  plugins: [
    androidViewportPlugin(nativeAndroidBuild),
    vue(),
    tailwindcss(),
    !nativeAndroidBuild && VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: '线束车间资料管控',
        short_name: '线束管控',
        description: '面向线束车间前段/后段组长的生产计划资料管控平板端',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: '#d97706',
        background_color: '#fff7ed',
        start_url: '/tablet',
        scope: '/',
        icons: [
          { src: '/pwa/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa/maskable-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: '查看生产计划',
            short_name: '生产计划',
            description: '打开平板生产计划视图',
            url: '/tablet?shortcut=plan',
            icons: [{ src: '/pwa/shortcut-plan.svg', sizes: '96x96', type: 'image/svg+xml' }],
          },
          {
            name: '上传演示资料',
            short_name: '上传资料',
            description: '进入资料上传演示流程',
            url: '/tablet?shortcut=upload',
            icons: [{ src: '/pwa/shortcut-upload.svg', sizes: '96x96', type: 'image/svg+xml' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // API 和 /api/files 文件流不做离线缓存，避免现场看到过期资料。
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (!normalizedId.includes('node_modules')) return undefined
          if (
            normalizedId.includes('/vue/')
            || normalizedId.includes('/@vue/')
            || normalizedId.includes('/pinia/')
            || normalizedId.includes('/vue-router/')
          ) {
            return 'vendor-vue'
          }
          if (normalizedId.includes('/lucide-vue-next/')) return 'vendor-icons'
          if (normalizedId.includes('/echarts/') || normalizedId.includes('/vue-echarts/')) return 'vendor-charts'
          if (
            normalizedId.includes('/pdfjs-dist/')
            || normalizedId.includes('/vue-pdf-embed/')
            || normalizedId.includes('/viewerjs/')
          ) {
            return 'vendor-preview'
          }
          if (normalizedId.includes('/ofetch/') || normalizedId.includes('/@vueuse/') || normalizedId.includes('/fuse.js/')) {
            return 'vendor-utils'
          }
          return undefined
        },
      },
    },
  },
  define: androidStagingBuild ? {
    'import.meta.env.VITE_NATIVE_API_BASE_URL': JSON.stringify(process.env.VITE_NATIVE_API_BASE_URL ?? ''),
    'import.meta.env.VITE_NATIVE_API_ENV': JSON.stringify(process.env.VITE_NATIVE_API_ENV ?? ''),
    __HANGLIAN_ANDROID_STAGING_API_BASE_URL__: JSON.stringify(process.env.VITE_NATIVE_API_BASE_URL ?? ''),
  } : undefined,
  }
})
