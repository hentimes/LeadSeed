import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const appLabel = env.VITE_APP_LABEL || '';
  const extensionName = appLabel ? `LeadSeed (${appLabel})` : 'LeadSeed';
  const manifestWithLabel = { ...manifest, name: extensionName };

  return {
    plugins: [react(), crx({ manifest: manifestWithLabel })],
    base: './',
  build: {
    modulePreload: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@fortawesome')) return 'icons';
          if (id.includes('@emailjs')) return 'email';
          if (
            id.includes('/src/pages/admin/') ||
            id.includes('/src/components/admin/') ||
            id.includes('/src/services/adminService') ||
            id.includes('/src/repositories/adminRepository')
          ) return 'admin';
          if (
            id.includes('/src/components/support/') ||
            id.includes('/src/services/supportService') ||
            id.includes('/src/repositories/supportRepository')
          ) return 'support';
          if (
            id.includes('/src/components/send/') ||
            id.includes('/src/services/sendService') ||
            id.includes('/src/repositories/sendRepository')
          ) return 'send';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: /^chrome-extension:\/\/.+$/,
      credentials: true,
    },
    hmr: {
      port: 5173,
    },
  },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});
