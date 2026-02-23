import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    host: '0.0.0.0',
    allowedHosts: ['admin.fablino.de'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/covers': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/audio-files': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
