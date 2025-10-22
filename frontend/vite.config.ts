import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // expone en red local
    port: 5173, // Por si acaso
    allowedHosts: ['ua.bastianproboste.work'], //ruta publica
  },
  plugins: [react()],
})
