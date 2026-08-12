import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    // `lib/supabaseClient.ts` aborta el arranque si faltan estas variables.
    // Los tests no tocan la red: solo necesitan que el modulo se pueda importar
    // para llegar a las funciones puras que viven en el mismo archivo.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/services/**', 'src/repositories/**'],
    },
  },
});
