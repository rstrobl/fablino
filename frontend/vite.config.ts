import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from outside container
    port: 5173,
    watch: {
      usePolling: true // Better file watching in Docker
    },
    proxy: {
      '/api': process.env.NODE_ENV === 'development' && process.env.DOCKER_ENV 
        ? 'http://backend:3001' // Use Docker service name when in Docker
        : 'http://localhost:3001' // Use localhost for local development
    }
  }
})
