# Contraste de la auditoria externa contra el codigo real

**Fecha:** 2026-08-17
**Fuente auditada:** `AUDITORIA_DETALLADA_LEADSEED.md` (emitida el 2026-08-16)
**Metodo:** cada cifra recontada sobre `src/`, cada cita de archivo y linea abierta y comprobada.

## Veredicto general

**La auditoria es solida y honesta.** Entre a contrastarla esperando cifras infladas, porque
declaraba haber revisado "archivo por archivo" y daba numeros redondos con ">" delante. Me
equivocaba: **donde falla es por defecto, no por exceso**. Sus conteos son conservadores y sus
citas de archivo y linea son exactas, las ocho que verifique una por una.

Lo que si tiene son tres problemas distintos, y conviene no tratarlos igual:

1. Hallazgos reales, verificados, que valen la pena arreglar.
2. Un hallazgo cuya gravedad **subestimo**: hay un fallo visible que describio como cosmetico.
3. Propuestas que no son deuda tecnica sino un cambio de rumbo, y que no deberian entrar en el
   mismo saco ni ejecutarse por inercia.

## 1. Cifras: recontadas

| Afirmacion | Auditoria | Real | Veredicto |
|---|---|---|---|
| Archivos con el modificador `!` de Tailwind | 6 | **6** | exacto |
| Colores hexadecimales arbitrarios `[#...]` | ">35" | **42** en 17 archivos | conservador |
| Dimensiones fijas `[...px]` | ">650" | **803** | conservador |
| `<button>` nativos | ">210" | **281** | conservador |
| Overlays `fixed inset-0` artesanales | 8 | **11** | conservador |
| Archivos con `toLocaleDateString` | 12 | **13** | conservador |
| URLs de `ui-avatars.com` duplicadas | 7 | **7** | exacto |
| Estructura monorepo | 0% | **0%** confirmado | exacto |
| `useLeadsPageController.ts` | 573 lineas | **572** | exacto |
| `ListsPage.tsx` | 485 lineas | **484** | exacto |
| `TemplatesPage.tsx` | 460 lineas | **506** | desactualizado: crecio con el rediseno |
| `PipelinePage.tsx` | 390 lineas | **355** | sobreestimado en 35 |

Citas verificadas al caracter: `TemplateEditor.tsx:254`, `LoginPage.tsx:109`,
`PublicProfileModal.tsx:3`, `ListsPage.tsx:431`, `AlertCard.tsx:25`, `LossReasonsChart.tsx:21`,
`LoadingOverlay.tsx:10`, `ConversionBar.tsx:99`. **Ocho de ocho.**

## 2. Lo que la auditoria subestimo

Es el hallazgo mas importante de este contraste, y lo listo aparte porque el informe original lo
enterro como una nota de estilo.

Dice de `LoadingOverlay.tsx:10`: *"usa el prefijo legacy `--color-surface` en vez de `--ls-surface`"*.
Suena a limpieza cosmetica. No lo es: **`--color-surface` no esta definida en ninguna parte**.

`tokens.css` si mantiene una capa de alias hacia los tokens `--ls-*`, pero los nombres que expone son
`--color-bg-surface` y `--color-text-primary`. El codigo pide `--color-surface` y `--color-text`, que
no existen. Una variable CSS indefinida no cae a un valor por defecto: **la declaracion entera se
descarta**.

Consecuencia concreta: la capa de carga a pantalla completa **no tiene fondo**. Se ve el contenido de
debajo a traves de ella. Lo mismo en la cabecera y el pie del chat de soporte de administracion.

| Uso | Definida | Efecto |
|---|---|---|
| `var(--color-surface)` x3 | **no** | fondo transparente |
| `var(--color-text)` x1 | **no** | color heredado, no el del token |
| `var(--color-primary)` x1 | si | correcto |

Cuatro de cinco referencias estan muertas. Son cuatro lineas de arreglo y es un fallo visible hoy.

## 3. Donde la auditoria se equivoca

**Los colores literales en graficos no son una infraccion.** El informe senala
`LossReasonsChart.tsx:21` (`const COLORS = ['#7B5CFF', ...]`) como violacion del sistema de diseno.
Pero el propio `src/design/README.md:26` documenta `palette.ts` como **puente deliberado** para SVG y
Recharts, que necesitan un color literal y no leen variables CSS. El problema real no es que haya
literales, sino que ese componente **los redeclara en vez de importarlos** de `palette.ts`, que ya
existe y usan seis archivos. Es un fallo mas pequeno y de otra naturaleza.

**El estado de los tokens esta desactualizado.** El informe es del 16 de agosto y no recoge el
trabajo de ese mismo dia: 123 bloques de modo oscuro corregidos, 430 `dark:` redundantes retirados,
y el detector ampliado y probado en los dos sentidos.

## 4. Lo que no es deuda tecnica

Estos dos puntos ocupan el 40% del plan de accion y **no son correcciones, son decisiones de
producto**. Mezclarlos con lo anterior hace que parezcan igual de obligatorios.

**Fase 4, el monorepo.** Propone reestructurar el repositorio entero en `apps/` y `packages/` para
alojar `apps/mobile`. Es correcto que hoy no hay workspaces. Pero eso solo es un defecto si existe la
app movil, y no existe. Reestructurar antes de tener el segundo consumidor es pagar el coste sin el
beneficio, y toca cada ruta de importacion del proyecto.

**Sustituir `refreshKey` por React Query.** El diagnostico tecnico es correcto: siete hooks exponen un
contador, no hay deduplicacion ni cache. Pero cambiar la gestion de estado asincrono de toda la
aplicacion no es saldar deuda, es reescribir la capa de datos, y toca cada pantalla a la vez. Si el
sintoma que duele son las peticiones duplicadas, se puede medir primero y atacar donde pese.

## 5. Orden que propongo

Distinto al del informe, que empieza por lo cosmetico.

**Primero, lo que esta roto hoy**
- Las cuatro variables CSS muertas.

**Segundo, riesgo real de funcionamiento**
- El fondo de WhatsApp servido desde una URL de GitHub de un tercero: se rompe sin conexion, y la
  extension declara CSP.
- El favicon de Google cargado desde `google.com` en la pantalla de inicio de sesion.
- Las siete copias de `ui-avatars.com`.

**Tercero, correccion estructural barata**
- La fuga de capa en `PublicProfileModal.tsx:3`.
- `utils/date.ts`: hoy conviven `es-CL`, `es-ES` y llamadas sin locale, o sea que el mismo dato se
  ve distinto segun la pantalla.
- `LossReasonsChart` importando de `palette.ts`.

**Cuarto, lo grande y visible: requiere tu aprobacion**
- Los 281 botones nativos y los 803 tamanos fijos. Es la mayor parte del volumen y **cambia el
  aspecto**. No se toca sin que lo veas.

**Sin fecha, y como decision, no como tarea**
- Monorepo y React Query.
