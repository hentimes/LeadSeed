import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

const RAIZ_ENV = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Un build sin credenciales COMPILA y produce un artefacto roto.
 *
 * `supabaseClient.ts` lanza al cargar el modulo si faltan, asi que la extension
 * se instala, abre el panel y se queda en blanco. Ni `tsc`, ni el lint, ni los
 * tests lo detectan: `vitest.config.ts` inyecta esas variables por su cuenta,
 * de modo que la bateria entera puede estar verde con la aplicacion muerta.
 *
 * Fallar aqui convierte ese silencio en un error de build con nombre.
 */
function exigirCredenciales(mode: string): void {
  const env = loadEnv(mode, RAIZ_ENV, 'VITE_');
  const faltan = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k]);

  if (faltan.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${faltan.join(', ')}.
` +
        `Se buscan en ${RAIZ_ENV} (la raiz del monorepo, no la carpeta de la app).
` +
        `Copia .env.example a .env.local y completalo.`,
    );
  }
}

export default defineConfig(({ mode }) => {
  exigirCredenciales(mode);

  return {
  plugins: [react(), crx({ manifest })],
  base: './',
  /*
   * Los `.env` viven en la RAIZ del monorepo, no aqui.
   *
   * Vite los busca por defecto junto a este archivo, y al mover la app a
   * `apps/extension/` dejo de encontrarlos: el build salio sin
   * `VITE_SUPABASE_URL` ni `VITE_SUPABASE_ANON_KEY`, `supabaseClient` lanzo
   * "Missing Supabase environment variables" al cargar el modulo, y el panel
   * quedo en blanco. Compilaba y pasaba los tests igual, porque
   * `vitest.config.ts` inyecta esas variables por su cuenta.
   *
   * Se apunta a la raiz en vez de duplicar el archivo aqui: las credenciales de
   * Supabase son las mismas para la extension y para la app movil, y dos copias
   * de un secreto son dos sitios donde puede quedar desactualizado.
   */
  envDir: RAIZ_ENV,
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
  };
});
