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
      '/stories': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,
      },
      '/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/covers': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/audio': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,
      },
      '/audio-files': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/voices': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,
      },
      '/generate': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,
      },
      '/plays': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,
      },
      '/waitlist': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,
      },
    },
  },
})
