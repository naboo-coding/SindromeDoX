import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api vai para o back em Flask, então o front e o back parecem o mesmo site
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
    },
  },
})
