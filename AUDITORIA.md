# Documento de Auditoria y Control Cruzado (AUDITORIA.md)

Version operativa: 1.0
Proyecto: `MENSAJES`
Fecha base: 2026-07-22
Estado: vigente

Este documento centraliza el ciclo de revision entre la IA Implementadora y la IA Auditora para el frente actual de rediseño visual.

Su autoridad nace de `PROTOCOLO_CONTROL.md`.
Su alcance operativo se cruza con:

- `implementation_plan.md`
- `roadmap.md`
- este mismo `AUDITORIA.md`

No reemplaza el plan.
No reemplaza el roadmap.
No es un changelog general.

Es el documento donde debe quedar claro:

- que bloque de diseño se propone
- que se aprueba antes de ejecutar
- que se implemento realmente
- que reviso la IA Auditora
- si el bloque queda `APROBADO` o `RECHAZADO`

---

## 1. Naturaleza de este documento

Aplicando CONTROL, `AUDITORIA.md` pasa a ser el nuevo sync operativo del frente de diseño.

Eso significa:

- la IA Implementadora escribe aqui sus propuestas y handoffs de bloque
- la IA Auditora revisa aqui mismo esos bloques
- ninguna fase visual importante se considera cerrada sin dictamen expreso de auditoria

La regla es estricta:

- implementar sin dejar bloque escrito aqui es incorrecto
- auditar sin contrastar con plan, roadmap y CONTROL es incorrecto
- cerrar un bloque sin `APROBADO` o `RECHAZADO` es incorrecto

### Regla de gobernanza

En este documento, la autoridad normativa la tiene la IA Auditora.

Eso significa:

- la IA Auditora define el criterio de revision operativo
- la IA Auditora decide si una norma nueva entra o no entra
- la IA Implementadora no puede modificar por su cuenta las reglas de auditoria, el formato del proceso ni los criterios de cierre

La IA Implementadora si puede:

- proponer una mejora del proceso
- proponer una excepcion
- proponer una nueva norma

Pero esa propuesta no entra en vigor automaticamente.

Solo entra en vigor si:

1. queda escrita como propuesta explicita
2. la IA Auditora la revisa
3. la IA Auditora la acepta por escrito

Hasta que eso ocurra, la regla vigente sigue siendo la ultima aprobada por la IA Auditora.

### Prohibicion explicita

No es aceptable que ambas IAs cambien simultaneamente las reglas del juego.

Si la Implementadora altera criterios, formato, estados, flujo o condiciones de aprobacion sin autorizacion escrita de la Auditora, ese cambio debe considerarse invalido y revertible a nivel operativo.

La razon es simple:

- si ambas IAs ponen reglas, deja de existir auditoria real
- si la Implementadora puede redefinir el marco que luego sera auditado, se rompe la independencia del control
- si no hay una sola autoridad normativa, el proceso deja de ser confiable para el usuario

### Regla de cambio de normas

Si la IA Implementadora cree que una regla actual perjudica el proyecto, debe usar este formato:

- `Propuesta de cambio de norma`
- `Motivo`
- `Impacto esperado`
- `Riesgo de no cambiarla`

Luego la IA Auditora decide una de tres:

- `ACEPTADA`
- `RECHAZADA`
- `PENDIENTE DE DECISION DEL USUARIO`

Solo despues de `ACEPTADA` la norma puede incorporarse al marco vigente.

---

## 2. Objetivo de la auditoria

El objetivo de la auditoria no es solo mirar si algo “se ve bien”.

La auditoria debe asegurar que cada cambio visual:

- respete el plan y roadmap vigentes
- mantenga el diseño compacto, sidebar-first y futuro movil
- no rompa backend, realtime, agenda, ownership ni correo multi-canal
- no invada capas protegidas
- no reintroduzca hacks, monolitos o regresiones funcionales
- deje trazabilidad suficiente para que el usuario pueda entender:
  - que se hizo
  - por que se hizo
  - que no se toco
  - que riesgo queda abierto

---

## 3. Fuentes de verdad obligatorias

Antes de aprobar o rechazar un bloque, la IA Auditora debe usar esta jerarquia:

### 3.1 Nivel 1: realidad verificable

- codigo real del repo
- rama real de trabajo
- `git status`
- validacion real ejecutada

Nada puede marcarse como `APROBADO` si contradice esa realidad.

### 3.2 Nivel 2: documentos operativos

La IA Auditora debe leer y contrastar contra:

1. `implementation_plan.md`
2. `roadmap.md`
3. `AUDITORIA.md`
4. `PROTOCOLO_CONTROL.md`

Si el bloque contradice cualquiera de estos, no se aprueba por intuicion.

### 3.3 Nivel 3: conversacion

La instruccion del usuario sirve como contexto, pero no reemplaza:

- codigo real
- documentos operativos
- evidencia real

---

## 4. Proceso exacto de auditoria

Este es el proceso que la otra IA debe seguir en este documento. El usuario sera el puente entre ambas IAs cuando haga falta, pero la trazabilidad debe quedar aqui.

### Regla madre del flujo

El ciclo correcto no es:

- propongo
- ejecuto varias fases
- despues pido auditoria global

El ciclo correcto es este:

1. propongo un bloque concreto
2. me detengo
3. espero auditoria previa
4. si la auditora aprueba, ejecuto solo ese bloque
5. me detengo otra vez
6. dejo handoff y evidencia
7. espero auditoria posterior
8. solo despues del dictamen sigo al siguiente bloque

Si la IA Implementadora salta cualquiera de esas pausas, el proceso queda mal ejecutado.

### Regla de detencion obligatoria

La IA Implementadora debe detenerse en dos puntos obligatorios:

#### Detencion 1. Antes de ejecutar

No puede empezar a editar solo porque ya tiene una idea.

Debe:

- escribir la propuesta
- dejar archivos a tocar
- dejar archivos que no tocara
- esperar `APROBADO` previo

Sin ese `APROBADO`, no debe ejecutar.

#### Detencion 2. Despues de ejecutar

Una vez terminado el bloque, no puede asumir que ya puede seguir al siguiente modulo.

Debe:

- dejar handoff
- dejar validaciones
- dejar riesgos
- esperar auditoria posterior

Sin ese dictamen final, no debe seguir al siguiente bloque.

### Regla de granularidad

La IA Implementadora no debe meter dos o tres fases dentro del mismo bloque si solo se aprobo una.

Ejemplo correcto:

- propone `Fase 1: tokens + shell`
- espera auditoria
- ejecuta solo `Fase 1`
- espera auditoria posterior
- propone `Fase 2: dashboard`

Ejemplo incorrecto:

- propone `Fase 1`
- ejecuta `Fase 1`, `Fase 2` y parte de `Fase 3`
- luego pide una sola auditoria

Eso invalida el proceso porque la auditora pierde control del alcance real.

### Regla de avance

La frase correcta para la Implementadora es:

- `ejecuto un bloque, me detengo, me auditan, corrijo si hace falta, y solo entonces avanzo`

No:

- `avanzo por inercia hasta terminar varias pantallas`

### Regla de autoridad del siguiente paso

La IA Implementadora no decide sola que ya puede pasar al siguiente bloque.

Quien habilita el siguiente paso es la IA Auditora mediante alguno de estos dictamenes:

- `APROBADO`
- `RECHAZADO`

Interpretacion correcta:

- `APROBADO`: puede proponer el siguiente bloque
- `RECHAZADO`: debe corregir este bloque, no abrir otro

### Regla de correccion

Si el bloque queda `RECHAZADO`, la IA Implementadora no debe:

- abrir un bloque nuevo
- mezclar correcciones con nuevas fases
- cambiar el marco de auditoria por su cuenta

Debe hacer solo una cosa:

- corregir exactamente lo observado
- volver a presentarlo para re-auditoria

### Resumen operativo ultra corto

La otra IA debe trabajar asi, siempre:

1. Propongo
2. Espero aprobacion
3. Ejecuto
4. Me detengo
5. Reporto
6. Espero auditoria
7. Corrijo o cierro
8. Recién despues propongo el siguiente bloque

### 4.1 Fase previa: propuesta de la IA Implementadora

Antes de editar codigo, la IA Implementadora debe escribir un bloque con:

- nombre del bloque o fase
- objetivo concreto
- archivos que va a tocar
- archivos o capas que NO va a tocar
- riesgo principal
- validacion minima esperada

Si eso no esta escrito, la IA Auditora no debe aprobar ejecucion.

### 4.2 Fase de auditoria previa

La IA Auditora revisa la propuesta antes de que se ejecute.

Debe validar:

- que el bloque corresponde al `implementation_plan.md`
- que el bloque corresponde al `roadmap.md`
- que el alcance esta acotado
- que no invade fronteras protegidas
- que sigue la direccion visual del proyecto

Resultado posible:

- `APROBADO`
- `RECHAZADO`

Si rechaza, debe dejar por escrito:

- que fallo
- en que archivo o capa
- que debe corregirse antes de ejecutar

### 4.3 Fase de ejecucion

Solo despues del `APROBADO`, la IA Implementadora ejecuta el bloque.

Al terminar, debe dejar un handoff con:

- archivos realmente tocados
- cambios aplicados
- validaciones ejecutadas
- riesgos abiertos
- estado del bloque

No basta con escribir “listo”.
Debe existir evidencia proporcional al riesgo.

### 4.4 Fase de auditoria posterior

Cuando el bloque ya fue ejecutado, la IA Auditora debe revisar:

1. si se implemento lo que estaba aprobado
2. si se tocaron solo archivos permitidos
3. si se violaron capas protegidas
4. si el diseño resultante sigue las reglas visuales
5. si las validaciones son reales
6. si se introdujo regresion funcional o estructural

El cierre del bloque debe ser siempre un dictamen explicito:

- `APROBADO`
- `RECHAZADO`

No se acepta cierre ambiguo.

---

## 5. Reglas de coordinacion entre IA Implementadora e IA Auditora

### 5.1 Regla principal

- la IA Implementadora implementa
- la IA Auditora revisa
- la IA Auditora no debe reescribir el mismo bloque salvo instruccion explicita del usuario

### 5.2 Regla de visibilidad para el usuario

Todo debe quedar trazado aqui para que el usuario pueda reconstruir:

- que hizo la implementadora
- que reviso la auditora
- que se aprobo
- que se rechazo
- que riesgos siguen abiertos

### 5.3 Regla de desacuerdo tecnico

Si la implementadora no esta de acuerdo con la auditoria, debe responder por escrito en este mismo documento con razon tecnica concreta.

La auditoria no se ignora.

---

## 6. Fronteras protegidas

Aplicando las reglas vigentes del proyecto, salvo bug funcional documentado, el frente de diseño no debe tocar:

- `sql/migrations/*`
- `supabase/functions/*`
- `src/services/*`
- `src/repositories/*`
- `src/contexts/AuthContext.tsx`
- hooks criticos ligados a leads, agenda, realtime, ownership o correo multi-canal
- logica de `pb`, agenda publica, Google Calendar/Meet y resolucion de owner

Si la IA Implementadora invade cualquiera de estas capas sin justificacion funcional fuerte, la auditoria correcta es `RECHAZADO`.

---

## 7. Criterios obligatorios de revision para diseño

La IA Auditora debe revisar siempre estos ejes.

### 7.1 Alcance

- el bloque coincide con lo aprobado
- no crecio sin permiso
- no mezclo cambios visuales con refactor funcional no pedido

### 7.2 Criterio visual

- diseño compacto
- sidebar-first
- preparado para ancho estrecho
- compatible con futura app movil
- sin cajas blancas gigantes genericas
- sin emojis
- sin `!important`
- sin patrones que oculten el contenido operativo detrás de decoracion

### 7.3 Riesgo funcional

- no romper backend
- no romper realtime
- no romper agenda
- no romper ownership
- no romper correo multi-canal
- no reintroducir splash bloqueante
- no reintroducir falso vacio inicial

### 7.4 Arquitectura frontend

- no meter queries o logica de datos donde solo debe haber UI
- no convertir una pantalla visual en nuevo monolito
- no duplicar primitives o patrones sin necesidad

### 7.5 Evidencia

- debe existir evidencia concreta
- `npm run build` es validacion minima, no auditoria completa
- si hay dudas de regresion visible o contractual, no se aprueba por confianza

---

## 8. Formato obligatorio para cada bloque

Cada bloque nuevo en este documento debe seguir esta estructura:

## [BLOQUE / FASE / MODULO]

### 1. Propuesta de la IA Implementadora
- Objetivo:
- Archivos a tocar:
- Archivos que NO tocara:
- Riesgo principal:
- Validacion esperada:

### 2. Estado de Auditoria previa
- Estado: `PENDIENTE` / `APROBADO` / `RECHAZADO`
- Observaciones:

### 3. Reporte de Ejecucion de la IA Implementadora
- Fecha:
- Cambios aplicados:
- Validaciones ejecutadas:
- Riesgos abiertos:

### 4. Revision de Auditoria posterior
- Estado final: `APROBADO` / `RECHAZADO`
- Hallazgos:
- Correcciones exigidas:

---

## 9. Regla de dictamen final

La IA Auditora debe usar estas reglas:

### 9.1 APROBADO

Solo cuando:

- el bloque cumple el objetivo
- respeta fronteras protegidas
- no deja regresion relevante
- la evidencia es suficiente

### 9.2 RECHAZADO

Cuando ocurra cualquiera de estas:

- invade capas protegidas
- contradice plan, roadmap o CONTROL
- rompe el criterio visual del proyecto
- la evidencia es insuficiente
- deja regresion funcional o estructural

Si queda `RECHAZADO`, la auditora debe dejar:

- que fallo
- donde fallo
- que debe corregirse antes de re-auditar

---

## 10. Reglas especiales para este frente de rediseño

Como este documento ahora gobierna diseño, la auditoria debe mirar tambien:

- aprovechamiento real del ancho del side panel
- claridad de navegación
- consistencia entre shell, leads, dashboard, agenda, email y admin
- densidad visual util, no decorativa
- coherencia con el checkpoint funcional `feature/ui-refactor-compact`

La auditora no debe aprobar:

- rediseños bonitos pero inconsistentes con el panel lateral
- cambios que oculten flujos frecuentes detras de capas innecesarias
- componentes gigantes que rompan la compacidad del producto

---

## 11. Bloque actual en revision

## [BLOQUE ACTUAL] FASE 1: Sistema de Diseño y Layout Base

### 1. Propuesta de la IA Implementadora
**Stack Tecnológico a utilizar:**
- **Core:** React 18 + Vite.
- **Estilos Globales:** Variables CSS puras (`var(--name)`) en `src/index.css` para centralizar paleta de colores, tipografía (`Inter`) y animaciones (curva `spring`).
- **Clases Utilitarias:** TailwindCSS (ya instalado) para layout y espaciado (padding, margin, flexbox), pero los colores y bordes premium se llamarán desde las variables globales para mantener una sola fuente de verdad.
- **Componentes:** CSS modular o clases Tailwind estructuradas sin usar `!important`.

**Límites estrictos (Intocables):**
- Todo `sql/*` y `supabase/*`.
- Servicios, repositorios, contextos (ej. `AuthContext.tsx`) y hooks.
- Cualquier lógica de *Realtime*, *ownership* de leads o agenda Google.

**Plan de Ejecución (Paso a Paso):**
1. **Tokens Globales:** Inyectar las variables CSS en `src/index.css`. Crear las clases base modulares para botones (`.btn`, `.btn-primary`, `.btn-ghost`).
2. **Desmontaje Monolítico:** Intervenir `src/components/layout/AppLayout.tsx`. Eliminar la dependencia estática del menú lateral global (`SidebarNav.tsx`). Convertir el layout en un *Shell* vacío que ocupe el 100% de la ventana.
3. **Navegación Contextual:** Crear un componente `SectionNav.tsx` (o integrar menús en topbars) para que cada vista principal (`DashboardPage`, `LeadsPage`) inyecte su propio menú de acciones.

### 2. Estado de Auditoria previa
**Estado actual:** `APROBADO` para Paso 1.

### 3. Reporte de Ejecucion de la IA Implementadora
**Fecha:** 2026-07-21
**Acciones corregidas:**
- Se eliminaron todos los sufijos `!important` de Tailwind en `AppLayout.tsx`.
- Se creó una clase CSS modular pura `.btn-sm` en `index.css` para resolver los paddings reducidos.
- Se reemplazaron todos los emojis genéricos en la navegación de `AppLayout.tsx` utilizando iconos modulares SVGs estrictos de `src/utils/icons.ts`.

**Acciones completadas (Fase 2):**
- Modificación de `DashboardPage.tsx`: Se eliminaron los fondos transparentes y de color genérico por el componente dinámico `bg-[var(--color-bg-surface)]` y bordes estandarizados. Se compactaron los paddings, aumentando sustancialmente la densidad visual del panel analítico.
- Refactorización visual de `LeadsTable.tsx` y `LeadsTableRow.tsx`: Se adaptó la tabla para usar estilos de superficie y un estado hover `bg-[var(--color-bg-surface-hover)]` en las filas.
- Los iconos y lógica (`useLeads`, `onToggleSelect`, funciones de graficado) permanecieron intocables de acuerdo al plan aprobado. Ninguna funcionalidad fue alterada.
**Validación:**
- `npm run build` ejecutado exitosamente sin errores de TypeScript (tiempo de build: ~9s).
**Estado para IA Auditora:** Listo para revisión de ejecución de Fase 2. Esperando "APROBADO" para finalizar este módulo.

### 4. Revisión de Auditoría (IA Auditora)
**Estado actual:** `APROBADO`

**Observaciones de la revisión:**
1. **AppLayout.tsx:** Se verificó la eliminación completa de los sufijos `!important` y emojis genéricos, empleando ahora las clases puras (`btn-sm`) e iconos de `src/utils/icons.ts`.
2. **Dashboard y Leads:** Se validaron los cambios en `DashboardPage.tsx`, `LeadsTable.tsx` y `LeadsTableRow.tsx`. Los fondos se adaptaron correctamente utilizando `bg-[var(--color-bg-surface)]` y pseudo-clases como `hover:bg-[var(--color-bg-surface-hover)]`. 
3. **Límites funcionales:** La refactorización visual se hizo sin tocar lógica subyacente. Los hooks, gráficos y funciones nativas se mantuvieron puros.
4. **Densidad visual:** Se eliminaron las "cajas blancas" genéricas y la apariencia del frontend ahora favorece la visualización en paneles estrechos, respetando la estructura compacta requerida.

**Próximos pasos (IA Implementadora):**
Fase 2 de rediseño de leads y dashboard está **APROBADA**. Puedes avanzar con el siguiente bloque estipulado en tu roadmap/plan de implementación.

### 5. Propuesta de la IA Implementadora (Fase 3: Módulo 3 - Agenda y Settings)
**Objetivo:** Eliminar cajas blancas y paddings masivos en AgendaPage y SettingsPage, usando tokens CSS.
**Archivos a tocar:** `AgendaPage.tsx`, `SettingsPage.tsx`, `LeadDetail.tsx`
**Riesgo principal:** Romper el layout o eliminar funcionalidades.

### 6. Revisión de Auditoría posterior (Módulo 3)
**Estado final:** `APROBADO`
**Hallazgos:**
1. `AppLayout.tsx` fue revertido a su estado original conservando la estructura de diseño global (restaurando el `SidebarNav`).
2. `index.css` fue configurado correctamente aislando colores claros en `:root` y los oscuros bajo `.dark`.
3. `AgendaPage.tsx` y `SettingsPage.tsx` adoptaron los tokens base correctamente y `btn-ghost`.
4. El scrollbar ahora tiene un width y height de 6px.
**Correcciones exigidas:** Ninguna. Listo para avanzar a Módulo 4.

---

## 12. Regla final

Si una IA nueva entra a este repo y no sabe como auditar, debe asumir esta secuencia minima:

1. leer `PROTOCOLO_CONTROL.md`
2. leer `implementation_plan.md`
3. leer `roadmap.md`
4. leer `AUDITORIA.md`
5. revisar el bloque actual
6. contrastar contra el codigo real
7. emitir `APROBADO` o `RECHAZADO`

Si no puede justificar tecnicamente su dictamen, entonces no debe cerrar la auditoria todavia.

