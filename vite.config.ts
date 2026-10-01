import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The API is reached through this proxy in development, so the browser sees one origin: no CORS,
// and the SameSite=Strict refresh cookie (Path=/api/auth) is sent as it will be in production.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'node',
  },
})
