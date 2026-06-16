import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  // GitHub Pages 项目页面部署在子路径 /GradeSieve/ 下，
  // 本地开发用 '/'，生产构建通过 BASE_PATH 注入正确前缀。
  base: process.env.BASE_PATH ?? (mode === 'production' ? '/GradeSieve/' : '/'),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
}))
