import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 生产构建产物输出到 dist/，由 nginx 托管
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
