import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The API is reached through this proxy in development, so the browser sees one origin and the
// SameSite=Strict refresh cookie (Path=/api/auth) is sent as it will be in production. The proxy
// also drops the browser's Origin header: the backend only allows its configured CORS origins
// (default http://localhost:3000) and would answer 403 "Invalid CORS request" to any other dev
// port. In production the app and the API share one origin, so no CORS check applies there either.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
})
