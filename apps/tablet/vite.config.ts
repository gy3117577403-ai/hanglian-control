import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
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
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
