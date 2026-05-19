import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || '3000', 10)
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '3001', 10)

export default defineConfig({
  plugins: [react()],
  server: {
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${BACKEND_PORT}`
    }
  }
})
