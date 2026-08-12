import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Configuracion de ESLint de LeadSeed.
 *
 * El objetivo de este archivo NO es estilo. Es hacer ejecutable el contrato de
 * fronteras que hoy se sostiene a mano y que la auditoria CONTROL del
 * 2026-08-11 encontro roto en varios puntos.
 *
 * Las reglas de frontera son el contrato de portabilidad a movil escrito en
 * forma verificable: si la capa de dominio no puede tocar el DOM ni las APIs de
 * Chrome, el dia del port a Expo esa capa ya esta limpia por construccion.
 *
 * Politica de deuda existente (ratchet): las violaciones que ya existian quedan
 * marcadas una por una con eslint-disable y su motivo, apuntando al capitulo
 * del roadmap donde se corrigen. Asi el CI queda verde, la deuda queda contable
 * con un grep, y ningun codigo nuevo puede agregar una violacion mas.
 * No se corrigieron en el mismo paso a proposito: tocar useRealtimeRefresh
 * arrastra useLeads, useLists y useTemplates, y la restriccion de no regresion
 * del capitulo 13.1.c tiene precedencia.
 */

/** Baja a `warn` cualquier regla que el preset traiga como `error`. */
function downgradeToWarn(rules) {
  return Object.fromEntries(
    Object.entries(rules ?? {}).map(([rule, level]) => {
      const options = Array.isArray(level) ? level.slice(1) : [];
      return [rule, options.length ? ['warn', ...options] : 'warn'];
    }),
  );
}

const DOMAIN_LAYERS = [
  'src/services/**/*.{ts,tsx}',
  'src/repositories/**/*.{ts,tsx}',
  'src/hooks/**/*.{ts,tsx}',
  'src/utils/**/*.{ts,tsx}',
  'src/config/**/*.{ts,tsx}',
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'assets/**', 'sql/**', 'supabase/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Politica de severidad, deliberada:
      //
      // `error` queda reservado EXCLUSIVAMENTE para violaciones de frontera
      // arquitectonica, que son las que comprometen el objetivo de reusar el
      // nucleo en movil. Todo lo demas es `warn`.
      //
      // El motivo es que un CI que falla por 106 problemas heterogeneos no se
      // lee: se ignora o se desactiva. Con esta separacion, un CI rojo
      // significa siempre una sola cosa, y es grave: alguien cruzo una capa.
      //
      // La deuda de calidad queda visible como warning y se cierra por bloques
      // (13.4 y 13.7 del roadmap), no de golpe y no bajo presion de CI.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-useless-assignment': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-extra-non-null-assertion': 'warn',

      // react-hooks v6 incorpora las reglas del compiler, bastante estrictas.
      // Se degradan a warning en bloque y se vuelve a subir solo
      // `rules-of-hooks`, que si es una clase de bug real.
      //
      // Se hace de forma programatica y no enumerando nombres: el set de
      // reglas del plugin cambia entre versiones, y una lista escrita a mano
      // rompe la config entera con "Could not find rule" en la proxima
      // actualizacion.
      ...downgradeToWarn(reactHooks.configs.recommended.rules),
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  // Frontera 1: el cliente Supabase vive solo en repositories.
  // Regla arquitectonica ya declarada en roadmap 3.2 y hasta hoy sin verificar.
  //
  // La lista incluye `services` y `contexts` desde el 2026-08-12: al cerrar la
  // ultima marca de deuda se descubrio que la regla no los cubria, y
  // `services/realtimeService.ts` importaba el cliente sin que nada protestara.
  // Una frontera con un hueco no es una frontera.
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/pages/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
      'src/contexts/**/*.{ts,tsx}',
      'src/utils/**/*.{ts,tsx}',
      'src/config/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/supabaseClient', '**/lib/supabaseClient.ts'],
              message:
                'El cliente Supabase vive solo en src/repositories/. Ver roadmap 3.2 y 13.4.',
            },
            {
              group: ['@supabase/supabase-js'],
              importNames: ['createClient'],
              message:
                'No crees un cliente Supabase fuera de src/lib/supabaseClient.ts.',
            },
          ],
        },
      ],
    },
  },

  // Frontera 2: la capa de dominio no depende de la UI.
  // Hoy services/appSettings.ts y config/leadColumns.ts importan un tipo desde
  // components/ColumnSelector, que invierte la dependencia y arrastra el arbol
  // de UI a cualquier consumidor del dominio.
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/config/**/*.{ts,tsx}', 'src/repositories/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/**', '**/pages/**'],
              message:
                'La capa de dominio no puede depender de la UI. Mueve el tipo a src/types/. Ver roadmap 13.4.',
            },
          ],
        },
      ],
    },
  },

  // Frontera 3: portabilidad a movil. Esta es la regla que mas importa para el
  // objetivo de reusar el nucleo en Expo.
  //
  // La auditoria concluyo que el bloqueador real del port no es Chrome (93 usos
  // bien contenidos) sino el DOM dentro de hooks de dominio: nueve confirm() y
  // alert() en useLeadsPageController, mas window.location.hash. Nada de eso
  // existe en React Native.
  {
    files: DOMAIN_LAYERS,
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'confirm',
          message:
            'confirm() no existe en React Native. Inyecta un puerto Dialogs. Ver roadmap 13.6.',
        },
        {
          name: 'alert',
          message:
            'alert() no existe en React Native. Inyecta un puerto Dialogs. Ver roadmap 13.6.',
        },
        {
          name: 'prompt',
          message:
            'prompt() no existe en React Native. Inyecta un puerto Dialogs. Ver roadmap 13.6.',
        },
        {
          name: 'chrome',
          message:
            'Las APIs de Chrome no existen en React Native. Usa un puerto de src/platform/. Ver roadmap 13.6.',
        },
      ],
    },
  },

  // Los tests si pueden tocar globals y tipos laxos.
  {
    files: ['src/**/*.test.ts', 'src/test/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Modulos de plataforma: son codigo especifico de la extension por
  // definicion, no dominio acoplado por descuido. No se portan a movil, se
  // reescriben con el equivalente nativo, asi que aplicarles la frontera no
  // aportaria nada.
  //
  // La lista es explicita y vive en un solo sitio a proposito, en vez de
  // repartir `eslint-disable` por los archivos: asi se puede auditar de un
  // vistazo que NO esta creciendo. Si alguien agrega una entrada aqui, es una
  // decision visible en el diff, no una linea perdida dentro de un archivo.
  //
  // Deuda declarada (roadmap 13.6): estos modulos deberian terminar dentro de
  // `src/platform/`, que es donde vive lo especifico de plataforma. Mientras
  // sigan en `services/` y `utils/` conviven con dominio portable, que es
  // justo la mezcla que este bloque intenta deshacer.
  {
    files: [
      // Puntos de entrada de la extension. No portables por definicion.
      'src/background.ts',
      'src/offscreen.ts',
      'src/lib/chromeStorageAdapter.ts',
      // Flujo OAuth por pestaña, especifico de chrome.identity.
      'src/platform/oauthTab.ts',
      // Notificaciones, badge y audio: superficie nativa de Chrome.
      'src/services/alertNotifier.ts',
      'src/services/offscreenAudio.ts',
      'src/services/extensionBadgeTheme.ts',
      // Servicios que corren dentro del service worker MV3.
      'src/services/backgroundLeadAlertsService.ts',
      'src/services/backgroundAgendaAlertsService.ts',

    ],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
);
