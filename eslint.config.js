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

  // Una marca de deuda que ya no hace falta debe FALLAR, no quedarse ahi.
  // Es la diferencia entre este ratchet y la lista central de exenciones que se
  // uso antes: aquella acumulo cuatro entradas inertes que no eximian de nada y
  // nadie lo noto. Una directiva sobrante aqui rompe el CI y obliga a borrarla,
  // asi que el contador de deuda no puede mentir hacia arriba.
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
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

  // FRONTERAS DE IMPORTACION
  //
  // Tres bloques con conjuntos de archivos DISJUNTOS, y cada uno declara la
  // lista completa de patrones que le aplica. Esto no es estilo, es obligatorio:
  // en flat config las reglas se fusionan por clave y **gana la ultima
  // definicion, las opciones no se acumulan**. Dos bloques que declaren
  // `no-restricted-imports` sobre archivos solapados NO suman restricciones, se
  // pisan.
  //
  // Ya paso: las Fronteras 1 y 2 estaban en bloques separados y solapados, y la
  // segunda anulaba a la primera para `services/` y `config/`. El roadmap
  // declaraba ese hueco cerrado mientras seguia abierto. Comprobado
  // empiricamente el 2026-08-12 con un archivo de prueba.
  //
  // Si anades un patron, anadelo a los tres bloques que corresponda. Y
  // compruebalo con un archivo de prueba, no leyendo la config.

  // Capa de presentacion: puede componer UI libremente, pero no toca datos.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/supabaseClient', '**/lib/supabaseClient.ts'],
              message: 'El cliente Supabase vive solo en src/repositories/. Ver roadmap 3.2 y 13.4.',
            },
            {
              group: ['@supabase/supabase-js'],
              importNames: ['createClient'],
              message: 'No crees un cliente Supabase fuera de src/lib/supabaseClient.ts.',
            },
            {
              group: ['**/platform/web', '**/platform/web.ts', '**/platform/oauthTab'],
              message:
                'Importa el contrato desde platform/types y recibe la implementacion por inyeccion. Ver roadmap 13.6.',
            },
          ],
        },
      ],
    },
  },

  // Capa de dominio: ni datos crudos, ni UI, ni implementacion de plataforma.
  {
    files: [
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
              message: 'El cliente Supabase vive solo en src/repositories/. Ver roadmap 3.2 y 13.4.',
            },
            {
              group: ['@supabase/supabase-js'],
              importNames: ['createClient'],
              message: 'No crees un cliente Supabase fuera de src/lib/supabaseClient.ts.',
            },
            {
              group: ['**/components/**', '**/pages/**'],
              message:
                'La capa de dominio no puede depender de la UI. Mueve el tipo a src/types/. Ver roadmap 13.4.',
            },
            {
              group: ['**/platform/web', '**/platform/web.ts', '**/platform/oauthTab'],
              message:
                'Importa el contrato desde platform/types y recibe la implementacion por inyeccion. Importar platform/web arrastra chrome.* al grafo de modulos. Ver roadmap 13.6.',
            },
          ],
        },
      ],
    },
  },

  // Repositorios: son los unicos dueños del cliente Supabase, pero tampoco
  // dependen de la UI ni de la implementacion de plataforma.
  {
    files: ['src/repositories/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/**', '**/pages/**'],
              message: 'Un repositorio no puede depender de la UI. Ver roadmap 13.4.',
            },
            {
              group: ['**/platform/web', '**/platform/web.ts'],
              message: 'Un repositorio no depende de la implementacion de plataforma. Ver roadmap 13.6.',
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
        // El diagnostico de la auditoria fue que el bloqueador real del port es
        // el DOM, no Chrome. Durante varios commits la regla prohibio solo
        // confirm/alert/prompt/chrome: media el sintoma y no la propiedad, asi
        // que se pudo declarar el bloqueador eliminado con 20 usos de DOM
        // intactos en la capa de dominio. Corregido el 2026-08-12.
        {
          name: 'window',
          message:
            'window no existe en React Native. Usa un puerto de src/platform/. Ver roadmap 13.6.',
        },
        {
          name: 'document',
          message:
            'document no existe en React Native. Usa un puerto de src/platform/. Ver roadmap 13.6.',
        },
        {
          name: 'localStorage',
          message:
            'localStorage no existe en React Native. Usa el puerto KeyValueStore. Ver roadmap 13.6.',
        },
        // Segunda pasada del 2026-08-12: al medir de nuevo aparecieron mas
        // globals del DOM que la regla no veia. `window` y `document` no son
        // los unicos: estos existen solo en el navegador y se accedian sin
        // prefijo, asi que pasaban limpios.
        {
          name: 'ResizeObserver',
          message: 'No existe en React Native. Ver roadmap 13.6.',
        },
        {
          name: 'FileReader',
          message:
            'No existe en React Native; alli se leen archivos con expo-file-system. Ver roadmap 13.6.',
        },
        {
          name: 'Image',
          message: 'El constructor Image del DOM no existe en React Native. Ver roadmap 13.6.',
        },
      ],
    },
  },

  // Los tests si pueden tocar globals y tipos laxos.
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**/*.{ts,tsx}'],
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
  // Desde el `2026-08-12` la mayor parte de la lista es una sola entrada,
  // `src/platform/**`, porque los seis modulos que estaban sueltos en
  // `services/` y `lib/` ya viven ahi. Conviene ser honesto sobre lo que eso
  // implica: es un comodin, y quien meta dominio dentro de `src/platform/` se
  // salta la frontera sin que nadie lo note en el diff de este archivo. La
  // garantia deja de ser el linter y pasa a ser que esa carpeta es pequeña y
  // se revisa entera. Si crece hasta dejar de ser revisable de un vistazo,
  // toca volver a enumerar archivo por archivo.
  {
    files: [
      // Puntos de entrada de la extension. No portables por definicion.
      'src/background.ts',
      'src/offscreen.ts',
      // Todo `src/platform/` es plataforma por definicion: es la carpeta cuyo
      // contenido se reescribe al portar, no se adapta.
      'src/platform/**',
      // Mecanica de interfaz web, no dominio. No se portan a movil: se
      // reemplazan por el equivalente nativo o dejan de tener sentido.
      // Un atajo de teclado no existe en un telefono, y medir el viewport para
      // decidir hacia donde se abre un menu lo resuelve el propio componente
      // nativo. Envolverlos en un puerto seria inventar una abstraccion para
      // algo que no cruza.
      'src/hooks/useAppKeyboardShortcuts.ts',
      'src/hooks/useFlipOnOverflow.ts',
      // Cerrar con Escape. En un telefono no hay tecla Escape: el gesto
      // equivalente es el boton atras del sistema, que se escucha con otra API
      // entera. No es el mismo mecanismo con otro nombre, asi que no hay puerto
      // que valga; se reescribe.
      'src/hooks/useCloseOnEscape.ts',
      // Mide el ancho real del panel con ResizeObserver para decidir cuantas
      // columnas caben. En movil el layout responsivo se resuelve con
      // Dimensions y flex, no midiendo un nodo.
      'src/hooks/useResponsiveColumns.ts',
      // Compresion de imagen con canvas. En movil se resuelve con una libreria
      // nativa (expo-image-manipulator), no con este algoritmo: es sustitucion,
      // no adaptacion.
      'src/utils/imageCompression.ts',
    ],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
);
