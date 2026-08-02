import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  base: './',
  build: {
    modulePreload: false,
    target: 'esnext',
    rollupOptions: {
      // offscreen.html se crea en runtime via chrome.offscreen, no se
      // declara en el manifest, asi que crxjs no lo detecta solo.
      input: {
        offscreen: 'offscreen.html',
      },
      output: {
        manualChunks(id) {
          // Solo se agrupan dependencias de node_modules. Antes habia
          // reglas por directorio de src/ que agrupaban modulos sin
          // relacion: supabaseClient terminaba en el mismo chunk que
          // componentes React, y por eso el service worker cargaba ~140 KB
          // de React que nunca ejecuta. Rollup calcula mejor los chunks
          // por punto de entrada cuando no se le fuerza el agrupamiento.
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@fortawesome')) return 'icons';
          if (id.includes('@emailjs')) return 'email';
          // Sin cajon de sastre 'vendor': agrupaba TODO node_modules, y
          // como alguna dependencia de ahi importa React, el service
          // worker terminaba arrastrandolo. Rollup divide mejor solo.
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    cors: {
      origin: /^chrome-extension:\/\/.+$/,
      credentials: true,
    },
    hmr: {
      port: 5174,
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
