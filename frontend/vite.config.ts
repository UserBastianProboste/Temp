import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // permite exponer en red local
    port: 5173, // opcional, puedes cambiarlo si quieres otro puerto
    allowedHosts: ['ua.bastianproboste.work'],
  },
  plugins: [react()],
})
