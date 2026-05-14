import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const Environments: Record<string, any> = {
  dev: {
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
    host: 'admin.moicen.com',
    wx_app: '',
    base: '/authcoreadmin/',
  },
}

const mode = (process.env.mode || 'dev') as keyof typeof Environments
const modeConfig = Environments[mode] || {}

// Load env files (Vite auto-loads .env.{mode} when mode is set)
// For moicen deployment, create .env.moicen on the server with:
//   UC_SERVER=https://admin.moicen.com
//   HOST=admin.moicen.com
//   WX_APP=
//   VITE_BASE=/
const env = loadEnv(mode, process.cwd(), '')

const config = {
  main: env.UC_SERVER || modeConfig.main || '',
  host: env.HOST || modeConfig.host || 'localhost',
  wx_app: env.WX_APP || modeConfig.wx_app || '',
  base: env.VITE_BASE || modeConfig.base || '/',
}

export default defineConfig({
  plugins: [vue(), tailwindcss()],
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
