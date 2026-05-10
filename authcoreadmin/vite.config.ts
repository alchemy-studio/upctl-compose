import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const Environments: Record<string, any> = {
  local: {
    main: 'http://admin.localhost:8088',
    host: 'admin.localhost:8088',
    wx_app: '',
    base: '/',
  },
  compose: {
    main: '',
    host: 'localhost:8088',
    wx_app: '',
    base: '/admin/',
  },
  moicen: {
    main: '',
    host: '',
    wx_app: '',
    base: '/',
  },
}

const mode = (process.env.mode || 'local') as keyof typeof Environments
const config = Environments[mode]

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: config.base,
  define: {
    UC_SERVER: JSON.stringify(config.main),
    HOST: JSON.stringify(config.host),
    WX_APP: JSON.stringify(config.wx_app),
  },
  server: {
    port: 8011,
    proxy: {
      '/api/v1/uc': { changeOrigin: true, target: config.main },
    },
  },
})
