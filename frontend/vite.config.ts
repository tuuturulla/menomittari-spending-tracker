import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen inside the container; Compose exposes the port only on the host loopback address.
    host: '0.0.0.0',
    port: 5173,
    // Fail instead of silently selecting another port so the documented URL stays reliable.
    strictPort: true,
    watch: {
      // Polling makes live updates reliable through Docker Desktop bind mounts on Windows.
      usePolling: true,
      interval: 250,
    },
  },
})
