import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://mortgage-project-ivory.vercel.app/',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react-window'],
  },
})
