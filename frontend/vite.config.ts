import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // expone en red local
    port: 5173, // Por si acaso
    allowedHosts: ['ua.bastianproboste.work'], //ruta publica
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/utils/practiceProgress.ts', 'src/services/emailTemplates.ts'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 45,
        lines: 50,
      },
    },
    exclude: [...configDefaults.exclude, 'src/services/__tests__/brevoEmailService.manual.ts'],
  } as any,
} as any)
