# Roadmap y Tasklist de Rediseño LeadSeed para MENSAJES

Fecha: 2026-07-19
Formato: roadmap por secciones, capitulos y tareas
Uso: ejecucion secuencial con validacion por fase

## Seccion I. Preparacion

## Capitulo 1. Congelamiento de alcance

### Tareas

- [ ] Confirmar que el rediseño es visual y estructural, no funcional.
- [ ] Confirmar que el prototipo `leadseed` se usara como referencia y no como base literal.
- [ ] Definir vistas nivel 1, 2 y 3.
- [ ] Definir rango de anchos de prueba `320/340/360/380`.
- [ ] Definir criterio de calidad para side panel izquierdo y derecho.

### Entregables

- alcance firmado
- lista de vistas prioritarias
- matriz de widths

## Capitulo 2. Baseline de auditoria

### Tareas

- [ ] Levantar inventario de componentes actuales del shell.
- [ ] Levantar inventario de headers, tablas, filtros, estados y modales.
- [ ] Marcar componentes con mayor deuda visual.
- [ ] Identificar clases repetidas que deben convertirse en primitives.

### Entregables

- inventario visual
- mapa de deuda UI

## Seccion II. Sistema visual

## Capitulo 3. Tokens

### Tareas

- [ ] Definir paleta semantica `bg/surface/fg/muted/border/accent`.
- [ ] Definir escalas tipograficas para panel estrecho.
- [ ] Definir espaciado de alta densidad.
- [ ] Definir radios, sombras y transiciones.
- [ ] Definir color states para success, warning, danger e info.
- [ ] Definir tokens de charts y metricas.

### Entregables

- spec de tokens
- tabla de mapeo entre tokens actuales y nuevos

## Capitulo 4. Primitives

### Tareas

- [ ] Crear `ActionButton`.
- [ ] Crear `IconButton`.
- [ ] Crear `PanelHeader`.
- [ ] Crear `SectionHeader`.
- [ ] Crear `SegmentedTabs`.
- [ ] Crear `MetricChip`.
- [ ] Crear `FilterBar`.
- [ ] Crear `DataTableShell`.
- [ ] Crear `InlineEmptyState`.
- [ ] Crear `CompactModal`.
- [ ] Crear `StatusBanner`.
- [ ] Crear `SkeletonBlock`.

### Entregables

- catalogo de primitives
- reglas de uso por primitive

## Seccion III. Shell y navegacion

## Capitulo 5. App shell

### Tareas

- [ ] Rediseñar `AppLayout` como panel nativo y no como app desktop comprimida.
- [ ] Replantear paddings globales.
- [ ] Revisar zonas de scroll.
- [ ] Revisar comportamiento de overlays y soporte flotante.
- [ ] Asegurar que el panel principal no genere cortes de contenido.

### Verificacion

- [ ] `320px` sin clipping
- [ ] `340px` con lectura estable
- [ ] `360px` con experiencia base aprobada

## Capitulo 6. Navegacion lateral

### Tareas

- [ ] Rediseñar `SidebarNav`.
- [ ] Definir version compacta y version expandida contextual.
- [ ] Resolver labels, badges, avatar y logout en ancho estrecho.
- [ ] Evitar tooltips que dependan del espacio exterior del panel.
- [ ] Definir focus states y hover states consistentes.

### Verificacion

- [ ] no hay badges cortados
- [ ] no hay avatar o logout fuera de flujo
- [ ] navegacion usable con mouse y teclado

## Seccion IV. Dashboard

## Capitulo 7. Header y jerarquia inicial

### Tareas

- [ ] Rediseñar greeting, titulo y CTA.
- [ ] Pasar acciones a formato compacto si no caben.
- [ ] Resolver composicion en una columna para `320px`.
- [ ] Mantener una jerarquia clara entre lectura y accion.

## Capitulo 8. Metricas y tabs

### Tareas

- [ ] Reemplazar strip lineal por grid adaptativo.
- [ ] Diseñar `2x2` para `320px - 359px`.
- [ ] Diseñar `1x4` o `1xN` solo cuando el ancho lo permita.
- [ ] Rehacer tabs internas con primitive comun.
- [ ] Revisar tamanos de label, delta y numerales.

## Capitulo 9. Bloques analiticos

### Tareas

- [ ] Compactar charts.
- [ ] Rehacer secciones de conversion y rendimiento.
- [ ] Reubicar alertas de olvidados.
- [ ] Crear skeletons semanticos sin estilos en linea.

### Verificacion

- [ ] primer viewport util
- [ ] graficos legibles
- [ ] alertas visibles sin ruido excesivo

## Seccion V. Leads

## Capitulo 10. Cabecera de Leads

### Tareas

- [ ] Rediseñar header de modulo.
- [ ] Compactar boton de nuevo lead.
- [ ] Rediseñar papelera y chips de filtro especial.
- [ ] Garantizar legibilidad en una sola columna.

## Capitulo 11. Barra de busqueda y filtros

### Tareas

- [ ] Rediseñar `LeadsTableControls`.
- [ ] Convertir filtros a patron colapsable o drawer compacto.
- [ ] Priorizar busqueda y contador.
- [ ] Evitar filas de controles demasiado largas.
- [ ] Estandarizar selects e inputs del panel.

### Verificacion

- [ ] no hay overflow horizontal en controles
- [ ] filtros siguen siendo rapidos de operar

## Capitulo 12. Estrategia de tabla adaptativa

### Tareas

- [ ] Definir jerarquia de columnas: nombre, estado, contacto, fecha, listas, score.
- [ ] Definir perfil de columnas para `360px+`.
- [ ] Definir perfil de columnas para `340px - 359px`.
- [ ] Definir patron resumido para `320px - 339px`.
- [ ] Revisar seleccion multiple.
- [ ] Revisar acciones por fila.
- [ ] Revisar hover, active y focus dentro de filas.

### Entregables

- spec de prioridad de columnas
- spec de row compacta
- spec de empty state

## Capitulo 13. Formularios y detalle

### Tareas

- [ ] Rediseñar bloque de `LeadForm`.
- [ ] Rediseñar `LeadDetail`.
- [ ] Revisar modales y paneles de detalle.
- [ ] Revisar importacion y bulk actions.

### Verificacion

- [ ] formularios legibles en `320px`
- [ ] campos no se pisan
- [ ] acciones principales siempre visibles

## Seccion VI. Patrones transversales

## Capitulo 14. Estados globales

### Tareas

- [ ] Rediseñar `AppStatusScreen`.
- [ ] Rediseñar feature gates.
- [ ] Crear empty states compactos.
- [ ] Crear estados de error con tono sobrio.
- [ ] Crear estados de loading coherentes.

## Capitulo 15. Login

### Tareas

- [ ] Rediseñar `LoginPage`.
- [ ] Alinear login con el nuevo shell del panel.
- [ ] Revisar CTA de Google y disclaimers.
- [ ] Probar dark mode y foco.

## Capitulo 16. Modulos secundarios

### Tareas

- [ ] Templates
- [ ] Send
- [ ] History
- [ ] Tasks
- [ ] Settings
- [ ] Agenda
- [ ] Community
- [ ] Chat
- [ ] Admin

### Regla

Cada modulo secundario debe migrar usando primitives ya definidos. No se admiten soluciones aisladas.

## Seccion VII. Calidad y cierre

## Capitulo 17. QA visual

### Tareas

- [ ] QA en `320px`
- [ ] QA en `340px`
- [ ] QA en `360px`
- [ ] QA en `380px`
- [ ] QA en panel izquierdo
- [ ] QA en panel derecho
- [ ] QA dark mode
- [ ] QA focus keyboard
- [ ] QA overflow y clipping

## Capitulo 18. QA funcional de no regresion

### Tareas

- [ ] Navegacion entre vistas
- [ ] filtros
- [ ] seleccion multiple
- [ ] formularios
- [ ] modales
- [ ] tooltips y menus
- [ ] scroll interno
- [ ] soporte flotante

## Capitulo 19. Cutover visual

### Tareas

- [ ] retirar estilos viejos ya reemplazados
- [ ] consolidar tokens finales
- [ ] consolidar primitives finales
- [ ] documentar reglas de extension futura

## Seccion VIII. Orden recomendado de ejecucion

## Capitulo 20. Secuencia

### Sprint 1

- [ ] alcance
- [ ] auditoria
- [ ] tokens
- [ ] primitives base

### Sprint 2

- [ ] shell
- [ ] navegacion
- [ ] login
- [ ] estados globales

### Sprint 3

- [ ] dashboard
- [ ] metricas
- [ ] tabs
- [ ] skeletons

### Sprint 4

- [ ] leads header
- [ ] filtros
- [ ] tabla adaptativa
- [ ] formularios y detalle

### Sprint 5

- [ ] modulos secundarios prioritarios
- [ ] QA por ancho
- [ ] limpieza visual

### Sprint 6

- [ ] cierre
- [ ] no regresion
- [ ] consolidacion del sistema

## Seccion IX. Definicion de done por tarea

Una tarea visual se considera terminada solo si:

- [ ] existe implementacion consistente con primitives
- [ ] esta probada en `320/340/360/380`
- [ ] no rompe dark mode
- [ ] tiene focus visible
- [ ] no genera overflow no intencional
- [ ] no depende de hacks locales evitables

## Seccion X. Dependencias criticas

### Dependencias fuertes

- foundation antes de paginas
- shell antes de dashboard y leads
- estrategia de tabla antes de cerrar leads

### Dependencias blandas

- login puede resolverse despues del shell
- modulos secundarios pueden esperar a primitives maduras

## Seccion XI. Criterios de priorizacion

Priorizar siempre:

1. elementos visibles en todas las vistas
2. vistas de uso diario
3. componentes que hoy peor escalan a ancho estrecho
4. patrones reutilizables

Posponer:

1. refinamientos cosmeticos locales
2. animaciones decorativas
3. modulos secundarios no bloqueantes

## Seccion XII. Resultado esperado del roadmap

Al terminar este roadmap, `MENSAJES` debe verse como un producto concebido para side panel de Chrome, no como una app desktop comprimida, y el lenguaje LeadSeed debe sentirse integrado de forma coherente, compacta y estable.
