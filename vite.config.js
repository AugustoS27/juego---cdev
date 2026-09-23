import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Three.js ocupa ~600 KB: es normal, así que subimos el límite del aviso de tamaño
    chunkSizeWarningLimit: 1000,
  },
});
