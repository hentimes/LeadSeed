# Evaluacion del Plan de Arquitectura v2

**Documento evaluado:** `LeadSeed_Plan_Arquitectura_Completo_v2_Visual`, fechado el 27 de julio de 2026.
**Fecha de la evaluacion:** 2026-08-19.
**Metodo:** cada afirmacion verificable contrastada contra el codigo. El usuario ya advirtio que el
documento no esta actualizado; esta evaluacion mide **cuanto**, y separa lo desfasado de lo erroneo.

## Veredicto

**El plan es bueno y su direccion sigue siendo correcta.** Las decisiones de fondo -React Native con
Expo, TanStack Query, puertos y adaptadores, tenencia por workspace, outbox para trabajos- son
solidas y varias ya se ejecutaron sin saber que estaban aqui escritas.

Tiene tres problemas de distinta gravedad, y conviene no confundirlos:

1. **Su inventario esta desfasado**, casi al doble. No invalida el plan, pero si algunas prioridades.
2. **Contradice dos decisiones tomadas despues**, y una de ellas es estructural.
3. **Tiene un error de hecho que romperia la interfaz** si se implementa literalmente.

## 1. El error que importa: el viewport

El documento especifica para la extension:

> ancho base `560 px`, minimo `520 px`, maximo `620 px`

**El panel real mide 360 px.** Esta documentado en el roadmap, capitulo 14, al justificar por que el
editor de flujos es pagina y no dialogo: *"en un panel de 360px un `Modal` deja 278px"*.

El apendice N esta dimensionado entero sobre ese supuesto: cabecera de 72 px, drawer de 280 px,
padding lateral de 24 px, tabs en una sola fila, leyenda del donut a la derecha, dashboards de dos
columnas. En 360 px el drawer ocuparia el 78% de la pantalla y las tabs no caben en una fila.

No es un detalle de estilo: es la medida de la que cuelgan todas las demas. **Cualquier IA que
implemente el apendice N al pie de la letra romperia la extension**, y lo haria creyendo que sigue la
especificacion.

## 2. Inventario desfasado

| Afirmacion del plan | Real al `2026-08-19` |
|---|---|
| ~22.000 lineas en `src` | **42.039** |
| 154 archivos TS/TSX | **341** |
| 54 migraciones SQL | **111** |
| 11 Edge Functions | **13** |
| "ausencia de lint, pruebas y CI" | **falso** |

Ese ultimo punto merece detalle, porque el plan lo usa como argumento para varias fases. Hoy existen:
ESLint con reglas de frontera entre capas, 349 pruebas, CI en GitHub Actions, umbrales de cobertura, y
tres guardas propias (`check:classes`, `audit-dark-gaps`, `check:functions`).

Tambien estan resueltos los problemas de seguridad que denuncia: **no hay `.env.local` ni `dist.pem`
versionados**; solo `.env.example`.

## 3. Contradicciones con decisiones posteriores

**Repositorio nuevo.** El plan propone crear `leadseed-platform` desde cero y copiar la extension sin
`.git`. El `2026-08-19` el usuario pidio un monorepo **con la app en su propia carpeta dentro del
repositorio actual**. Son caminos distintos y hay que elegir uno a conciencia:

- *Repositorio nuevo*: historial limpio, sin arrastrar deuda, pero se pierden 111 migraciones
  trazadas, el roadmap y el historial de decisiones, que en este proyecto es donde vive el "por que".
- *Monorepo en sitio*: conserva todo eso, y el traslado es mecanico porque el nucleo ya esta limpio.

**Recomendacion: monorepo en sitio.** El argumento del plan para empezar de cero era la falta de
lint, pruebas y CI, y ese argumento ya no existe.

**Estrategia de ramas.** El plan pide trunk-based sobre `main` y dice explicitamente *"no mantener
`develop`, `dev` y `master` paralelas"*. El `2026-08-19` se alinearon `master`, `design` y `develop`
en el mismo commit. Con las tres identicas, consolidar en una sola es hoy trivial; conviene hacerlo
antes de que vuelvan a divergir.

## 4. Deriva del sistema visual

Los tokens del apendice N estan **parcialmente implementados, con deriva**:

| Token | Plan | Codigo |
|---|---|---|
| borde claro | `#E6EAF0` | `#e6eaf0` **identico** |
| superficie clara | `#FFFFFF` | `#ffffff` **identico** |
| morado de marca | `#635BFF` | `#6c4cf6` **distinto** |
| fondo claro | `#F7F8FB` | `#f8f9fc` **distinto** |
| fondo oscuro | `#0F1117` | `#0f1115` **distinto** |

Y los nombres divergen: el plan usa `brand` y `canvas`; el codigo usa `primary` y `bg`.

Que algunos coincidan al caracter y otros no indica que se implemento desde este documento y despues
se ajusto sin volver a el. Hay que decidir cual manda, y **el codigo es el que esta en produccion**.

## 5. Sobre-ingenieria: 40 paquetes

El plan enumera cerca de **40 paquetes**: 8 modulos, 5 de infraestructura, 9 de presentacion, 4 de
plataforma, 6 de design system, 5 compartidos y 4 de configuracion.

El propio documento avisa contra esto -*"no crear paquetes vacios por si acaso"*- y ofrece un
conjunto minimo de ocho. Conviene tomarle la palabra al minimo y no a la lista completa: para un
producto con un desarrollador, cada frontera es mantenimiento, y una frontera inventada antes de
tener dos consumidores reales se pone donde no toca.

## 6. Lo que el plan acierta y sigue pendiente

Vale la pena rescatarlo, porque no esta en el roadmap actual:

- **Tenencia por `workspace`, no por `user_id`.** Hoy la propiedad de los datos es por usuario. Es el
  cambio de mayor alcance del plan y el que mas cuesta hacer tarde.
- **Outbox y colas para trabajos.** Hoy los procesos programados dependen de que una aplicacion este
  abierta. El plan lo señala como antipatron y tiene razon.
- **Idempotencia en envios.** Sin ella, un reintento duplica un correo.
- **Audit log de acciones sensibles.**
- **`SECURITY DEFINER` con `search_path` fijado**, que aqui ya se cumple.

Y dos que ya se hicieron sin conocer el documento: **TanStack Query** como capa de estado servidor
(`2026-08-19`) y **puertos de plataforma** (`src/platform/`, seis puertos).

## 7. Que hacer con este documento

1. **Corregir el viewport a 360 px** y recalcular las medidas del apendice N que dependen de el. Es lo
   unico urgente: mientras diga 560, es una trampa para quien lo lea.
2. **Actualizar el inventario**, o marcarlo como foto del 27 de julio para que nadie planifique sobre
   el.
3. **Resolver la contradiccion del repositorio** con una nota explicita, no dejando los dos caminos
   escritos.
4. **Reconciliar los tokens** declarando que el codigo manda.
5. **Conservar intacto** todo lo demas: los principios, el grafo de dependencias, las reglas de RLS,
   el modelo de trabajos y la secuencia por fases.
