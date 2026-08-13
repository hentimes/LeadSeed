import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `happy-dom` y no `node`: hace falta un DOM para poder probar hooks y
    // componentes con React Testing Library. Es mas ligero que jsdom y cubre
    // de sobra lo que este proyecto necesita.
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
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
      include: ['src/utils/**', 'src/services/**', 'src/repositories/**', 'src/platform/**'],
      exclude: ['**/*.test.ts', 'src/test/**'],

      // Umbral de trinquete, no objetivo.
      //
      // Se fija apenas por debajo de la cobertura real del momento (11.67% de
      // sentencias) para que **no pueda bajar**. No es una meta de calidad: es
      // que la cobertura solo se mueva hacia arriba.
      //
      // Poner aqui el 80% que recomienda la teoria dejaria el CI rojo desde el
      // primer dia, y un CI rojo permanente no se lee, se ignora. Vale mas un
      // umbral bajo que se respeta que uno alto que se desactiva.
      //
      // Al subir la cobertura, subir tambien estos numeros en el mismo commit.
      thresholds: {
        statements: 11,
        branches: 15,
        functions: 6,
        lines: 10,
      },
    },
  },
});
