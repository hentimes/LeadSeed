# Plan Maestro de Rediseño LeadSeed para MENSAJES

Fecha: 2026-07-19
Proyecto base: `MENSAJES`
Referencia visual: prototipo `leadseed`
Tipo de entrega: plan detallado previo a implementacion
Estado: listo para ejecucion por fases

## 1. Objetivo

Adaptar el lenguaje visual y la experiencia de uso del prototipo `leadseed` al producto `MENSAJES`, respetando:

- el stack actual `React + TypeScript + Vite + Tailwind`
- la arquitectura modular ya existente
- el modo de uso como `Chrome Side Panel`
- la densidad operativa del producto real
- la necesidad de que todo se vea correcto dentro del ancho minimo util del sidebar

El objetivo no es portar el prototipo como codigo fuente. El objetivo es reconstruir su sistema visual, su tono y sus patrones de densidad sobre la app real.

## 2. Alcance del rediseño

### Incluye

- shell global de la aplicacion
- layout principal
- navegacion lateral
- cabeceras de modulo
- dashboard
- leads
- tablas y filtros
- estados vacios, carga, error y bloqueo por feature
- login
- bases visuales reutilizables para el resto de modulos

### No incluye en esta etapa

- cambios de logica de negocio
- refactor funcional de servicios, hooks o repositorios
- cambio de schema, storage o Supabase
- nuevas features de producto
- reescritura total de todos los modulos en una sola pasada

## 3. Hallazgos base

### Proyecto actual `MENSAJES`

El producto actual ya tiene una base apropiada para rediseño:

- shell principal en `src/components/layout/AppLayout.tsx`
- navegacion y estados en `src/components/SidebarNav.tsx`
- carga diferida de modulos en `src/components/app/AppPageRenderer.tsx`
- rutas centralizadas en `src/config/routes.ts`
- extension con `side_panel.default_path` en `manifest.json`

Patrones actuales detectados:

- interfaz de pantalla completa con sidebar delgado de iconos
- tipografia `Inter` y fondo gris plano en `src/index.css`
- varios modulos con UI utilitaria y densidad media
- tablas horizontales con riesgo de friccion en ancho estrecho

### Prototipo de referencia `leadseed`

El prototipo aporta valor en:

- sistema de tokens claro por variables CSS
- densidad alta y tono mas sobrio
- eliminacion de tarjetas blancas genericas
- ritmo visual tipo app de panel lateral
- jerarquia compacta para metricas, headers y subviews

Limitaciones del prototipo:

- no usa React
- no usa Tailwind
- fue construido como HTML/CSS/JS estatico
- su propia auditoria detecta acoplamiento al DOM, modulos incompletos y deuda de arquitectura

Conclusiones:

- el prototipo sirve como direccion de diseño
- no sirve como base de integracion literal
- la implementacion correcta es una traduccion sistematica a componentes React

## 4. Restriccion critica: ancho minimo del sidebar

### Hecho verificado

La documentacion oficial actual de `chrome.sidePanel` no publica un ancho minimo fijo del panel lateral. Esto implica que no debemos depender de una medida de API garantizada.

Referencia oficial consultada:

- `https://developer.chrome.com/docs/extensions/reference/api/sidePanel`
- `https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel`

### Decision de diseño

Para el plan se define un rango operativo interno:

- ancho de stress test: `320px`
- ancho minimo objetivo de calidad: `340px`
- ancho comodo base: `360px`
- ancho de referencia premium: `380px`

### Regla UX/UI obligatoria

Todo patron nuevo debe probarse al menos en:

1. `320px`
2. `340px`
3. `360px`
4. `380px`

Si una vista solo se ve bien en `380px`, el diseño se considera incompleto.

## 5. Principios del rediseño

### Principios visuales

- menos cajas flotantes, mas superficie integrada
- contraste alto y jerarquia clara
- densidad alta sin hacinamiento
- tipografia compacta con numeros tabulares donde aplique
- color como señal operativa, no como decoracion
- motion corto y funcional
- controles tactiles y de mouse igualmente legibles

### Principios de producto

- optimizar primero las tareas mas frecuentes
- priorizar lectura, triage y accion rapida
- no sacrificar datos por estilo
- evitar patrones visuales que rompan tablas, filtros o formularios densos

### Principios tecnicos

- construir sobre el shell existente
- encapsular tokens y primitives antes de tocar paginas
- rediseñar por capas, no por caos
- no mezclar refactor funcional con rediseño salvo que un bloqueo lo exija

## 6. Recortes de agentes

## 6.1 Recorte del agente UX/UI

### Mision

Acoplar el lenguaje LeadSeed al sidebar real de Chrome con calidad en ancho estrecho.

### Diagnostico

- el prototipo ya piensa en una experiencia compacta y lateral
- `MENSAJES` tiene componentes que hoy asumen demasiado aire horizontal
- `Leads`, `Dashboard` y algunos headers actuales no estan optimizados para `320px` a `340px`

### Reglas UX/UI obligatorias

- ninguna cabecera puede depender de dos filas fijas con botones largos
- toda accion primaria debe existir en version iconica o compacta
- toda tabla debe tener estrategia de colapso o prioridad de columnas
- todo filtro debe poder vivir en drawer, popover o bloque colapsable
- los datos de alta frecuencia deben estar visibles sin scroll horizontal idealmente
- cuando el scroll horizontal sea inevitable, debe estar explicitamente diseñado y no ser accidente

### Decisiones de acople al sidebar

- convertir la navegacion actual en un shell de panel real, no solo una app encogida
- pasar de sidebar icon-only a una navegacion con mas contexto textual en formatos estrechos
- usar headers de modulo de una sola columna en `320px` y de dos zonas en `360px+`
- transformar metricas horizontales de 4 columnas a `2x2` cuando el ancho baje de `360px`
- reducir ruido de bordes y bloques, pero mantener anclajes visibles para datos complejos
- estandarizar un sistema de breakpoints internos especifico para side panel

### Resultado esperado

Una experiencia donde `Dashboard`, `Leads`, `Login`, estados vacios y paneles de accion se sientan nativos al side panel de Chrome y no una web desktop comprimida.

## 6.2 Recorte del agente de diseño de sistema

### Mision

Traducir el lenguaje del prototipo a un design system implementable en Tailwind.

### Tokens a construir

- color base, muted, border, accent, danger, success
- escala tipografica compacta
- espaciado denso
- radios de panel, boton e input
- sombras minimas
- duraciones y easings
- patrones de skeleton
- estados de foco visibles

### Componentes base a diseñar

- `AppShell`
- `PanelHeader`
- `SectionHeader`
- `SegmentedTabs`
- `MetricChip`
- `StatStrip`
- `ActionButton`
- `IconButton`
- `FilterBar`
- `DataTableShell`
- `InlineEmptyState`
- `CompactModal`
- `StatusBanner`
- `FeatureGateCard`

### Deudas visuales a corregir frente al prototipo

- bordes hairline inseguros
- metric strip fragil con 4 bloques lineales
- contraste marginal en texto pequeno
- estilos en linea dentro de skeletons
- dependencia excesiva del ancho de referencia de `380px`

## 6.3 Recorte del agente de arquitectura

### Mision

Garantizar que el rediseño sea incremental, reusable y sin romper el producto.

### Observaciones

- `AppLayout` y `SidebarNav` permiten atacar el shell primero
- `AppPageRenderer` permite migracion por pagina
- `LeadsPage` y `DashboardPage` concentran alto impacto visual
- `LeadsTable` requiere una estrategia de prioridad de columnas y densidad adaptable

### Reglas de arquitectura

- crear primero primitives y tokens
- no hardcodear estilos nuevos por pagina si pueden vivir en primitives
- encapsular los nuevos patrones en componentes presentacionales
- separar layout, skin y negocio
- preservar props y contratos publicos mientras se reemplaza la vista

### Riesgos

- mezclar rediseño con cambios de estado o logica
- introducir demasiadas excepciones por modulo
- crear dos sistemas visuales en paralelo sin criterio de cutover

## 6.4 Recorte del agente de infraestructura

### Mision

Asegurar que el rediseño siga siendo estable en entorno de extension y side panel.

### Restricciones

- la app corre como `Chrome extension` con permiso `sidePanel`
- el `default_path` es `index.html`
- el panel puede estar a izquierda o derecha segun preferencia de usuario
- no existe ancho fijo garantizado por la API

### Requisitos de verificacion

- validar layout en panel izquierdo y derecho
- validar scroll, focus y modales en side panel
- validar que overlays no queden fuera del viewport estrecho
- validar que tooltips y menus no se corten por overflow del panel
- validar performance base en vistas densas

## 7. Estrategia de implementacion propuesta

## Fase 0. Definicion y baselines

### Objetivo

Congelar las reglas del sistema antes de intervenir pantallas.

### Entregables

- inventario visual actual
- lista de tokens
- matriz de breakpoints del side panel
- criterios de aceptacion por vista
- mapa de componentes a reemplazar

### Verificaciones

- ancho de prueba definido y aceptado
- lista de vistas prioritarias cerrada
- decision formal de no portar el prototipo literal

## Fase 1. Foundation del sistema visual

### Objetivo

Crear la capa base del nuevo diseño.

### Trabajo

- migrar el lenguaje visual a variables o utilidades semanticas
- crear primitives de boton, input, panel, chip, tabs, banners y skeletons
- redefinir `src/index.css`
- establecer grid y espaciado de side panel

### Criterios

- se puede construir una pantalla completa sin clases improvisadas repetidas
- dark mode mantiene coherencia
- focus visible y contraste aceptable

## Fase 2. Shell global

### Objetivo

Rehacer la estructura global de la app.

### Trabajo

- rediseñar `AppLayout`
- rediseñar `SidebarNav`
- repensar header global y areas desplazables
- definir patron de navegacion compacto

### Criterios

- navegacion usable en `320px`
- avatar, badges, logout y admin no se pisan
- menus y overlays no se cortan

## Fase 3. Dashboard adaptado al panel

### Objetivo

Tomar el mejor lenguaje del prototipo y volverlo real dentro del dashboard actual.

### Trabajo

- convertir la cabecera en un header compacto de panel
- reemplazar metricas lineales por una grilla adaptativa
- rediseñar tabs internas
- compactar graficos y bloques de resumen
- ordenar alertas y CTA para no saturar el primer viewport

### Criterios

- `320px`: lectura intacta
- `340px`: interaccion comoda
- `360px+`: experiencia premium

## Fase 4. Leads y tabla operativa

### Objetivo

Resolver la vista mas compleja del producto en ancho estrecho.

### Trabajo

- rediseñar header de leads
- rediseñar `LeadsTableControls`
- definir columnas prioritarias
- crear modo card-row o tabla adaptativa para estrecho
- integrar bulk actions sin romper la densidad
- revisar formularios y detalle de lead

### Regla clave

No intentar mantener la misma tabla desktop exacta en `320px`. Debe existir una adaptacion real.

### Estrategia concreta

- `>= 360px`: tabla compacta con prioridad de columnas
- `340px - 359px`: tabla ultra compacta con menos columnas visibles
- `320px - 339px`: filas resumidas tipo record row o table-card

## Fase 5. Patrones transversales

### Objetivo

Extender coherencia al resto de modulos.

### Trabajo

- settings
- templates
- history
- send
- tasks
- agenda
- admin
- chat y support

### Criterios

- todos usan los mismos primitives
- no aparecen estilos viejos mezclados con los nuevos

## Fase 6. Estados y calidad final

### Objetivo

Cerrar la parte menos visible pero mas importante del rediseño.

### Trabajo

- empty states
- loading states
- error states
- gates de feature
- accesibilidad
- motion
- regression visual

## 8. Matriz de vistas prioritarias

### Nivel 1

- `AppLayout`
- `SidebarNav`
- `LoginPage`
- `DashboardPage`
- `LeadsPage`
- `LeadsTable`
- `LeadsTableControls`

### Nivel 2

- `TemplatesPage`
- `SendPage`
- `SendHistoryPage`
- `TasksPage`
- `SettingsPage`

### Nivel 3

- `AgendaPage`
- `CommunityPage`
- `ChatPage`
- `AdminLayout` y subpaginas

## 9. Criterios de aceptacion por UX/UI

Un modulo se considera listo solo si cumple:

1. se ve bien en `320px`, `340px`, `360px` y `380px`
2. no depende de scroll horizontal accidental para la tarea principal
3. mantiene foco visible por teclado
4. conserva jerarquia de accion primaria y secundaria
5. no rompe dark mode
6. no mezcla visual vieja y nueva de manera caotica
7. no introduce regresiones funcionales

## 10. Checklist de verificacion por ancho

### 320px

- header de modulo en una columna
- acciones compactas
- filtros colapsables
- metricas en `2x2`
- tablas resumidas

### 340px

- acciones primarias visibles sin overflow
- chips y badges sin cortes
- inputs legibles

### 360px

- experiencia base de release
- overlays y popovers estables

### 380px

- version premium del panel
- puede mostrar mas contexto sin perder densidad

## 11. Riesgos del proyecto

### Riesgo 1. Intentar portar HTML/CSS del prototipo directamente

Impacto: alto
Mitigacion: prohibir port literal, usar solo traduccion de sistema visual.

### Riesgo 2. Querer resolver todas las paginas antes de cerrar primitives

Impacto: alto
Mitigacion: foundation primero, vistas despues.

### Riesgo 3. Mantener tabla desktop comprimida

Impacto: alto
Mitigacion: estrategia real de tabla adaptativa y jerarquia de columnas.

### Riesgo 4. Falta de testing por ancho

Impacto: alto
Mitigacion: checklist obligatoria por `320/340/360/380`.

### Riesgo 5. Mezcla de refactor funcional con rediseño

Impacto: medio
Mitigacion: aislar el scope visual salvo bloqueos.

## 12. Definicion de listo

El rediseño se considera listo cuando:

- el shell completo responde bien a side panel estrecho
- dashboard y leads quedan resueltos con calidad
- existe un design system reutilizable
- las vistas prioritarias ya no parecen una web desktop comprimida
- la UI se siente nativa al panel de Chrome

## 13. Recomendacion final

La secuencia correcta es:

1. foundation
2. shell
3. dashboard
4. leads
5. patrones transversales
6. QA estrecho y cutover visual

No conviene empezar por detalles sueltos de paginas secundarias. El exito del rediseño depende del sistema, del shell y de la resolucion correcta del ancho estrecho.
