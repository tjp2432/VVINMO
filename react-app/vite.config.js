import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Escucha en todas las interfaces para poder verla desde otra máquina
    // de la red local (http://<IP-de-esta-maquina>:5173).
    host: true,
    port: 5173,
    // Permite abrir el sitio por un tunel de Cloudflare (para mostrarlo
    // afuera sin publicar hosting). Solo para desarrollo.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Fotos de propiedades subidas desde el panel (server/uploads)
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    hmr: { overlay: false },
  },
  optimizeDeps: { include: ['react','react-dom','react-router-dom'] },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
  },

})
