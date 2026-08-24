import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'motion/react': path.resolve(__dirname, 'src/motion-shim.tsx'),
    },
  },
  server: {
    port: 5173,
  },
})
