import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Forward /api requests to the Express backend during development.
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
