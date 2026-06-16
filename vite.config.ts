import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(() => ({
  plugins: [vue()],
  // 本地开发与自定义域名（根路径）用 '/'；
  // 若部署在子路径下，通过 BASE_PATH 注入前缀（如 /GradeSieve/）。
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler' as const,
      },
    },
  },
}))
