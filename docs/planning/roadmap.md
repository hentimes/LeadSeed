# Roadmap Operativo: PlanesPro CRM / LeadSeed

Fecha de control: 2026-08-11
Fecha de control anterior: 2026-07-22 (el roadmap estuvo 20 dias sin actualizar; ver Seccion 12)
Estado ejecutivo: base CRM, captura publica, links `pb`, agenda base, ownership por owner, realtime admin y backend del formulario ya quedaron migrados a Supabase en corte tecnico. La escalabilidad de la bandeja ya fue endurecida con indices, paginacion server-side y RPC de olvidados. El dashboard ya fue migrado a snapshot agregado server-side. Aplicando CONTROL, Cloudflare ya no ejecuta backend del formulario y queda reducido a hosting estatico y superficies editoriales de blog/noticias. El arranque del sidebar ya fue re-endurecido para quitar el splash bloqueante y el falso vacio inicial. El frente nuevo mas sensible es correo multi-canal: la arquitectura `gmail + resend` ya existe, pero Gmail como canal de envio efectivo aun sigue en validacion funcional final.

Este roadmap esta dividido en secciones, capitulos y tareas para que cualquier IA o persona pueda saber exactamente donde estamos, que se cerro, que esta en curso y que falta.

Regla de avance vigente:

- no se abre como foco principal `tareas`, `plantillas`, `grupos`, `blog/noticias` ni nuevos modulos de producto hasta cerrar la validacion end-to-end real de Google Calendar / Google Meet sobre `planespro.cl`, `/pb` y LeadSeed
- esa validacion es la puerta de salida formal del bloque actual de formulario + agenda + ownership
- en la pasada de CONTROL del lunes 20 de julio de 2026, 20:20 CLT, ya quedo evidencia real de `appointment_participants` con `invitation_status = synced` y `google_synced_at`; la fase sigue `parcial` hasta completar el checklist completo

## Leyenda

- `[COMPLETADO]`: implementado, validado tecnicamente y registrado en `AI_SYNC.md`.
- `[EN REVISION]`: implementado por una IA y pendiente de auditoria cruzada o validacion real.
- `[EN CURSO]`: tarea actualmente abierta.
- `[PENDIENTE]`: tarea aun no iniciada.
- `[PARCIAL]`: existe una base, pero falta cierre funcional o validacion real.
- `[BLOQUEADO]`: requiere decision, acceso o informacion externa.

---

## Seccion 1 - Base de Producto y Extension

### Capitulo 1.1 - MVP local original

- [COMPLETADO] Configurar React + Vite como base de la extension.
- [COMPLETADO] Crear UI inicial de leads con tabla y panel de detalle.
- [COMPLETADO] Crear persistencia local original con IndexedDB/Dexie para validar flujo.
- [COMPLETADO] Migrar el producto desde prototipo local hacia arquitectura colaborativa.

### Capitulo 1.2 - Extension Chrome y dimensiones obligatorias

- [COMPLETADO] Mantener el CRM funcionando dentro del sidebar de Chrome.
- [COMPLETADO] Mantener carga local de desarrollo compatible con Vite y extension.
- [COMPLETADO] Corregir regresion de arranque del sidebar introducida en el corte final a Supabase:
  - `AuthContext` ya no bloquea la shell esperando perfil
  - `App` ya no mezcla bootstrap visual con mantenimiento foreground
  - la tabla de leads ya no muestra `No hay leads` durante el primer fetch
- [PENDIENTE] Revisar regresion puntual de carga Vite dentro de la extension cuando el navegador funciona pero el sidebar queda en `Connecting to the Vite dev server`.
- [PENDIENTE] Crear validacion manual repetible para sidebar extension antes de cerrar cada fase visible.
- [PENDIENTE] Crear validacion equivalente para layout movil, pensando en futura app.

### Capitulo 1.3 - Reglas visuales de producto

- [COMPLETADO] Registrar en CONTROL que toda UI debe ser compacta, sidebar-first y mobile-first.
- [COMPLETADO] Registrar prohibicion de usar emoticones o emojis.
- [COMPLETADO] Registrar prohibicion de crecer con cajas blancas genericas de bordes redondeados como patron por defecto.
- [COMPLETADO] Registrar criterio visual: seguir el lenguaje compacto de LeadSeed.
- [PENDIENTE] Auditar todas las pantallas existentes contra estas reglas, no solo componentes nuevos.

---

## Seccion 2 - Backend Supabase y Modelo de Datos

### Capitulo 2.1 - Migracion base a Supabase

- [COMPLETADO] Crear backend Supabase para leads, notas, plantillas, tareas, perfiles, roles y soporte.
- [COMPLETADO] Migrar IDs y tipos principales a UUID.
- [COMPLETADO] Integrar autenticacion con Google OAuth.
- [COMPLETADO] Crear RPC de permisos SaaS `get_my_features`.
- [COMPLETADO] Crear panel admin base para planes, features y usuarios.

### Capitulo 2.2 - Seguridad y RLS

- [COMPLETADO] Detectar exposicion historica de `profiles` por policy demasiado abierta.
- [PARCIAL] Endurecer acceso a perfiles y presencia sin romper avatares ni usuarios online.
- [PENDIENTE] Auditar nuevamente policies remotas de `profiles`, `leads`, `lead_notes`, `capture_links`, soporte, templates y agenda antes de produccion amplia.
- [PENDIENTE] Documentar criterios de RLS por tipo de tabla: datos propios, datos compartidos, datos superadmin y datos publicos anonimos.

### Capitulo 2.3 - SQL, migraciones y queries historicos

- [COMPLETADO] Extraer queries sueltos del SQL Editor hacia migraciones versionadas locales.
- [COMPLETADO] Crear `sql/README.md` como guia de migraciones y seeds.
- [COMPLETADO] Aplicar migracion remota de `capture_links` mediante Supabase CLI.
- [COMPLETADO] Agregar refuerzo de indices operativos para `leads`, `lead_cross_exec_events` y `send_logs` en `038_leads_runtime_indexes.sql`.
- [PENDIENTE] Podar definitivamente SQL legacy eliminado o duplicado que queda en el arbol de trabajo.
- [PENDIENTE] Consolidar una linea unica de migraciones canonicas para reconstruir el backend desde cero.
- [PENDIENTE] Separar seeds reales, seeds de prueba y scripts de diagnostico.

### Capitulo 2.4 - Drift de datos

- [PARCIAL] El CRM ya usa Supabase como fuente principal.
- [PENDIENTE] Cerrar drift entre nombres historicos de archivos locales y modelo actual.
- [PENDIENTE] Cerrar drift entre documentacion antigua, `database.ts` historico y backend real.
- [PENDIENTE] Cerrar persistencia auxiliar que ya no debe ser fuente de verdad.

---

## Seccion 3 - Arquitectura Frontend y Refactorizacion

### Capitulo 3.1 - Fase 5 estructural

- [COMPLETADO] Dividir `src/App.tsx` y bajar responsabilidades a shell, routing y modulos.
- [COMPLETADO] Crear capas `repositories` y `services` por dominio.
- [COMPLETADO] Quitar acceso directo a `supabaseClient` desde paginas y componentes principales ya auditados.
- [COMPLETADO] Adelgazar hooks principales: `useLeads`, `useLists`, `useTemplates`, `usePresence`, `useChat`, `useSaaS`, `useTelemetry`, `useDuplicates` y auxiliares relacionados.
- [COMPLETADO] Homogeneizar dominios `admin`, `support`, `send`, `settings`, `leads`, `tasks`, `templates`, `history`, `dashboard`, `pipeline` y `community` en el alcance revisado.
- [COMPLETADO] Reducir uso de `any` en zonas criticas del alcance de fase.
- [COMPLETADO] Limpiar mojibake en bloques tocados dentro del alcance de fase.
- [COMPLETADO] Ejecutar primera pasada de performance por chunks de Vite.
- [PARCIAL] Bajar entry principal en build. El `2026-07-18` se midio `30.27 kB`, pero la medicion del
  `2026-08-11` da `94.93 kB` (gzip `26.91 kB`). El valor historico quedaba declarado como `COMPLETADO`
  y contradecia la realidad; se reclasifica. Chunks pesados actuales: `xlsx` 491 kB, `charts` 422 kB.
- [COMPLETADO] Auditoria IA-B aprobo cierre de Fase 5 el 2026-07-18.

### Capitulo 3.2 - Reglas arquitectonicas vigentes

- [COMPLETADO] Prohibir crecimiento nuevo con queries Supabase directas en UI.
- [COMPLETADO] Establecer patron UI -> service -> repository -> Supabase/RPC.
- [COMPLETADO] Mantener Supabase Realtime como fuente live, sin duplicar eventos en otra capa.
- [COMPLETADO] Establecer que Cloudflare sale progresivamente y no debe volver a ser fuente de verdad.
- [PENDIENTE] Centralizar DTOs entre frontend, Edge Functions y SQL para evitar mapeos duplicados.
- [PENDIENTE] Crear tests unitarios o de integracion por servicios criticos.

### Capitulo 3.3 - Escalabilidad de bandeja de leads

- [COMPLETADO] Detectar que la bandeja actual sigue cargando todos los leads del usuario y ordenando/filtrando en cliente.
- [COMPLETADO] Detectar que `useSendCounts` cargaba `send_logs` completos para construir badges por lead.
- [COMPLETADO] Reducir el payload de contadores de envio a solo `lead_id` y `template_type`.
- [COMPLETADO] Implementar paginacion server-side real para leads.
- [COMPLETADO] Implementar busqueda server-side por nombre, telefono, email y RUT.
- [COMPLETADO] Implementar filtros server-side por estado, lista y rango de fechas.
- [PARCIAL] Separar exportacion/importacion y chequeos de duplicados del flujo de bandeja paginada para no reintroducir cargas completas.
- [COMPLETADO] Mover `olvidados` a RPC/consulta dedicada en Supabase.
- [COMPLETADO] Eliminar carga innecesaria de identidades de leads en el primer render del sidebar.
- [COMPLETADO] Eliminar conteo redundante del primer page-load cuando no hay filtros activos.
- [COMPLETADO] Medir tiempo percibido real del primer render en extension tras los ajustes de bootstrap y bandeja.
- [PENDIENTE] Seguir endureciendo el arranque para evitar regresiones futuras al tocar `AuthContext`, `App` o la carga inicial de `LeadsPage`.

### Capitulo 3.4 - Escalabilidad de dashboard y agregados

- [COMPLETADO] Detectar que `DashboardPage` seguia agregando leads, `send_logs` y tareas desde colecciones completas en cliente.
- [COMPLETADO] Crear migracion `040_dashboard_snapshot_rpc.sql`.

### Capitulo 3.5 - Agenda publica y lectura visual de disponibilidad

- [COMPLETADO] Confirmar por auditoria remota que `general` y `pb` resuelven `owner_user_id` distintos en Supabase.
- [COMPLETADO] Confirmar por auditoria remota que las 4 horas vistas iguales en `general` y `pb` el lunes 20 de julio de 2026 correspondian a `past_time`, no a bloqueos compartidos.
- [COMPLETADO] Detectar y corregir contaminacion de contexto `pb -> general` en el runtime publico del sidebar: el formulario general ya no reutiliza `capture_ref` ni `advisor_id` persistidos fuera de `/pb`.
- [COMPLETADO] Corregir el beacon de abandono para que no borre `capture_ref`, `first_touch_ref` ni `advisor_id`, manteniendo el mismo ownership del submit real.
- [COMPLETADO] Diferenciar visualmente en el formulario publico:
  - horas pasadas en gris azulado
  - horas ocupadas/agendadas en rojizo
  - otros slots no disponibles en gris claro
- [COMPLETADO] Mantener la grilla completa del calendario sin ocultar horas pasadas.
- [COMPLETADO] Crear trigger SQL para cancelar citas activas cuando un lead se elimina por soft delete.
- [COMPLETADO] Verificar manualmente en produccion que:
  - la nueva codificacion visual se vea igual en `planespro.cl` y `/pb`
  - una cita creada desde `/pb` ya no contamine slots del formulario general
- [COMPLETADO] Recompilar y desplegar el runtime publico corregido a Cloudflare Pages produccion el lunes 20 de julio de 2026.
- [COMPLETADO] Crear RPC autenticada `get_my_dashboard_snapshot(...)` como snapshot agregado del dashboard propio.
- [COMPLETADO] Mover al snapshot server-side:
  - resumen de leads
  - olvidados
  - conteos por estado
  - adquisicion mensual
  - resumen de envios del dia y periodo de comparacion
  - resumen de tareas pendientes, vencidas, de hoy y completadas
- [COMPLETADO] Reescribir `DashboardPage` para dejar de cargar colecciones completas de leads, `send_logs` y tareas.
- [COMPLETADO] Corregir deuda tecnica puntual del dashboard y readers asociados:
  - metas diarias `0` ya no fuerzan division por `1`
  - repositorios del dashboard, historial y templates ya no silencian fallas sin `console.error`
  - efectos asincronos del detalle de lead y contadores ya no dejan `setState` sobre componentes desmontados
- [EN REVISION] Auditoria cruzada del nuevo dashboard agregado aplicando CONTROL.
- [PENDIENTE] Auditar exportaciones grandes, chequeos masivos de duplicados y analytics avanzados por link como siguientes superficies de volumen.

### Capitulo 3.4.b - Estabilidad de `Admin SaaS > Base`

- [COMPLETADO] Detectar que `Base` no estaba cayendo por React sino por dos RPCs remotas incompatibles con el esquema real.
- [COMPLETADO] Corregir `list_admin_user_templates(uuid)` para dejar de consultar `template.lista_ids`, columna inexistente en `public.templates`.
- [COMPLETADO] Corregir `list_admin_user_leads(uuid, integer)` para alinear `score integer` con `public.leads.score`.
- [COMPLETADO] Endurecer `AdminUserBase` para mostrar `message` real cuando Supabase devuelve errores no tipados como `Error`.
- [COMPLETADO] Validacion manual real en extension de la vista `Base` observada para usuarios con y sin leads.
- [COMPLETADO] Confirmar tiempo real en `Admin SaaS > Base` con la vista observada abierta usando `public.admin_lead_events`.
- [PENDIENTE] Auditar visualmente que el badge del usuario observado baje a cero sin residuo cuando el lead entra con `Base` abierta.

---

## Seccion 4 - Captura Publica PlanesPro

### Capitulo 4.1 - Formulario general de planespro.cl

- [COMPLETADO] Redirigir captura del formulario general hacia Supabase.
- [COMPLETADO] Aterrizar leads organicos/directos en la cuenta central `planespro.cl@gmail.com`.
- [COMPLETADO] Guardar metadata de origen: `source_system`, `source_channel`, `source_path`, `source_url`, `source_hostname`, `source_form_variant`.
- [COMPLETADO] Preservar `fuente_cta` y `source_cta` para saber desde que CTA se abrio el formulario general.
- [COMPLETADO] Evitar que el formulario general herede `capture_ref`, `first_touch_ref` o `advisor_id` del flujo `pb`.
- [COMPLETADO] Validar smoke de `lead-capture` en `landing-gerow`.
- [EN REVISION] IA-B aprobo el bloque de formulario general y UI de capture links el 2026-07-18; queda como base para agenda.

### Capitulo 4.2 - Formulario pb por asesor

- [COMPLETADO] Confirmar que `pb` existe como flujo separado de publicacion por asesor.
- [COMPLETADO] Definir que cada link `pb` resuelve owner por `capture_ref`.
- [COMPLETADO] Mantener separado el formulario general de `planespro.cl` y el formulario `pb`.
- [COMPLETADO] Definir que `pb` es una ruta y un formulario independiente para ejecutivos externos.
- [COMPLETADO] Definir que `pb` debe abrir directo el formulario, no la landing principal de `planespro.cl`.
- [COMPLETADO] Definir que el formulario general original de `planespro.cl` no debe modificarse para hacer funcionar `pb`.
- [COMPLETADO] El `2026-07-19` se valido tecnicamente que `https://form.planespro.cl/api/public/availability` responde `source=supabase` y `source_channel=pb` con `capture_link_id` real para un `ref` existente.
- [COMPLETADO] El `2026-07-19` se corrigio la publicacion publica de `pb` en `landing-gerow`: `https://planespro.cl/pb/styles.css` ya responde `text/css` y `https://planespro.cl/pb/app.js` ya responde `application/javascript`.
- [COMPLETADO] El `2026-07-19` se corrigio el submit branded `https://form.planespro.cl/api/form/leads` para que el flujo `pb` delegue la captura real a Supabase en vez de persistir en D1 local.
- [COMPLETADO] El `2026-07-19` se valido un flujo real `pb` end-to-end con `ref=pp-e6efca41f40449c0adde9f65b3219f02`: el lead `47fc28fe-826a-40a3-ae35-cc02ae957f6e` y la cita `5d34f131-aac5-4a9d-9e2c-a690370440f0` quedaron creados en Supabase con `source_channel=pb`, `capture_link_id=3` y owner `e6efca41-f404-49c0-adde-9f65b3219f02`.
- [COMPLETADO] El `2026-07-19` se valido que el slot `2026-07-20 09:00` deja de aparecer libre en la disponibilidad publica `pb` despues de la captura real.
- [COMPLETADO] Evitar que el runtime publico siga promoviendo `advisor_id` o atribucion almacenada fuera de `/pb` cuando el flujo real es `general`.
- [PARCIAL] La reserva, ownership y bloqueo de horario `pb` ya quedaron validados; sigue pendiente validar el mismo flujo con un owner que tenga Google Calendar conectado para confirmar Meet y sync `ok` en vez de `error`.
- [COMPLETADO] Reemplazar en el runtime publico los endpoints crudos `https://pfoikdneixbvpozbtqcx.supabase.co/functions/v1` por una frontera branded/configurable:
  - `frontend/lead-capture/js/app.js` ya usa `publicApiBaseUrl`
  - `frontend/lead-capture/js/sidebar-runtime.js` ya resuelve `https://form.planespro.cl/api`
  - `pb/index.html` ya publica meta tag `planespro-form-api-base`
  - `_headers` ya alinea `connect-src` y `form-action` al dominio branded
  - smoke tests del borde publico ya quedaron actualizados y en verde
- [PENDIENTE] Limpiar mojibake residual en `frontend/lead-capture`, `pb` y assets derivados del formulario publico.

### Capitulo 4.3 - Archivos PDF

- [COMPLETADO] Subir PDFs a Supabase Storage.
- [COMPLETADO] Servir PDFs desde Edge Function protegida para la extension.
- [COMPLETADO] Permitir abrir PDF inline en navegador desde detalle de lead.
- [COMPLETADO] Agregar boton de descarga con nombre legible.
- [COMPLETADO] Usar nomenclatura trazable para nuevos PDFs.
- [PENDIENTE] Auditar archivos historicos con UUID crudo y definir si se renombran, se migran o se dejan como legado.
- [PENDIENTE] Verificar en produccion que la descarga preserve siempre `Content-Disposition` con nombre amigable en todos los navegadores objetivo.

### Capitulo 4.4 - Edicion de lead capturado

- [COMPLETADO] Evitar perdida de metadata del formulario al editar campos como empleador o RUT.
- [COMPLETADO] Formatear y validar RUT desde el sidebar de LeadSeed.
- [COMPLETADO] Separar visualmente adjunto PDF y comentario en la ficha del lead.
- [COMPLETADO] Mostrar fecha de ingreso.
- [COMPLETADO] Evitar mostrar fecha de actualizacion como dato redundante si no hubo actualizacion real.
- [PARCIAL] El `2026-07-19` el usuario valido con prueba real que la captura general de `planespro.cl` vuelve a entrar en LeadSeed; siguen pendientes validaciones reales equivalentes para `pb`, carga manual e importacion.

---

## Seccion 5 - Capture Links, Campanas y Analitica

### Capitulo 5.1 - Backend de links de publicacion

- [COMPLETADO] Crear migracion `024_capture_links_management_rpcs.sql`.
- [COMPLETADO] Crear columna `deleted_at` en `capture_links`.
- [COMPLETADO] Crear policies para leer, crear y actualizar links propios.
- [COMPLETADO] Crear RPCs autenticadas: `list_my_capture_links`, `create_my_capture_link`, `update_my_capture_link`, `deactivate_my_capture_link`, `get_my_capture_link_stats`.
- [COMPLETADO] Crear backfill idempotente de link principal para perfiles sin link.
- [COMPLETADO] Aplicar migracion en Supabase remoto.
- [COMPLETADO] Validar owner, limite y stats desde SQL.
- [COMPLETADO] IA-B aprobo la migracion el 2026-07-18.

### Capitulo 5.2 - UI compacta de links

- [COMPLETADO] Crear `captureLinksRepository`.
- [COMPLETADO] Crear `captureLinksService`.
- [COMPLETADO] Crear `CaptureLinksSettings`.
- [COMPLETADO] Agregar tab `Links` en settings.
- [COMPLETADO] Permitir listar links propios.
- [COMPLETADO] Permitir crear link con nombre y campana.
- [COMPLETADO] Permitir editar nombre, campana y estado.
- [COMPLETADO] Permitir marcar link principal.
- [COMPLETADO] Permitir desactivar links no principales.
- [COMPLETADO] Copiar URL publica corta `https://planespro.cl/pb/<short_code>`.
- [COMPLETADO] Migrar `capture_links.ref_code` a codigos cortos de 6 caracteres en Supabase, preservando el ref historico en `metadata.legacy_ref_code`.
- [COMPLETADO] Publicar rewrite para que `/pb/<short_code>` resuelva al formulario PB sin query string visible.
- [COMPLETADO] Mostrar leads, cierres, tasa de cierre y cortes analiticos basicos.
- [COMPLETADO] IA-B aprobo UI compacta el 2026-07-18.
- [PENDIENTE] Validacion manual en extension con usuario real.

### Capitulo 5.3 - Analitica configurable por link

- [PARCIAL] Backend ya expone lectura por atributos del lead: edad, renta, region, sistema de salud e isapre.
- [PENDIENTE] Incluir cargas y edades de cargas como cortes analiticos.
- [PENDIENTE] Incluir comentarios cuando existan, con criterio de privacidad y utilidad.
- [PENDIENTE] Crear panel configurable para elegir que parametros evaluar.
- [PENDIENTE] Definir agrupaciones por rango de edad, rango de renta, region, comuna, Fonasa/Isapre, isapre especifica, cargas y estado comercial.
- [PENDIENTE] Definir exportacion o vista comparativa de campanas.

---

## Seccion 6 - Multi-captura, Duplicados y Alertas Cruzadas

### Capitulo 6.1 - Reglas de negocio

- [COMPLETADO] Definir que la funcionalidad informa, no bloquea.
- [COMPLETADO] Definir que no se revela identidad del otro ejecutivo.
- [COMPLETADO] Definir coincidencia por telefono, email y RUT.
- [COMPLETADO] Definir que RUT puede disparar reevaluacion posterior si se agrega manualmente.
- [COMPLETADO] Definir reciprocidad por preferencia: quien desactiva no avisa y tampoco recibe avisos.
- [COMPLETADO] Definir que aplica a leads capturados, manuales e importados.
- [COMPLETADO] Definir que manuales/importados no entran a analitica de campana salvo asignacion explicita futura.

### Capitulo 6.2 - Implementacion

- [PARCIAL] Existe base de deteccion/duplicados local en `useDuplicates` y servicios relacionados.
- [PENDIENTE] Crear o consolidar tablas/RPCs para alertas cruzadas multi-ejecutivo.
- [PENDIENTE] Crear preferencia por usuario para activar/desactivar alertas reciprocas.
- [PENDIENTE] Recalcular coincidencias al crear lead desde formulario general, `pb`, importacion, carga manual y edicion de RUT.
- [PENDIENTE] Priorizar leads con alerta reciente al abrir bandeja de leads.
- [PENDIENTE] Mostrar alerta discreta en detalle del lead con fecha y contexto minimo.
- [PENDIENTE] Validar privacidad: sin revelar nombre, correo ni ID del otro ejecutivo.

---

## Seccion 7 - Agenda y Disponibilidad en Supabase

### Capitulo 7.1 - Estado actual

- [COMPLETADO] `landing-gerow` ya tiene logica de disponibilidad publica en Cloudflare auditada como referencia legacy.
- [COMPLETADO] La disponibilidad actual considera reglas base, bloqueos manuales, citas CRM y Google Calendar desde Supabase.
- [COMPLETADO] Auditar codigo actual de Cloudflare y LeadSeed antes de crear nuevas tablas.
- [COMPLETADO] Confirmar que Supabase remoto ya tenia `appointments`, `user_availability` y `user_availability_overrides`.
- [COMPLETADO] Confirmar que la agenda remota previa solo tenia `get_available_slots(p_user_id, p_start_date, p_days)`, sin resolucion por `ref`.
- [COMPLETADO] Confirmar que `submit_planespro_public_lead` guardaba `scheduled_at` y metadata, pero no creaba fila en `appointments`.
- [COMPLETADO] LeadSeed ya tiene fundacion Supabase de agenda, frontend publico conectado y UI interna compacta.

### Capitulo 7.2 - Modelo Supabase de agenda

- [COMPLETADO] Crear migracion `025_planespro_agenda_supabase_foundation.sql`.
- [COMPLETADO] Extender `appointments` con timezone, canal, capture link, duracion, buffer y metadata.
- [COMPLETADO] Crear `user_calendar_settings` para zona horaria, duracion de cita, buffer y booking publico.
- [COMPLETADO] Crear `user_calendar_connections` como frontera de Google Calendar administrada por backend, sin lectura directa de UI.
- [COMPLETADO] Crear `user_availability_blocks` para bloqueos manuales o de sistema.
- [COMPLETADO] Crear indice unico `appointments_user_start_active_idx` para evitar doble reserva del mismo inicio activo.
- [COMPLETADO] Crear RPC `resolve_planespro_booking_context(...)`.
- [COMPLETADO] Crear RPC `get_planespro_public_available_slots(...)`.
- [COMPLETADO] Crear RPC `create_planespro_appointment_for_lead(...)`.
- [COMPLETADO] Crear parser `parse_planespro_local_datetime(...)` para no desplazar horas locales de Chile.
- [COMPLETADO] Actualizar `submit_planespro_public_lead(...)` para crear appointment cuando el formulario trae cita.
- [COMPLETADO] Crear migracion `026_planespro_agenda_public_rpc_volatility_fix.sql` para que PostgREST ejecute availability sin transaccion read-only.
- [COMPLETADO] Definir RLS base para settings, blocks y conexiones antes de exponer UI interna.
- [COMPLETADO] Crear RPC autenticada de gestion de disponibilidad y bloqueos del usuario para LeadSeed.
- [COMPLETADO] Crear DTOs frontend para el contrato interno de agenda.

### Capitulo 7.3 - Disponibilidad publica

- [COMPLETADO] Resolver contexto de booking por `capture_ref` cuando existe link `pb`.
- [COMPLETADO] Resolver disponibilidad general contra cuenta central `planespro.cl@gmail.com` o fallback admin.
- [COMPLETADO] Combinar disponibilidad base, bloqueos manuales y citas LeadSeed.
- [COMPLETADO] Evitar doble reserva del mismo inicio activo mediante indice unico.
- [COMPLETADO] Devolver slots con contrato compatible para `planespro.cl`: `slots` y `slot_grid`.
- [COMPLETADO] Mantener dominio visible branded mediante `https://form.planespro.cl/api/public/availability`.
- [COMPLETADO] Desplegar Worker `ppforms` version `63bf2dea-140f-403a-98a5-fa38deda008e` con proxy Supabase de availability.
- [COMPLETADO] Validar produccion: `source=supabase`, sin fallback, 12 slots para `2026-07-20`.
- [COMPLETADO] Integrar ocupacion Google Calendar en Supabase mediante bloqueos `google` desde FreeBusy.

### Capitulo 7.4 - Creacion y gestion de citas

- [COMPLETADO] Insertar cita al enviar formulario con fecha/hora desde `submit_planespro_public_lead`.
- [COMPLETADO] Asociar cita con lead, owner, capture link y source channel.
- [COMPLETADO] Bloquear hora inmediatamente despues de crear cita mediante fila en `appointments` e indice activo.
- [COMPLETADO] Permitir reprogramar cita desde LeadSeed actualizando Supabase primero.
- [COMPLETADO] Replicar reprogramacion hacia Google Calendar cuando exista `google_event_id`.
- [COMPLETADO] Permitir cancelar cita desde LeadSeed actualizando Supabase primero.
- [COMPLETADO] Replicar cancelacion hacia Google Calendar cuando exista `google_event_id`.
- [COMPLETADO] Permitir crear una cita desde el detalle del cliente en LeadSeed.
- [COMPLETADO] Replicar la cita creada desde detalle hacia Google Calendar/Meet cuando exista conexion Google.
- [COMPLETADO] Liberar slot en disponibilidad publica al pasar cita a `cancelada` o `rechazada`.
- [COMPLETADO] Ampliar estados: pendiente, agendada, confirmada, tentativa, cancelada, rechazada, completada, no_asistio.
- [COMPLETADO] Crear historial/auditoria visible de cambios de cita.
- [COMPLETADO] Definir reglas de invitacion al lead: el cliente con email valido queda como participante automatico de la cita.
- [COMPLETADO] Permitir agregar participantes a una cita desde LeadSeed.
- [COMPLETADO] Permitir quitar participantes de una cita desde LeadSeed.
- [COMPLETADO] Replicar participantes hacia Google Calendar como invitados del evento cuando exista `google_event_id`.
- [COMPLETADO] Agregar automaticamente el lead capturado como participante `lead` para que reciba invitacion y recordatorios de Google Calendar.
- [COMPLETADO] Mantener accion explicita solo para participantes terceros agregados por el asesor desde LeadSeed.
- [COMPLETADO] Definir copy operativo cuando Google falla pero Supabase ya bloqueo la cita.

### Capitulo 7.5 - UI de agenda en LeadSeed

- [COMPLETADO] Crear vista compacta inicial de agenda para sidebar dentro de Ajustes.
- [COMPLETADO] Separar Agenda operativa como seccion propia fuera de Ajustes.
- [COMPLETADO] Dejar Ajustes solo para configuracion de agenda: duracion, horarios, bloqueos, conexion y sincronizacion.
- [COMPLETADO] Crear gestion de disponibilidad semanal por usuario.
- [COMPLETADO] Crear gestion de bloqueos manuales.
- [COMPLETADO] Mostrar citas vinculadas a leads en proximos dias.
- [COMPLETADO] Separar citas activas y canceladas en la vista operativa.
- [COMPLETADO] Ocultar formularios de participantes y acciones en citas canceladas.
- [COMPLETADO] Permitir abrir ficha de lead desde Agenda mediante enlace a `Leads`.
- [COMPLETADO] Mostrar boton de acceso a Meet cuando la cita ya tiene `meet_link`.
- [COMPLETADO] Mostrar alerta compacta cuando una cita esta dentro de las proximas 2 horas.
- [COMPLETADO] Mostrar estado compacto si la replica Google de una cita quedo pendiente/error.
- [COMPLETADO] Agregar formulario compacto para agendar desde el detalle del cliente.
- [COMPLETADO] Advertir al eliminar un lead con cita activa y cancelar esa cita antes de moverlo a papelera o borrarlo definitivamente.
- [COMPLETADO] Mostrar acceso a Meet y boton `Gestionar cita` desde el detalle del lead cuando existe cita activa.
- [COMPLETADO] Evitar patrones visuales pesados o tarjetas genericas en el primer corte.

---

## Seccion 8 - Supervision Admin de Usuarios, Leads y Agenda

### Capitulo 8.1 - Regla de producto

- [COMPLETADO] Definir que el superadmin si puede observar leads y agenda de otros usuarios desde `Admin SaaS > Usuarios y mensajes`.
- [COMPLETADO] Definir que esa observacion no puede mezclar ni contaminar la agenda operativa propia del superadmin.
- [COMPLETADO] Definir que la agenda principal del superadmin sigue siendo la agenda owner `general` de `planespro.cl`.
- [COMPLETADO] Definir que la agenda de usuarios observados solo se consulta dentro del perfil admin del usuario.

### Capitulo 8.2 - Alertas de leads nuevos por usuario observado

- [EN REVISION] Crear estado persistente de supervision por par `admin -> usuario observado`.
- [EN REVISION] Crear RPC admin-only para listar contador de leads nuevos por usuario observado.
- [EN REVISION] Crear RPC admin-only para marcar esos leads como vistos al abrir `Base`.
- [EN REVISION] Mostrar badge de leads nuevos en la fila del usuario dentro de `Usuarios`.
- [EN REVISION] Mostrar badge equivalente en la pestana `Base` del usuario seleccionado.
- [EN REVISION] Recargar esos contadores en tiempo real cuando entren leads nuevos.
- [EN REVISION] Inyectar el lead nuevo en vivo dentro de `Base` si el superadmin ya esta observando a ese usuario.
- [EN REVISION] Mantener la suscripcion admin como canal estable, sin recrearla por cambio de tab/usuario, y forzar rehidratacion inmediata de `Base` al entrar un lead del usuario observado.
- [EN REVISION] Usar feed realtime admin-dedicado en Supabase para leads observados (`admin_lead_events`), en vez de depender de `public.leads` para datos ajenos visibles solo por RPC.

### Capitulo 8.3 - Agenda observada del usuario

- [EN REVISION] Crear RPC admin-only para listar citas del usuario observado sin reutilizar `list_my_appointments(...)` del superadmin.
- [EN REVISION] Agregar pestana `Agenda` junto a `Base` dentro de `AdminUsersPage`.
- [EN REVISION] Renderizar agenda observada en modo solo lectura.
- [EN REVISION] Mostrar fecha, estado, lead, canal y Meet si existe.
- [EN REVISION] Mostrar estado de replica Google cuando aplique.
- [EN REVISION] Prohibir desde esa vista reprogramar, cancelar, crear, bloquear o sincronizar.

### Capitulo 8.4 - Aislamiento obligatorio

- [EN REVISION] Garantizar por contrato backend que la agenda observada via admin no modifica slots ni citas.
- [PENDIENTE] Validar que la agenda propia del superadmin no incorpore citas ni bloqueos de usuarios observados.
- [PENDIENTE] Validar que `planespro.cl` siga usando solo la agenda owner `general`.
- [PENDIENTE] Validar que `pb` siga usando solo la agenda del owner del `capture_ref`.
- [PARCIAL] Validar responsive movil: estructura, historial y tabs son compactos, falta prueba visual manual en extension/movil.

### Capitulo 7.6 - Google Calendar

- [COMPLETADO] Login ya solicita permisos de Google Calendar.
- [COMPLETADO] Definir almacenamiento seguro de tokens mediante Edge Function con service role y tabla sin lectura directa de UI.
- [COMPLETADO] Exponer solo estado no sensible de conexion con `get_my_calendar_connection_status()`.
- [COMPLETADO] Capturar `provider_token` y `provider_refresh_token` desde login OAuth cuando Supabase los entregue.
- [COMPLETADO] Sincronizar ocupacion real desde Google Calendar usando FreeBusy sin leer detalles privados de eventos.
- [COMPLETADO] Crear evento Google Calendar desde cita Supabase como replica externa no bloqueante.
- [COMPLETADO] Guardar link Meet cuando Google lo entregue en la respuesta de `Events Insert`.
- [COMPLETADO] Actualizar evento Google al reprogramar desde LeadSeed.
- [COMPLETADO] Cancelar/eliminar evento Google al cancelar desde LeadSeed.
- [COMPLETADO] Exponer en UI compacta estados Google mas fieles al backend:
  - `LeadDetail` y `AgendaPage` ya distinguen `pending`, `error`, `skipped` y `synced`
  - la agenda ya muestra `invitationStatus` de participantes
- [COMPLETADO] Confirmar con evidencia real de base que el lead automatico puede quedar sincronizado como invitado Google:
  - lectura via `supabase db query --linked` sobre `public.appointment_participants`
  - evidencia observada con `google_synced_at` real en owners `general`, `pb` y usuario adicional
- [PENDIENTE] Definir si un rechazo/cancelacion originado desde Google debe modificar Supabase o solo alertar.
- [PENDIENTE] Implementar sync inverso de cambios Google si se decide que Google pueda modificar estado en Supabase.
- [COMPLETADO] Documentar fallback tecnico si Google Calendar falla: la agenda Supabase/manual sigue funcionando y Google queda como replica externa no bloqueante.
- [PENDIENTE] Validar end-to-end real como puerta de salida de fase:
  - `planespro.cl` crea lead + cita + evento Google/Meet del owner `general`
  - `/pb` crea lead + cita + evento Google/Meet del owner del `capture_ref`
  - reprogramar desde LeadSeed actualiza Google Calendar
  - cancelar desde LeadSeed libera slot y cancela/elimina evento Google
  - participantes agregados o removidos desde LeadSeed se replican en Google Calendar

---

## Seccion 8 - Dominio Branded y Retiro Progresivo de Cloudflare

### Capitulo 8.1 - Principio de arquitectura

- [COMPLETADO] Definir Supabase como backend destino y fuente de verdad.
- [COMPLETADO] Definir Cloudflare como capa transitoria en retirada.
- [COMPLETADO] Definir que el dominio visible debe ser `planespro.cl` o subdominios branded.
- [COMPLETADO] Confirmar que usar dominio branded no debe degradar Supabase Realtime si solo se usa como proxy/API para flujos publicos.

### Capitulo 8.2 - Endpoints publicos

- [COMPLETADO] Captura de leads, disponibilidad publica, abandono y lectura canonica de adjuntos ya quedaron resueltos en Supabase como backend operativo.
- [COMPLETADO] Crear frontera branded para submit y retirar URLs crudas de Supabase en flujos visibles.
- [COMPLETADO] Crear frontera branded para descarga/visualizacion de archivos cuando aplique.
- [COMPLETADO] Migrar disponibilidad publica desde Cloudflare hacia Supabase con fallback legado.
- [COMPLETADO] Migrar definitivamente `lead-abandoned` a Supabase y retirar su logica de negocio de `ppforms`.
- [COMPLETADO] Servir la frontera canonica de disponibilidad publica desde `supabase/functions/form-public-availability`.
- [COMPLETADO] Retirar del CRM el proxy `form.planespro.cl/api/private/form-lead-file` y leer el adjunto desde `supabase/functions/form-lead-file`.
- [COMPLETADO] Retirar endpoints Cloudflare obsoletos de `ppcrm` y `ppusers`, dejandolos en `410`.
- [COMPLETADO] Retirar runtime operativo de `ppforms` y dejar solo stub legacy `health`/`410`.
- [COMPLETADO] Podar bindings/config operativos del formulario en `ppcrm`, `ppusers` y `ppforms`.
- [COMPLETADO] Mantener compatibilidad temporal sin romper `planespro.cl` durante la transicion.
  Cloudflare ya no ejecuta negocio del formulario; queda solo como hosting estatico y capa editorial pendiente de blog/noticias.
- [PENDIENTE] Publicar/deployar este corte si produccion remota aun expone assets o workers viejos.

### Capitulo 8.3 - Realtime

- [COMPLETADO] Mantener Supabase Realtime como canal live del CRM.
- [PENDIENTE] Auditar suscripciones live despues de agenda para asegurar que no hay doble fuente de eventos.
- [PENDIENTE] Medir impacto de dominio branded en latencia percibida de formularios, sin confundirlo con Realtime.

### Capitulo 8.4 - Correo transaccional y plantillas

- [COMPLETADO] Mover el envio Resend de la extension fuera del navegador hacia una Edge Function central `send-email`.
- [COMPLETADO] Retirar `https://api.resend.com/*` de permisos directos de la extension.
- [COMPLETADO] Eliminar la dependencia de `profiles.resend_api_key` y migrar el secreto a Supabase Secrets.
- [COMPLETADO] Alinear `form-leads` al mismo criterio seguro de correo backend-only.
- [PENDIENTE] Validar extremo a extremo el envio real de correos desde la extension usando `send-email`.
- [PENDIENTE] Validar extremo a extremo correos transaccionales de cita desde `planespro.cl` y `/pb`.
- [PENDIENTE] Decidir retiro total de `emailjs` como legacy una vez validado Resend central.

---

## Seccion 9 - Blog, Noticias y Dashboard Editorial

### Capitulo 9.1 - Estado actual

- [PARCIAL] `landing-gerow` conserva dashboard editorial historico para noticias y blog.
- [COMPLETADO] Definir que blog y noticias no se migran todavia en el primer corte de formularios/leads/agenda.
- [COMPLETADO] Auditar modelo actual de noticias y blog en `landing-gerow`.
- [COMPLETADO] Identificar Blog actual: Worker `ppblog`, D1 `ppblog_db`, R2 `ppblog-uploads`, rutas publicas `blog.planespro.cl` y frontend `/blog/` + `/blog/:slug/`.
- [COMPLETADO] Identificar Noticias actual: Worker `ppnews`, D1 `ppnews_db`, R2 `ppnews-thumbnails`, cron de recoleccion, rutas publicas `news.planespro.cl` y frontend de home/noticias.
- [COMPLETADO] Identificar dependencia admin historica: ambos Workers validan admin via `ppusers` / `admin.planespro.cl`.
- [PENDIENTE] Decidir si dashboard editorial queda federado temporalmente o migra completo a LeadSeed.

### Capitulo 9.2 - Migracion futura

- [PENDIENTE] Definir tablas Supabase para posts, categorias, tags, autores, media, estados, SEO y publicaciones.
- [PENDIENTE] Definir tablas Supabase para noticias, fuentes, ejecuciones de recoleccion, estados editoriales, thumbnails y snapshots/cache publico.
- [PENDIENTE] Crear Edge Functions Supabase o RPCs para API publica de blog/noticias manteniendo contratos compatibles con `js/blog.js` y `js/index-news-blog.js`.
- [PENDIENTE] Crear admin editorial compacto si se integra en LeadSeed, con permisos superadmin/editor/helper.
- [PENDIENTE] Mantener SEO y URLs existentes de `planespro.cl`.
- [PENDIENTE] Migrar media desde R2 a Supabase Storage o definir una etapa puente si se mantiene R2 temporalmente.
- [PENDIENTE] Migrar datos desde D1 (`posts`, `categories`, `tags`, `post_tags`, `news_items`, `news_sources`, `news_runs`, `cache_snapshots`) hacia Supabase.
- [PENDIENTE] Desactivar Cloudflare como fuente de verdad solo despues de validar paridad publica, admin y SEO.

---

## Seccion 10 - Growth, Admin y Marketplace

### Capitulo 10.1 - Admin y usuarios

- [COMPLETADO] Crear base de roles, perfiles, helpers y superadmin.
- [COMPLETADO] Crear panel admin de usuarios y soporte en primer corte.
- [PENDIENTE] Crear CRM interno de listas de usuarios para superadmin/helpers.
- [PENDIENTE] Diferenciar formalmente `lists` de usuarios vs `lead_lists` de leads.
- [PENDIENTE] Crear panel para agrupar usuarios en listas: vendedores, helpers, amigos u otros grupos internos.

### Capitulo 10.2 - Growth interno

- [PENDIENTE] Crear gestor de anuncios o pop-ups.
- [PENDIENTE] Crear banners dinamicos nativos en sidebar.
- [PENDIENTE] Crear promociones temporales globales.
- [PENDIENTE] Crear comunicaciones segmentadas por lista de usuarios.

### Capitulo 10.3 - Marketplace de leads

- [PENDIENTE] Bolsa interna de leads.
- [PENDIENTE] Filtros de subasta con metadata parcial.
- [PENDIENTE] Motor realtime de pujas y ofertas.
- [PENDIENTE] Transferencia automatizada de propiedad del lead.

---

## Seccion 11 - Calidad, CONTROL y Coordinacion entre IAs

### Capitulo 11.1 - CONTROL

- [COMPLETADO] Crear protocolo CONTROL como metodologia obligatoria.
- [COMPLETADO] Registrar que `avanza`, `continua` o `sigue` activan CONTROL automaticamente.
- [COMPLETADO] Registrar que roadmap y plan deben actualizarse ante requerimientos nuevos.
- [COMPLETADO] Registrar que tareas finalizadas deben pasar a auditoria cruzada.
- [COMPLETADO] Registrar que la otra IA debe auditar el trabajo terminado aplicando CONTROL.
- [PENDIENTE] Auditar si `PROTOCOLO_CONTROL.md`, `AI_SYNC.md` y este roadmap siguen totalmente alineados despues de la fase de agenda.

### Capitulo 11.2 - AI_SYNC

- [COMPLETADO] Crear `AI_SYNC.md` como canal vivo entre IAs.
- [COMPLETADO] Establecer reservas activas antes de editar.
- [COMPLETADO] Establecer handoff con validaciones y riesgos.
- [COMPLETADO] Establecer que el implementador actualiza la rama y el auditor valida.
- [COMPLETADO] Limpiar mojibake historico que habia quedado en entradas antiguas del sync sin perder trazabilidad.
- [COMPLETADO] Mover la base observada del superadmin a RPC admin-only para no depender de `select` directo sobre `leads` y `templates`.
- [COMPLETADO] Corregir el runtime lateral publico para que no elimine `capture_ref`, `first_touch_ref` ni `advisor_id` antes de enviar a Supabase.
- [COMPLETADO] Re-publicar `landing-gerow` con el runtime lateral corregido para que el fix llegue a `planespro.cl`.

### Capitulo 11.3 - Validacion tecnica recurrente

- [COMPLETADO] Usar `npm run build` como validacion minima del frontend.
- [COMPLETADO] Usar `git diff --check` como validacion de whitespace.
- [COMPLETADO] Usar `rg` para detectar mojibake, `!important`, emojis y accesos directos prohibidos.
- [PENDIENTE] Crear scripts automatizados para checks CONTROL.
- [PENDIENTE] Agregar pruebas E2E de flujos criticos: captura general, `pb`, agenda, PDF, edicion de lead y links.

---

## Punto exacto actual

Estamos dentro de Fase 6, en el cierre del ciclo completo de citas. Lo completado permite que:

- el formulario general de `planespro.cl` cree leads en LeadSeed para la cuenta central
- los links `pb` existan como canal separado por asesor y como formulario independiente para ejecutivos externos
- cada usuario gestione links de publicacion en primer corte
- los PDFs se suban, se vean y se descarguen con nombres trazables en leads nuevos
- la arquitectura de LeadSeed ya no siga creciendo desde UI acoplada a Supabase
- la disponibilidad publica consulte Supabase detras de `form.planespro.cl`
- una cita tomada desde formulario bloquee el slot de inmediato en Supabase
- Google Calendar aporte bloqueos externos por FreeBusy solo cuando el usuario sincroniza
- una cita creada en Supabase intente replicarse a Google Calendar y Meet sin bloquear la captura
- LeadSeed muestre Meet y avisos proximos cuando esos datos existen
- un asesor cree una cita nueva desde el detalle del cliente, bloqueando el horario en Supabase e intentando crear evento Google/Meet
- el `2026-07-19` quedo validado con prueba real de usuario que la captura general desde `planespro.cl` vuelve a entrar en LeadSeed
- el `2026-07-19` quedo validado tecnicamente que la disponibilidad branded responde desde Supabase tanto para canal `general` como para canal `pb`
- el `2026-07-19` quedo corregido un bug de frontend `pb` que truncaba `ref_code` largos y provocaba fallback silencioso a la agenda general
- el `2026-07-19` quedo validado con comparacion directa que `general` y `pb` ya exponen bloqueos distintos por owner
- el `2026-07-19` quedo validado con submit productivo real que un lead `pb` nuevo y su cita ya se asignan al owner del link, con `capture_link_id` correcto y Google Calendar sincronizado
- el `2026-07-19` quedo corregido en LeadSeed que la bandeja principal lea solo leads propios y no todos los leads visibles por policy admin
- el `2026-07-19` quedo cerrado el incidente de clientes `pb` cacheados:
  - `ppforms` recupera el `ref` completo desde `referer` para disponibilidad publica
  - Supabase recupera el `ref` completo desde `source_url` para ownership de lead y cita aunque el body venga truncado
  - validacion final de regresion:
    - antes del parche SQL: `lead_id=c29745f5-6448-4d2f-99e1-a275077b54b3` quedaba en superadmin
    - despues del parche SQL: `lead_id=f5f4eafa-c989-44c4-aed7-f74307146995`, `appointment_id=55eb11fa-0014-47c0-82fa-4408ecafb6db`, `capture_link_id=1`, `assigned_user_id=03b16aa2-27a9-4183-849f-182762678892`
- el `2026-07-19` quedo completada la limpieza historica del mismo incidente:
  - migracion/version operativa: `sql/migrations/037_repair_historical_pb_owner_assignments.sql`
  - `5` leads historicos `pb` mal asignados fueron corregidos al owner real del link
  - `5` citas historicas asociadas fueron corregidas al owner real del link
  - como las 5 citas ya estaban `cancelada`, se limpiaron referencias Google erradas:
    - `google_event_id = null`
    - `meet_link = null`
    - `google_sync_status = 'skipped'`
    - `google_sync_error = 'historical_pb_owner_repair'`
- el `2026-07-20` se corrigio una regresion adicional del cierre Cloudflare -> Supabase:
  - `Admin SaaS > Base` ya no debe depender de lecturas cliente sujetas a RLS para observar leads y plantillas de otros usuarios
  - el runtime lateral publico ya no borra ownership PB antes del submit
  - `user_availability_blocks` quedo auditada y hoy esta vacia; el incidente actual no proviene de bloqueos manuales fantasma
  - las citas activas vivas en base hoy pertenecen solo a owners PB y no a la agenda `general`

La siguiente fase concreta es:

1. Validar manualmente con extension recargada que `Admin SaaS > Usuarios y mensajes > Base` ya muestra los leads del usuario observado y no solo su agenda.
2. Validar manualmente que `Base` del usuario observado se alimenta en tiempo real:
   - si la base ya esta abierta, el lead debe aparecer sin refresh
   - si no esta abierta, solo debe subir el badge del usuario observado
3. Validar manualmente desde navegador normal que el formulario principal de `planespro.cl` no hereda ownership PB ni muestra bloqueos de otro owner.
4. Validar manualmente desde `/pb` que un lead nuevo y su cita siguen cayendo en la bandeja y agenda del owner del link.
5. Validar manualmente con usuario real conectado que una cita publica crea evento Google y Meet visible en LeadSeed.
6. Validar manualmente que una cita creada desde detalle crea evento Google/Meet o deja Google pendiente sin perder la cita Supabase.
7. Validar manualmente que reprogramar cita desde LeadSeed actualiza Google Calendar.
8. Validar manualmente que cancelar cita desde LeadSeed elimina o cancela el evento Google y libera el slot publico.
9. Validar manualmente que agregar y quitar participantes desde LeadSeed actualiza invitados en Google Calendar.
10. Validar manualmente el historial visible de citas en sidebar real de extension.
11. Auditar una anomalia de datos historicos: existen citas `general` antiguas con `capture_ref` poblado y debe confirmarse si son residuo de pruebas previas o un arrastre de contexto no deseado.
12. Auditar exportacion/importacion/duplicados y analytics por link para decidir el siguiente corte de performance despues del dashboard.
13. Solo despues retomar Fase 7 Blog/Noticias.

## Actualizacion 2026-07-21 - Canales de correo por usuario

### Capitulo 11.4 - Correo multi-tenant en Supabase

- [COMPLETADO] Crear `public.user_email_channels` para guardar credenciales por usuario fuera del navegador.
- [COMPLETADO] Cifrar credenciales con `EMAIL_CHANNELS_MASTER_KEY` desde edge functions compartidas.
- [COMPLETADO] Crear `supabase/functions/email-channels` para CRUD autenticado de canales del usuario.
- [COMPLETADO] Migrar `supabase/functions/send-email` para resolver el canal activo del usuario en vez de una key central compartida.
- [COMPLETADO] Migrar `supabase/functions/form-leads` para resolver el canal del owner real y mantener fallback temporal de sistema.
- [COMPLETADO] Rehacer `Ajustes > Email` para soportar multiples API keys de Resend por usuario.
- [COMPLETADO] Compactar `Ajustes > Email` a una bandeja unificada de canales con filas cortas, menu por canal y alta bajo demanda.
- [COMPLETADO] Integrar `Gmail` como canal OAuth visible en la misma bandeja de canales.
- [COMPLETADO] Agregar selector compacto `Canal remitente` en `Enviar Mensajes` para override por envio.
- [COMPLETADO] Reescribir `send-email` para devolver `200` con detalle funcional por destinatario y no romper el cliente por `207`.
- [PARCIAL] Corregir la resolucion del canal elegido en `Enviar Mensajes`; el codigo ya fue ajustado, pero sigue pendiente validacion funcional final del flujo Gmail.
- [PARCIAL] Mantener `emailjs` como compatibilidad temporal mientras termina la salida total del correo legacy.

### Punto exacto despues de este corte

- la arquitectura ya soporta canales por usuario en Supabase
- el navegador ya no expone secretos privados de Resend
- el deploy remoto ya incluye:
  - migracion `050_user_email_channels`
  - function `email-channels`
  - redeploy de `send-email`
  - redeploy de `form-leads`
- el canal Gmail ya puede quedar conectado por OAuth en `Ajustes > Email`
- la validacion que queda ya no es de arquitectura, sino operativa:
  - confirmar envio real por `Resend` desde `Enviar Mensajes`
  - confirmar envio real por `Gmail` desde `Enviar Mensajes`
  - confirmar que `Canal remitente` fuerza el canal elegido y no el canal activo global
  - confirmar que formularios/citas usan el canal correcto del owner cuando corresponda

## Actualizacion 2026-07-21 - Entitlements SaaS

### Capitulo 4.6 - Modularidad comercial y activacion por plan

- [COMPLETADO] Corregir el contrato base de entitlements para que `get_my_features()` retorne `feature_id` y no nombres visuales.
- [COMPLETADO] Normalizar el gating del sidebar a `module:*` para dashboard, pipeline y tareas.
- [COMPLETADO] Refrescar funcionalidades del usuario en realtime cuando cambian `profiles.plan_id`, `user_feature_overrides` o `plan_features`.
- [COMPLETADO] Corregir `Licencias` para diferenciar modulo heredado por plan vs override manual vs trial temporal.
- [COMPLETADO] Agregar asignaciones rapidas de trial por `15`, `30` y `60` dias en la vista individual.
- [PENDIENTE] Implementar asignacion masiva de modulos para usuarios seleccionados.
- [PENDIENTE] Implementar asignacion de modulos a listas de usuarios.
- [PENDIENTE] Crear editor comercial completo para que superadmin gestione nuevas funcionalidades, planes y vigencias desde una sola superficie.

### Punto exacto tras este corte

- el problema ya no esta en Cloudflare ni en Supabase como plataforma
- el problema raiz estaba en la capa SaaS local de LeadSeed:
  - RPC inconsistente
  - gating inconsistente
  - sesion sin refresco de entitlements
- con este corte queda resuelto en arquitectura y codigo el acceso individual por plan/override
- sigue pendiente validar manualmente que la experiencia visual final coincida en:
  - superadmin
  - usuario objetivo
  - editor de planes

### Capitulo 11.5 - Proveedores de correo por perfil

- [COMPLETADO] Definir que `planespro.cl` queda reservado para correos oficiales del sistema y del dominio principal.
- [COMPLETADO] Definir que `Resend` aplica solo a usuarios con dominio propio o subdominio propio verificado.
- [COMPLETADO] Definir que un usuario con Google Workspace sobre dominio propio si puede usar Resend con ese dominio.
- [COMPLETADO] Definir que cuentas personales `gmail.com`, `hotmail.com` y similares no deben pasar por Resend como remitente.
- [COMPLETADO] Definir que el login con Google solo sirve para prellenar identidad; el envio por Gmail requiere consentimiento y scope de envio aparte.
- [COMPLETADO] Definir que `Gmail` queda como proveedor por defecto para usuarios comunes y `Resend` como opcion avanzada.
- [COMPLETADO] Definir que cada usuario puede registrar multiples cuentas `Gmail` y multiples canales `Resend`.
- [COMPLETADO] Definir que las plantillas no quedan ligadas a proveedor ni a remitente especifico.
- [COMPLETADO] Definir que la seleccion de proveedor/canal ocurre al `Enviar ahora` o `Programar envio`, no al crear la plantilla.
- [COMPLETADO] Compactar `Ajustes > Email` a filas cortas con edicion expandible, alineadas al lenguaje del sidebar.
- [COMPLETADO] Compactar `Ajustes > Email` a una tabla unica de canales:
  - Gmail y APIs comparten el mismo listado
  - cada fila usa punto de estado, tags cortos y menu de 3 puntos
  - la activacion del canal vive en la fila y no en un bloque global separado
- [COMPLETADO] Sembrar el feature comercial `pro:multiple_email_channels`.
- [COMPLETADO] Aplicar limite comercial de canales de correo:
  - `1` por defecto
  - `6` con `pro:multiple_email_channels`
- [COMPLETADO] Endurecer la edge function `email-channels` para que el limite no dependa solo del frontend.
- [COMPLETADO] Implementar canal `Gmail` por OAuth/API para usuarios con correo Gmail personal o Workspace que prefieran enviar desde su inbox real.
  - existe conexion OAuth compacta desde `Ajustes > Email`
  - el consentimiento `gmail.send` ya queda persistido en Supabase
- [PARCIAL] Validar `Gmail` como canal efectivo de envio desde `Enviar Mensajes`.
  - sigue abierto porque el usuario reporto error funcional en envio real
  - tambien queda pendiente confirmar que el override por envio no haga fallback silencioso al canal activo global
- [PENDIENTE] Implementar canal `Outlook` por OAuth/API para usuarios con Hotmail, Outlook o Microsoft 365.
- [COMPLETADO] Permitir seleccionar proveedor/canal por envio o programacion, con precarga desde canal principal del usuario.
- [COMPLETADO] Evolucionar `Ajustes > Email` hacia una bandeja unificada de canales `gmail` + `resend`.
- [COMPLETADO] Aplanar la UI de `Ajustes > Email` para evitar cajas altas y configuracion duplicada.
  - `Agregar` concentra alta de Gmail/API
  - la activacion se resuelve desde el menu de cada fila
  - el override `Canal remitente` en `Enviar` queda como control compacto, no como bloque principal
- [PENDIENTE] Implementar estado `requiere reconexion` cuando el usuario cambie el remitente Gmail a una cuenta distinta de la ya autorizada.

---

## Punto exacto actual al 2026-07-22

Lo ya consolidado:

- `planespro.cl` captura en Supabase y asigna leads organicos al owner general
- `/pb` captura en Supabase y asigna leads/citas al owner real del link
- la separacion de ownership entre agenda general y agenda `pb` ya quedo reparada
- `Admin SaaS > Base` ya ve y recibe en tiempo real los leads de usuarios observados
- la arquitectura de correo ya soporta bandeja unificada `gmail + resend`
- `Ajustes > Email` ya fue compactado a filas cortas compatibles con sidebar
- `Enviar Mensajes` ya expone `Canal remitente` compacto

Lo que sigue parcial y no debe maquillarse como cerrado:

- validacion E2E completa de Google Calendar / Meet
- validacion funcional final del envio real por Gmail
- validacion funcional final de override por canal en `Enviar Mensajes`
- retiro o encapsulamiento final de `emailjs`

Lo que no deberia abrirse como foco principal antes de cerrar este frente:

- tareas operativas como modulo principal
- plantillas funcionales avanzadas
- grupos/listas complejas de usuarios
- migracion editorial completa de blog/noticias

---

## Checkpoint operativo para rediseño visual

### Estado del checkpoint

- checkpoint funcional actual: `feature/ui-refactor-compact`
- este punto debe tratarse como base de rediseño, no como rama para rehacer backend

### Objetivo de la siguiente IA

- rediseñar la extension sin alterar contratos backend ni reabrir bugs ya cerrados en:
  - ownership
  - agenda
  - realtime admin
  - correo multi-canal

### Lo que puede rediseñarse

- shell del sidebar
- layout general de vistas
- densidad visual
- componentes de leads
- componentes de agenda
- componentes de settings
- componentes admin
- jerarquía visual de `Enviar Mensajes`

### Lo que queda protegido y no debe tocarse salvo bug funcional documentado

- `sql/migrations/*`
- `supabase/functions/*`
- `src/services/*`
- `src/repositories/*`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useLeads.ts`
- `src/hooks/useLeadFilters.ts`
- `src/hooks/useSendCounts.ts`
- `src/utils/emailSender.ts`
- `src/services/sendService.ts`
- `src/services/adminService.ts`
- `src/services/leadsService.ts`
- `src/utils/appointmentStatusCopy.ts`

### Riesgos que el rediseño no puede reintroducir

- volver a cargar toda la app en el arranque con splash bloqueante
- volver a mostrar `No hay leads` antes de terminar el primer fetch real
- volver a mezclar agenda `general` con agenda `pb`
- volver a romper `Admin SaaS > Base` o su tiempo real
- volver a acoplar plantillas a un proveedor fijo de correo
- volver a guardar secretos de correo en frontend
- volver a meter queries directas de Supabase en pantallas por comodidad

### Regla de trabajo para la otra IA

- cada bloque visual que toque debe reservarse antes en `AI_SYNC.md`
- debe declarar explícitamente:
  - qué archivos visuales toca
  - qué archivos protegidos no va a tocar
  - cómo validó que no rompió backend ni realtime

### Cierre correcto del checkpoint

Antes de considerar exitoso el rediseño:

- `npm run build` debe seguir en verde
- no debe romperse:
  - captura `planespro.cl`
  - captura `pb`
  - detalle de lead
  - agenda
  - `Admin SaaS > Base`
  - `Enviar Mensajes`

---

## Seccion 12 - Actualizacion 2026-08-11: modulos construidos y no registrados

Origen: `docs/auditorias/AUDITORIA_CONTROL_2026-08-11.md`.

Entre el `2026-07-22` y el `2026-08-08` se construyeron modulos completos que nunca entraron a este
roadmap, incumpliendo las reglas 8.4, 8.5 y 8.6 del protocolo. Se registran aqui con su estado real.

Constancia obligatoria segun regla 5.1: esta apertura de frente se hizo contra la regla de avance
vigente del roadmap, que condicionaba abrir nuevos modulos de producto al cierre de la validacion
end-to-end de Google Calendar y Meet. Esa validacion sigue abierta. La desviacion queda declarada, no
justificada retroactivamente: la decision de si el frente de comunidad/chat era prioritario sobre el
cierre de agenda corresponde al usuario.

### Capitulo 12.1 - Chat, sala y comunidad

Base: commits `22e1a3a`, `e4e3f5a`, `cd70955`.

- [EN REVISION] Sala de chat con menciones e integrantes.
- [EN REVISION] Comunidad como foro.
- [EN REVISION] Moderacion de sala.
- [EN REVISION] Mensajes directos propios.
- [EN REVISION] Adjuntos en el chat.
- [EN REVISION] Correccion de colision de canal realtime al abrir el chat con DMs sin leer.
- [HECHO] Borrado admin de mensajes de chat, commit `8fd5f3e`. Migraciones
  `sql/migrations/095_chat_message_admin_delete.sql` y su espejo. Este item decia "no estan
  commiteados" y contradecia al capitulo 13.1, que ya declaraba el commit; corregido el `2026-08-12`.
- [PENDIENTE] Dividir `src/components/chat/ChatRoom.tsx`: 1097 lineas, ~30 `useState`, ~680 lineas de
  JSX. Es el archivo de mayor riesgo de mantenibilidad del repositorio.
- [HECHO] Resuelto el bloqueo sobre `EmojiPicker.tsx`. El usuario definio el `2026-08-12` la frontera
  exacta de la prohibicion, incorporada al protocolo como precision `10.1.a`: la regla aplica a todo
  emoji escrito en codigo, y no aplica a emojis que el usuario final elige y envia como contenido de
  un mensaje. `src/components/chat/EmojiPicker.tsx` queda como **excepcion legitima** y se mantiene.
- [HECHO] Retirado el centinela con emoji de `ChatRoom.tsx`. Se resolvio al extraer
  `usePendingAttachment`: la huella anti-spam paso a `buildAttachmentFingerprint`, con prefijo ASCII
  y un test que verifica que no contenga emojis. **Ya no queda ningun emoji en el codigo fuera del
  selector del chat**, verificado sobre todo `src/`.

### Capitulo 12.2 - Tipos de formulario y canales de captura

Base: commits `9e60aae`, `f04729f`, `a351b59`.

- [PENDIENTE] (hallado el `2026-08-15` al cuantificar 13.4.d) **El canal `general` no atribuye a
  nadie, y nunca lo ha hecho.** Contados los leads con `origin = web_form` y su link de captura:

  | canal | leads | con link |
  |---|---|---|
  | `general` (/form) | 78 | **0** |
  | `pb` | 60 | 51 (84%) |
  | `retiro` | 6 | 6 (100%) |

  Cero, no pocos, y en los tres tramos: antes, durante y despues de la ventana de la regresion del
  ref. Asi que **no es secuela de aquel incidente**, es propio del formulario `/form`, y llevaba ahi
  desde el principio sin que nadie lo notara porque el panel no mostraba atribucion real.

  Antes de arreglarlo hay que decidir una cosa que no es tecnica: si `/form` **debe** atribuir. Es el
  formulario general, y puede que su diseño sea justamente no pertenecer a ningun asesor. Si es asi,
  el pendiente no es el codigo sino dejarlo escrito, porque hoy se lee como un fallo.

- [EN REVISION] Canal `retiro` con `source_channel` y funnel de visitas, paso 1 y paso 2.
- [EN REVISION] Registro generico de tipos de formulario (`form_types`) que admite `form`.
- [EN REVISION] Dejar de usar `Referer` como fallback de `ref` en disponibilidad publica.
- [PENDIENTE] Cerrar el hueco de normalizacion de canal: `resolve_planespro_booking_context` solo
  acepta `pb`, `general` y `retiro`. El formulario `/form/` envia `source_channel: "form"`, que sin un
  ref valido cae silenciosamente como `general`. La migracion `20260806000300` registro `form` en
  `form_types` pero no lo agrego a la normalizacion.
- [PENDIENTE] Hacer que `form-progress` valide `form_slug` contra `form_types` en vez de un allowlist
  hardcodeado. Hoy agregar un tipo de formulario desde la extension no habilita su telemetria.
- [PENDIENTE] Corregir la atribucion de canal en el proxy `ppforms`, que fuerza `pb` para cualquier
  request con ref y usa `Referer` como fuente de canal, contradiciendo el fix `a351b59` aguas abajo.

### Capitulo 12.3 - Rediseno de Enviar y Secuencias

Base: commit `c59432d`.

- [EN REVISION] Rediseno de Enviar sobre el sistema visual del Dashboard.
- [PENDIENTE] Registrar el alcance real del modulo Secuencias, mencionado en `AI_SYNC.md` pero sin
  capitulo propio en este roadmap.

---

## Seccion 13 - Actualizacion 2026-08-11: hallazgos de auditoria CONTROL

Origen: `docs/auditorias/AUDITORIA_CONTROL_2026-08-11.md`. Cada capitulo corresponde a un bloque del plan de accion.

### Capitulo 13.1 - Contencion inmediata (bloque 0)

Ejecutado el `2026-08-12`. Estado del bloque: `parcial`, pendiente de commit y de la limpieza en
`landing-gerow`.

Evidencia de Nivel 1 obtenida antes de actuar (`npx supabase functions list`, 2026-08-12), que
confirmo la hipotesis de la auditoria en vez de asumirla:

```
form-leads  v23  ACTIVE
entrypoint_path: .../landing-gerow/supabase/functions/form-leads/index.ts
```

- [HECHO] Doble fuente de verdad de `supabase/functions/form-leads/index.ts`, **cerrada del todo el
  `2026-08-12`**: source y propiedad del deploy.

  Historia del item, porque ilustra un patron de error: estuvo marcado `[HECHO]` cuando solo se habia
  adoptado el source. La segunda auditoria lo detecto: la funcion desplegada seguia registrada a
  nombre de `landing-gerow`, asi que un deploy desde alla podia sobrescribir produccion, y
  `npm run check:functions` fallaba por ese motivo. Adoptar el codigo y adoptar la propiedad del
  despliegue son dos cosas distintas y se trataron como una.

  Cerrado en dos pasos, que resuelven cosas distintas:

  1. Redespliegue desde este repo. Cambia el registro de titularidad: `form-leads` v23 -> v24, con el
     entrypoint ya sin apuntar a `landing-gerow`. Neutro en contenido, verificado byte a byte con
     `functions download` antes de ejecutarlo.
  2. Borrado de `supabase/` en `landing-gerow`. Es lo que de verdad elimina el riesgo: mientras esa
     carpeta existiera, cualquiera podia volver a pisar la funcion. Se agrego alli un check de CI que
     falla si reaparece.

  Verificado archivo por archivo antes de borrar, para no perder nada: `form-leads` identico,
  `emailChannels.ts` superset en este repo, y la migracion `20260803000100` integra en nuestra
  reconciliacion `20260812000100`.

  Se trabajo en un worktree aislado desde `origin/master`, dejando intacta la copia de trabajo de
  `landing-gerow` con sus 1368 archivos sin commitear, comprobado despues.

  Validacion en produccion tras el deploy automatico de Pages: home, `/pb/<code>`, `/form/<code>`,
  `/retiro-tecnico-extranjero/<code>`, blog y biblioteca en `200`; la captura de leads respondiendo
  con validacion (`400 name is required`, no `500`); y `npm run check:functions` reportando **12
  funciones desplegadas, sin deriva**.

- [HECHO] Verificado que `_shared/emailChannels.ts` **no requiere merge**: la version de este repo es
  superset (381 vs 332 lineas) y `form-leads` solo importa `resolveUserEmailChannel`, presente aca.
- [HECHO] Creada la migracion de reconciliacion
  `supabase/migrations/20260812000100_reconcile_form_lead_two_phase_submit.sql` (espejo en
  `sql/migrations/096_...`), con timestamp nuevo e idempotente, conteniendo
  `leads_form_submission_id_uidx`, `update_planespro_public_lead_action` y
  `submit_planespro_idempotent_public_lead`. Impacto nulo en produccion; su valor es que un
  `supabase db reset` desde este repo reconstruya el esquema completo.
- [HECHO] Reescrito `supabase/functions/README.md` con la regla vigente: **todas las Edge Functions se
  despliegan solo desde LeadSeed**. Documenta el incidente y su evidencia.
- [HECHO] Renumerada `sql/migrations/090_chat_message_admin_delete.sql` a `095_...`, cerrando la
  colision de numero. Queda solo la colision historica `036`, anterior a esta pasada.
- [HECHO] Commiteado el bloque completo, incluido el borrado admin de chat (commit `8fd5f3e`).
- [HECHO] `form-progress` adoptada. No se copio de `landing-gerow` sino que se obtuvo con
  `supabase functions download`, es decir el codigo realmente desplegado. Fue la decision correcta:
  el HEAD commiteado de ese repo tenia una version vieja que, al redesplegarse, habria desactivado en
  silencio el tracking de `retiro-v2` y de seis tipos de evento. **Las doce Edge Functions viven ahora
  en este repo.**
- [HECHO] Eliminados `supabase/functions/` y `supabase/migrations/` de `landing-gerow`. **Verificado
  el `2026-08-14` contra `origin/master`: la carpeta no existe.** El item seguia marcado como
  bloqueado por el estado del arbol de trabajo de ese repo, pero el borrado se hizo desde un
  `git worktree` limpio sobre `origin/master`, que es justo la via que ese bloqueo describia como
  necesaria. El desorden del arbol principal sigue ahi y sigue siendo un problema, pero no impedia
  esto.
- [HECHO] Check de CI puesto: `.github/workflows/no-supabase-functions.yml` en `origin/master` de
  `landing-gerow`. Falla el build si reaparece la carpeta, en push a `master` y en cualquier pull
  request, y el mensaje de error apunta a donde viven de verdad las funciones. Verificado leyendo el
  fichero en `origin/master`, no asumido.

Validacion ejecutada: `npm run build` en verde (14.03s). Conteo de migraciones consistente: 98 en
`sql/migrations/` y 98 en `supabase/migrations/`.

### Capitulo 13.1.b - Decisiones de arquitectura del 2026-08-12

Definidas por el usuario. No deben reabrirse sin evidencia tecnica nueva.

**Decision 1 - Hosting de los formularios.** El codigo fuente y el pipeline de build de los
formularios se mueven a LeadSeed, pero **la URL publica no cambia**. Se implementa con un proyecto
Cloudflare Pages separado mas rewrite a nivel de path:

```
planespro.cl/pb/*      -> rewrite -> proyecto "leadseed-forms"
planespro.cl/form/*    -> rewrite -> proyecto "leadseed-forms"
planespro.cl/retiro-*  -> rewrite -> proyecto "leadseed-forms"
resto de planespro.cl  -> proyecto "planespro" (landing-gerow, sin cambios)
```

Motivo: los short links `planespro.cl/pb/<code>` ya estan distribuidos y son el mecanismo de
atribucion por asesor. Cambiar esas URLs romperia atribucion comercial ya en circulacion. Con este
modelo los dos repos dejan de compartir dueño sobre los mismos archivos, que es la raiz del incidente
de `form-leads`.

Corolario: el formulario sidebar largo de `landing-gerow` puede seguir conectado indefinidamente. El
acoplamiento con LeadSeed no es de codigo sino de contrato HTTP contra `form-leads`, asi que cualquier
formulario en cualquier repo o dominio sigue funcionando sin cambios. Esto habilita migracion gradual
en vez de un corte unico.

**Decision 2 - Destino movil: Expo + React Native.** Motivo decisivo: el nucleo reutilizable
(`types`, `repositories`, `services`, `utils`) es TypeScript, y Expo lo conserva y lo comparte con la
extension desde el mismo paquete. Flutter obligaria a descartarlo. Los nueve puertos de plataforma
identificados en el capitulo 13.6 tienen implementacion directa en Expo (`expo-auth-session`,
`expo-notifications`, `setBadgeCountAsync`, `expo-task-manager`, `Linking`, EAS Update); ninguno queda
huerfano.

Se descarta Capacitor: envolveria la UI actual, optimizada para sidebar angosto, y arrastraria intacto
el acoplamiento al DOM.

Consecuencias registradas: `xlsx` y `recharts` no cruzan a React Native y requieren sustituto o quedan
como funcionalidad solo-escritorio.

**Alcance de Cloudflare, precision del 2026-08-12.** Cloudflare no se retira como plataforma. Se
retira solo como **fuente de verdad de datos de negocio**. Permanece como hosting estatico, CDN, DNS y
WAF de `planespro.cl`, que es el uso correcto: biblioteca, centros de salud, farmacias, blog y
noticias son contenido SEO estatico sin dependencia de LeadSeed. `farmacias/` usa ademas
`caches.default` y `AbortController` con timeout contra la API de MINSAL, y esta bien resuelto. La
redaccion previa del roadmap ("Cloudflare sale") era ambigua e inducia decisiones equivocadas.

### Capitulo 13.1.d - Decisiones de arquitectura de alertas (cerradas el `2026-07-30`)

Rescatadas de `HANDOFF_NEXT_SESSION.md` al eliminarlo el `2026-08-13`. Eran el unico sitio donde
estaban escritas y siguen vigentes: se verifico una por una contra el codigo actual antes de moverlas.

- **Supabase es la fuente de verdad de las alertas.** La alerta nace de la persistencia final del
  lead, no de un paso intermedio.
- **Cloudflare queda fuera de la cadena de alertas.** Ni Workers nuevos, ni badge, ni deduplicacion,
  ni feed de eventos.
- **Realtime es el mecanismo primario; `chrome.alarms` a 30s solo reconcilia.** Se descarto el sondeo
  a 3 segundos con la extension cerrada porque MV3 no lo garantiza, y 30s es el minimo util que
  ofrece la API. Sigue siendo asi: `background.ts` lo documenta en su cabecera.
- **No se reutiliza `public.admin_lead_events` para alertas personales.** Pertenece al dominio de
  supervision y su semantica no corresponde a la alerta del owner. Por eso existe
  `public.user_lead_alert_events`.
- **`src/background.ts` es un orquestador, no un archivo omnibus.** La logica de alertas vive en
  modulos dedicados, hoy en `src/platform/backgroundLeadAlerts.ts` y `backgroundAgendaAlerts.ts`.

Lo que **no** se rescato: ese documento declaraba comunidad, foro y chat como "fuera del alcance
actual". Los tres se construyeron despues, asi que esa parte estaba contradicha por el codigo. Era
justo el motivo por el que el documento resultaba peligroso en la raiz del repositorio: cualquier
sesion nueva lo leia como vigente.

### Capitulo 13.1.c - Restriccion de no regresion (2026-08-12)

Definida por el usuario tras aprobar la auditoria: *"La version actual de LeadSeed me gusta como se ve
y lo que hemos avanzado, procura que no se pierda ninguna funcionalidad. Que solo sean mejoras."*

Esta restriccion es **vinculante para todos los bloques restantes** y tiene precedencia sobre la
conveniencia tecnica de cualquier refactor propuesto en la Seccion 13.

Reglas operativas derivadas:

- todo bloque de refactor se ejecuta como cambio que **preserva comportamiento y apariencia**. Un
  refactor que "de paso" cambia como se ve o como se comporta una pantalla no es un refactor, es un
  rediseno no autorizado
- ninguna funcionalidad existente se retira sin decision explicita del usuario, ni siquiera si la
  auditoria la marca como deuda
- los bloques 6 (division de archivos) y 7 (sistema visual) son los de mayor riesgo de regresion y no
  se abren hasta que el bloque 2 este cerrado
- antes de tocar una superficie visual hay que confirmar con el usuario si el cambio altera lo que se
  ve, **aunque una norma interna lo justifique**

Tension declarada, no resuelta: la regla 10.1 del protocolo prohibe el patron de caja blanca
redondeada, y el capitulo 13.8 propone barrerlo de Listas, Plantillas, Pipeline e Historial. Ese
barrido **si cambia como se ven esas pantallas**. Las dos normas no pueden cumplirse a la vez en esas
superficies.

Criterio de resolucion adoptado: el capitulo 13.8 deja de ser un barrido masivo y pasa a ejecutarse
**superficie por superficie, con aprobacion previa del usuario para cada una**. Mientras no haya esa
aprobacion, la restriccion de no regresion gana y la pantalla se queda como esta. Los sub-items de
13.8 que no alteran apariencia (unificar primitivas duplicadas, tokenizar colores literales por su
equivalente exacto, corregir el foco y el contraste) si pueden ejecutarse sin aprobacion por
superficie, porque su resultado visual es identico o estrictamente mejor.

### Capitulo 13.2 - Alineacion de git (bloque 1)

Historial verificado como lineal: `master` es ancestro directo de `develop`. No hay divergencia, solo
retraso.

- [HECHO] Pusheados los commits pendientes de `develop`.
- [HECHO] `master` avanzada hasta `develop` por fast-forward.
- [HECHO] `design` resuelta: se mantiene viva y sincronizada con `develop`, por decision del usuario
  del `2026-08-12`. Las tres ramas quedaron en el mismo commit.

  Nota de registro: estos tres items se ejecutaron el `2026-08-12` y quedaron sin marcar hasta el
  `2026-08-12` por descuido de bookkeeping. Se deja constancia porque es la misma deriva documental
  que la auditoria senalo como hallazgo estructural; el roadmap solo sirve si refleja el estado real.

- [RESUELTO DE OTRA FORMA] (`2026-08-14`) **Esa rama no debe mergearse**, y el item la daba por
  pendiente de merge sin haber mirado su contenido.

  Al abrirla: lleva **8 dias parada**, master la adelanto por **63 commits**, y de sus 48 archivos la
  mayoria son versiones viejas de cosas que master ya tiene mas nuevas. Peor: **reintroduce
  `supabase/functions/form-progress/`**, que master retiro a proposito el 12 de agosto y que ahora
  haria fallar el check `no-supabase-functions.yml` del bloque 0. Su fix de las Pages Functions ya
  esta en master, aplicado directamente durante el incidente del ref.

  Lo unico suyo que produccion no tiene resulto ser concreto y pequeño: **el formulario `/pb` no
  reporta nada a `form-progress`**. Master no tiene ni una llamada, asi que el embudo de ese canal
  esta ciego. El de retiro si reporta.

  Recuperado en `feat/pb-visit-tracking` (ya publicada en `landing-gerow`): 2 archivos, 81
  inserciones, **cero eliminaciones**. Solo `pb/app.js` y un smoke test que pasa.

  No se trajo el segundo test de la rama: espera una regla en `_redirects` que ella misma anadia, y
  se comprobo contra produccion que no hace falta. `/pb/:ref`, `/form/:ref` y
  `/retiro-tecnico-extranjero/:ref` devuelven **200 con cero redirecciones y el ref intacto** solo con
  el arreglo de la Function. Incluirlo habria dejado un test en rojo permanente.

  **Queda pendiente de tu decision el merge de `feat/pb-visit-tracking` a `master`**, porque un push
  a esa rama despliega automaticamente todo `planespro.cl`.

### Capitulo 13.3 - Red de seguridad (bloque 2, prerrequisito)

Estado del bloque al `2026-08-12`: `parcial`. Los cuatro gates existen y estan en verde.

- [HECHO] Cobertura de los seis modulos de dominio priorizados por riesgo. 193 tests.
  `tokenizeSearch`, `rutNormalizer`, `mentionParser`, `importParser`, `smartLists` y el mapeo de
  `leadsService`, mas los puertos de plataforma y los helpers de soporte que aparecieron en el
  camino.

  Los tres ultimos cubren reglas de negocio que nunca habian tenido red: la fusion de nombre y
  apellidos y de RUT con DV al importar, la deteccion de duplicados comparando telefonos con formatos
  distintos, la clasificacion por sistema de salud y rango etario, y el mapeo fila-a-dominio, donde
  se fijo por test una distincion sutil que era facil de romper: los campos de texto caen a cadena
  vacia porque la UI los pinta directo, pero los de fecha caen a `undefined` porque se comparan con
  `Date.parse` y una cadena vacia daria `NaN`.
- [HECHO] ESLint instalado con reglas de frontera. Politica de severidad deliberada: **`error` queda
  reservado exclusivamente para violaciones de frontera arquitectonica**; toda la deuda de calidad
  entra como `warning`. El motivo es que un CI que falla por 106 problemas heterogeneos no se lee, se
  desactiva. Con esta separacion un CI rojo significa siempre lo mismo y es grave: alguien cruzo una
  capa.
  - Frontera 1: el cliente Supabase solo en `repositories/`.
  - Frontera 2: la capa de dominio no importa de `components/` ni `pages/`.
  - Frontera 3 (la que mas importa para movil): `confirm`, `alert` y `prompt` prohibidos en
    `services`, `repositories`, `hooks`, `utils` y `config`. Estas reglas son el contrato de
    portabilidad a Expo escrito en forma verificable.
  - Estado al cierre del bloque: `0 errores, 212 warnings`.
- [HECHO] Ratchet de deuda de frontera preexistente. Las violaciones que ya existian quedan marcadas
  con `eslint-disable` y el comentario `DEUDA 13.x` que apunta al capitulo donde se corrigen, en vez
  de corregirse en el mismo paso: tocar `useRealtimeRefresh` arrastra `useLeads`, `useLists` y
  `useTemplates`, y la restriccion 13.1.c tiene precedencia. Resultado: CI verde, deuda contable con
  `grep -rn "DEUDA 13" src` (hoy 5 marcas), y ningun codigo nuevo puede agregar una violacion mas.
  - `useLeadsPageController.ts`: nueve `confirm()`/`alert()` (13.6)
  - `useAgenda.ts`: un `confirm()` (13.6)
  - `useRealtimeRefresh.ts`: importa el cliente Supabase (13.4)
  - `appSettings.ts` y `leadColumns.ts`: inversion de dependencia hacia `components/` (13.4)
- [HECHO] `xlsx` pinneado a `0.20.3`. Apuntaba a `xlsx-latest.tgz`, sin version: el build no era
  reproducible y un `npm ci` en CI podia traer otra version. Verificado que el hash del chunk
  resultante no cambia, asi que el bundle es identico.
- [HECHO] CI en `.github/workflows/ci.yml` con lint, typecheck, tests y build, sobre `master`,
  `develop` y `design`, con cancelacion de corridas superadas.
- [HECHO] Scripts `lint`, `lint:fix`, `test`, `test:watch`, `test:coverage` y `typecheck`. Campo
  `engines` fijado en Node 20 o superior.
- [HECHO] `tsconfig.json` endurecido el `2026-08-12`: `noUnusedLocals` y `noUnusedParameters`
  activadas, `paths` para el alias `@` que existia en Vite pero TypeScript no resolvia, y
  `tsconfig.node.json` para que `vite.config`, `vitest.config` y `eslint.config` tambien se
  typecheveen.

  Afloraron 73 errores, todos codigo muerto: 37 imports huerfanos, 34 props y parametros que los
  componentes recibian sin usar, y 5 declaraciones enteras sin consumidor.

- [HECHO] (`2026-08-13`) **`noUncheckedIndexedAccess` activada.** Los 124 errores resueltos uno por
  uno. El criterio: afirmar solo donde el propio codigo prueba que el indice existe (cota del bucle,
  longitud ya comprobada) y manejar de verdad donde la ausencia es posible. Nunca un `?? valor`
  inventado, que es lo que la version anterior de este item temia con razon.

  En la mayoria de los casos no hizo falta afirmar nada, solo escribirlo mejor: `entries()` en vez de
  indice suelto, tomar la referencia una vez en vez de indexar seis veces por fila, guardar el objeto
  en el `Map` en lugar de su posicion, y claves literales en vez de `Record<string, T>`.

  Tres defectos reales que la regla destapo:
  - un Excel **sin hojas** pasaba `undefined` a `sheet_to_json` y salia por el catch como "Excel
    invalido", que no distingue un formato roto de un archivo vacio
  - un adjunto cuyo data URL no tuviera coma se agregaba al correo con contenido `undefined`
  - `LeadsTable` y `LeadsPage` reinsertaban el resultado de un `splice` sin comprobar que hubiera
    sacado algo

- [DESCARTADA] **`exactOptionalPropertyTypes` no se activa**, y esta vez con las pruebas delante en
  vez de por precaucion: se encendio, se miraron los **70** errores (no 68) y la conclusion es que la
  regla no compra nada aqui.

  El motivo es concreto. Los mapeadores de fila a dominio escriben `campo: row.columna || undefined`
  a proposito, unas veinte veces por mapeador. Con la regla activa solo hay dos salidas: declarar
  `campo?: string | undefined` en cada tipo, que **silencia la regla sin ganar seguridad**, o emitir
  la clave condicionalmente con spread, que multiplica el ruido para una distincion que este codigo
  no usa: nada lee esas propiedades comprobando presencia de clave, todas las leen con `||` o `??`.

  Se marca como decision cerrada y no como pendiente, para que nadie la reabra sin argumento nuevo.
- [PARCIAL] Reducir los warnings. **De ~212 a 116** al `2026-08-14`.

  Cerrados por completo: los 20 mecanicos (ternarios usados como sentencia, dobles aserciones no
  nulas, variables con un valor inicial que nadie lee) y **22 de los 27 `no-explicit-any`**. Ninguno
  era ruido: los `catch (err: any)` con `err.message` no leian los errores de supabase-js, que son
  objetos planos; el icono del cajon de navegacion estaba tipado como dato cuando es una funcion que
  devuelve el nodo; y al tipar los callbacks de Recharts salio que tres graficos leian `payload[0]`
  sin comprobar que existiera.

  Tambien los dos casos del patron "corregir un indice fuera de rango desde un efecto", que se
  calcula durante el render y ahorra un repintado en cada cambio de lista.

  **Los 116 que quedan son casi todos de `react-hooks`, y no se pueden cerrar con este bloque.**
  Clasificados los 52 `set-state-in-effect` uno por uno:

  | Familia | Cuantos | Que haria falta |
  |---|---|---|
  | Carga de datos asincrona | 11 | una capa de estado servidor; es el item de TanStack Query de 13.6 |
  | Sincronizar con una prop | 7 | un `key` en el padre o derivar; toca los componentes padre |
  | Estado derivable | 19 | caso por caso, cambiando logica de render |
  | Otros | 15 | mezcla |

  Los 11 de la primera familia **no tienen arreglo dentro de este bloque**: `setState` despues de un
  `fetch` dentro de un efecto es el patron correcto mientras no haya cache de estado servidor. La
  version anterior de este item ya lo intuia al decir que los warnings "bajan solos al ejecutar 13.4,
  13.6 y 13.7"; ahora esta medido.

  Los otros 41 si son arreglables, pero cambian **cuando** se actualiza la interfaz, en 45 archivos.
  Hacerlos sin poder ver la aplicacion es el mismo riesgo que ya costo caro dos veces esta semana. Se
  dejan para cuando se ejecute 13.6, que ademas se lleva por delante los 11 de la primera familia.


### Capitulo 13.4 - Correcciones funcionales (bloque 3)

- [HECHO] Unificado `ACTIVE_APPOINTMENT_STATUSES` en `src/utils/appointmentStatus.ts`, con el
  predicado `isActiveAppointment(status)` que normaliza mayusculas y espacios y acepta nulos. Se
  reemplazaron los seis puntos de uso en `useLeadDetail`, `useLeadsPageController` y
  `backgroundAgendaAlertsService`. El bug real estaba en `useLeadDetail.ts:283`, que comparaba el
  valor crudo del backend contra un Set en minusculas: una cita activa capitalizada simplemente no se
  encontraba, sin error visible. 7 tests.
- [HECHO] Corregido `hasActiveLeadFilters`. Ignoraba `sourceChannel`, asi que al filtrar solo por
  canal `filtersActive` quedaba en `false`, `totalCount` colapsaba a `filteredCount` y la bandeja
  informaba "X de X" ocultando el total real. Se agrego tambien `captureLinkId` por completitud. La
  funcion se exporto para poder testearla: omitir un filtro no rompe el listado, solo falsea el
  total, y eso es dificil de notar a simple vista. 9 tests, uno de ellos escrito en rojo antes del
  arreglo.
- [HECHO] Unificado el manejo de errores en `src/utils/errorMessage.ts`, retirando la
  reimplementacion de `useLeadDetail` y la de `appSettingsService`. 10 tests.

  **Correccion a la auditoria.** El informe proponia fusionar todo en la version de
  `appSettingsService`, "mas completa" por incluir `code`, `details` y `hint`. Es incorrecto: no son
  la misma funcion con distinto detalle, son dos propositos distintos, verificado por sus llamadores.
  `describeError` se usa solo en `console.error` y `getErrorMessage` solo en `setError`. Fusionarlas
  mostraria `code=42501 | details=...` al usuario final, que es una regresion de UX. Quedan las dos
  en el mismo modulo, con la separacion documentada y un test que verifica que la version de UI no
  filtra detalle tecnico.

- [HECHO] (`2026-08-12`) Migradas al helper canonico las copias inline de
  `error instanceof Error ? error.message : '...'`. Eran **49**, no ~40, repartidas en 24 archivos.
  Cero quedan.

  Es un cambio de texto visible, y va en la direccion buena: los errores de supabase-js son objetos
  planos, no instancias de `Error`, asi que cada una de esas 49 lineas mostraba el mensaje generico
  justo cuando el backend habia mandado la causa concreta.

  Al revisarlas una por una aparecieron cuatro que no eran copias del mismo patron, y dos de ellas
  eran **bugs reales**, no deuda estetica:

  - `DirectMessageWindow.tsx`: el bloqueo entre usuarios lo impone un trigger con `RAISE EXCEPTION`
    (`079_chat_blocks_mutes.sql`) y llega como `PostgrestError`. El `instanceof Error` daba false
    siempre, asi que el aviso "no podes enviarle mensajes a este usuario" **nunca se mostro**: el
    usuario veia "No se pudo enviar el mensaje" y no entendia por que.
  - `adminService.loadAdminUserBase`: descartaba el `reason` de un `Promise.allSettled` cuando no era
    `Error`, o sea siempre que fallaba una consulta, y lo cambiaba por el mensaje generico.
  - `AdminUserBase.tsx` tenia una reimplementacion local del helper, `resolveErrorMessage`. Eliminada.
  - `emailChannelsRepository.extractFunctionError` conserva su logica propia (lee el cuerpo del
    `FunctionsHttpError`) y solo delega la cola.

  Efecto colateral: `main.tsx` interpolaba el mensaje en `innerHTML`. Mientras el texto salia de un
  `Error` nuestro daba igual; ahora que puede venir del backend, se construye el nodo y se usa
  `textContent`. Se ve exactamente igual.
- [PARCIAL] Deduplicacion de los dos chats de soporte. Se cerro la duplicacion real y la fuga de
  canales; la unificacion en un hook unico queda abierta. 11 tests.

  Hecho:
  - el tipo `PrivateMessage`, declarado identico en ambos componentes, se retira en favor de
    `SupportMessage`, que ya existia en `supportService`. Habia tres definiciones del mismo registro.
  - la reconciliacion optimista, implementada por duplicado y casi igual en ambos, pasa a
    `reconcileIncomingSupportMessage` y `applySupportMessageUpdate` en `supportService`. Son
    funciones puras, y por eso testeables: cubren la sustitucion del mensaje temporal en su
    posicion, la reentrega del mismo evento por realtime, y el caso de dos mensajes con identico
    texto donde el existente no es optimista y no debe sustituirse.
  - `channel.unsubscribe()` pasa a `closeTypingControlChannel`, que usa `removeChannel`. El anterior
    cortaba la suscripcion pero dejaba el canal registrado en el cliente, acumulando canales muertos
    al navegar entre conversaciones. Se dejo intacto el `unsubscribe()` de `AuthContext.tsx:115`:
    no es un canal realtime sino la suscripcion a cambios de sesion.

  No hecho, y por que: la auditoria proponia fusionar ambos en un `useSupportThread(peerId)`. Al
  leerlos no son la misma pantalla con distinta piel. `AdminSupportChat` filtra por pertenencia al
  hilo contra un usuario seleccionado y arma su canal a mano; `SupportFloatingChat` consume el
  servicio, ademas gestiona requerimientos y responde a broadcasts distintos (`CLOSE_CHAT` frente a
  `USER_CLOSED_CHAT`). Forzarlos a un hook comun es reescribir dos chats que funcionan, sin tests de
  integracion que respalden el resultado, y eso choca con la restriccion 13.1.c. Queda pendiente
  hasta tener pruebas de integracion sobre esas dos superficies.
- [PARCIAL] Nombres de canal realtime unicos por suscripcion en los once sitios migrados. 12 tests.

  **Correccion del 2026-08-12.** La afirmacion original, "ya no queda ningun `.channel()` con nombre
  literal en `src/`", era falsa. De 29 llamadas a `.channel()`, solo 10 usan los helpers. Quedan:

  - `presenceRepository.ts:25`: nombre constante puro (`'online-users'`).
  - ~18 con nombre interpolado solo por ambito (`chatRepository.ts:53,84,108,172,243,364`,
    `agendaRepository.ts:400`, `authRealtimeRepository.ts:22,50`, `directMessagesRepository.ts:81`,
    `leadAlertsRepository.ts:63`, `messageAlertsRepository.ts:26,77`,
    `communityForumRepository.ts:178`), que es exactamente el patron que este mismo capitulo declara
    insuficiente: sufijar por usuario no evita que dos componentes de la misma sesion colisionen.

  El caso de `presence` puede ser correcto a proposito (un canal de presencia compartido es
  deliberadamente global), pero eso hay que decidirlo y declararlo, no darlo por hecho.

  Precision sobre el diagnostico original: la auditoria proponia sufijar con `userId`, y **eso no
  habria bastado**. La colision no necesita dos usuarios; basta que dos componentes de la misma
  sesion monten el mismo hook a la vez, como un modal que use `useLists()` dentro de una pagina que
  ya lo usa. El sufijo combina ambito e instancia. Dos helpers en `src/utils/realtimeChannel.ts`,
  porque los contextos difieren: `buildRealtimeChannelName` usa `useId()` de React y se aplica dentro
  de `useRealtimeRefresh` sin tocar a sus llamadores; `uniqueChannelName` usa un contador de modulo
  para los nueve canales de repositorio, que no pueden usar hooks. El peor de esos nueve era
  `subscribeReceiverMessages`, con nombre fijo pese a filtrar por usuario.

- [HECHO] CORS de `supabase/functions/form-lead-file` alineado a la allowlist estandar
  del proyecto. Era la unica funcion que reflejaba cualquier `Origin` recibido.

  Riesgo evaluado y descartado: se temia romper la descarga de PDFs, porque el consumidor es la
  extension y su origen `chrome-extension://<id>` no puede estar en una allowlist fija (el id cambia
  entre la version empaquetada y la de desarrollo). Al revisar el llamador real
  (`useLeadDetail.ts:318-338`) resulta que abre el PDF con un submit de formulario oculto hacia una
  ventana nueva. Eso es navegacion de nivel superior, no XHR: **CORS no interviene en ese flujo** y un
  POST `x-www-form-urlencoded` tampoco dispara preflight. Aun asi se conserva la aceptacion de
  origenes `chrome-extension://`, configurable por el secreto `ALLOWED_EXTENSION_IDS`, por si alguna
  superficie futura pasa a usar `fetch`.

  Desplegado y verificado en produccion el `2026-08-12`: `form-lead-file` v10 -> v11, `ACTIVE`,
  `verify_jwt` sigue en `false`. Comprobado con `curl` contra el endpoint real que un origen de la
  allowlist se refleja, que un origen de extension se acepta, que un origen desconocido ya **no** se
  refleja y recibe el valor por defecto, y que la funcion sigue devolviendo `401` sin token.

  Validacion funcional cerrada: el usuario confirmo el `2026-08-12` que los PDF siguen abriendo
  correctamente desde la extension. Esto cierra el unico punto de la tanda que dependia de
  observacion real y no de analisis, y confirma la conclusion previa de que el submit de formulario
  hacia una ventana nueva no pasa por CORS.

### Capitulo 13.4.b - Fallo latente en la configuracion de Edge Functions

Descubierto el `2026-08-12` al preparar el deploy anterior, no estaba en la auditoria original.

- [HECHO] Declarar `verify_jwt` por funcion en `supabase/config.toml`.

  En produccion diez de las doce funciones corren con `verify_jwt = false`, pero ese estado no estaba
  declarado en ningun archivo del repo. El valor por defecto del CLI es `true`, asi que **cualquier
  `supabase functions deploy` hecho sin `--no-verify-jwt` las habria dejado exigiendo cabecera
  `Authorization`, rompiendolas en el acto**. Los formularios publicos de `planespro.cl` habrian
  dejado de capturar leads.

  El caso mas sutil es `form-lead-file`: el CRM abre el PDF con un submit de formulario hacia una
  ventana nueva, y una navegacion no puede llevar cabecera `Authorization`. El token viaja en el
  cuerpo y la funcion lo valida por su cuenta. Con `verify_jwt = true` el gateway rechazaria la
  peticion antes de que la funcion llegara a leerlo.

  Con las declaraciones en `config.toml`, el estado correcto pasa a ser el que el repo describe en
  vez de depender de que quien despliegue recuerde un flag.

  Correccion del `2026-08-12`: este parrafo decia "once declaraciones" y que `form-progress` no se
  declaraba aqui. Son **doce**, y `form-progress` **si** esta declarada desde que se adopto ese mismo
  dia. El texto quedo describiendo el estado anterior al commit que lo acompañaba.
- [HECHO] El cliente Supabase quedo confinado a `repositories/`. Se cerraron las dos fugas:
  `useRealtimeRefresh` pasa por el nuevo `repositories/realtimeRepository.ts`, y
  `services/realtimeService.ts` se movio a `repositories/authRealtimeRepository.ts`.

  Al cerrarlas aparecio un hueco en la propia regla de ESLint: solo cubria `components`, `pages` y
  `hooks`, asi que `services/` podia importar el cliente sin que nada protestara, que es exactamente
  como habia sobrevivido `realtimeService`. La regla ahora cubre tambien `services`, `contexts`,
  `utils` y `config`. Una frontera con un hueco no es una frontera.
- [HECHO] CORS de `supabase/functions/form-lead-file/index.ts` alineado a la allowlist y desplegado
  (v11). Duplicaba el item de 13.1 con estado contradictorio; unificado el `2026-08-12`.
- [PENDIENTE] Reenviar el header `Origin` desde el proxy al upstream. Hoy la allowlist CORS de las Edge
  Functions no discrimina nada porque nunca ve el origen real.

### Capitulo 13.4.c - Reconocimiento de Cloudflare para el corte de routing

Ejecutado el `2026-08-12` con la API, solo lectura. Estado real de la cuenta:

| Recurso | Estado |
|---|---|
| Zona | `planespro.cl`, activa, id `6bf0d82d...` |
| Pages projects | **uno solo**: `planespro` (`landing-gerow.pages.dev`), sirviendo `planespro.cl` y `chatbot.planespro.cl` |
| Workers | `pp-www-redirect`, `ppblog`, `ppcrm`, `ppcrm-staging`, `ppforms`, `ppnews`, `ppusers` |

Hallazgo no contemplado: existe `ppcrm-staging` ademas de `ppcrm`. No estaba en ningun documento del
proyecto. Debe inventariarse antes de dar por cerrado el retiro de Cloudflare.

**Limite del token actual.** Permisos comprobados uno a uno:

| Capacidad | Resultado |
|---|---|
| Leer zona | OK |
| Workers routes | OK |
| DNS records | OK |
| Pages projects | OK (lectura confirmada) |
| **Rulesets de zona** | **DENEGADO** |
| Page rules legacy | DENEGADO |

Consecuencia corregida el `2026-08-12`: **el permiso no era el problema, el mecanismo estaba mal
elegido.** Una URL Rewrite de Transform Rules reescribe path y query pero **no cambia el origen**, asi
que no puede hacer que una ruta la atienda otro proyecto Pages. El mecanismo correcto es un Worker
montado en Workers Routes. Permisos reales que hara falta si se automatiza: `Cloudflare Pages / Edit`
y `Workers Scripts / Edit` de cuenta, mas `Workers Routes / Edit` y `Zone / Read` de zona. Para la
primera migracion no hace falta ningun token: se puede hacer entero desde el panel.

Alternativa que si cabe en los permisos actuales: un Worker montado en las rutas
`planespro.cl/pb/*`, `/form/*` y `/retiro-tecnico-extranjero/*` que sirva desde el Pages project de
LeadSeed. Funciona, pero agrega un salto de computo donde una regla de configuracion no lo necesita,
y va en direccion contraria al objetivo de reducir piezas en Cloudflare. Se prefiere pedir el
permiso.

### Capitulo 13.4.d - INCIDENTE RESUELTO: los short links de asesor perdian el ref

Detectado el `2026-08-12` verificando produccion antes de planear la migracion. **No es deuda
tecnica, es una perdida de atribucion comercial ocurriendo ahora.**

Evidencia, probada contra `planespro.cl` con tres refs distintos:

| URL | Respuesta |
|---|---|
| `/pb/whwgd4` | `301` a `/pb/` |
| `/pb/58a2k6` | `301` a `/pb/` |
| `/pb/pp-e6efca41f40449c0adde9f65b3219f02` | `301` a `/pb/` |
| `/form/58a2k6` | `308` a `/form/` |
| `/retiro-tecnico-extranjero/58a2k6` | `200`, funciona |

Un visitante nuevo que abre el link de un asesor aterriza en `/pb/` sin ningun `ref` en la URL.

Causa raiz: `origin/master` de `landing-gerow` no contiene las reglas `/pb/:ref -> /pb/ 200` de
`_redirects`. Existen en el `master` local y en la rama
`fix/reconcile-ppforms-retirement-with-tracking`, que nunca se mergeo. El propio `AI_SYNC.md` advirtio
por escrito que esto pasaria si alguien seguia trabajando sobre `origin/master` sin mergear esa rama.

Lo que **no** esta confirmado: que el lead termine atribuido al owner equivocado. La URL pierde el
ref, pero la app podria recuperarlo de `localStorage` en una visita repetida. Para un visitante nuevo
no hay nada que recuperar, y LeadSeed ya retiro el fallback por `Referer` en `a351b59`. Verificacion
pendiente y barata: abrir un link `/pb/<code>` en ventana privada, enviar un lead de prueba y
comprobar a que owner cae.

**Resuelto el `2026-08-12`.** Causa raiz confirmada por un experimento natural: de las tres Pages
Functions, `retiro-tecnico-extranjero` ya pedia la carpeta base y es la unica que funcionaba; `pb` y
`form` pedian `index.html` explicito, `ASSETS.fetch` volvia a pasar por `_redirects`, se disparaba la
regla `/pb/index.html -> /pb/ 301` y la Function devolvia ese 301 tal cual.

- [HECHO] Corregidas las Functions de `pb` y `form` para que pidan la carpeta base, igual que
  `retiro`. Dos lineas, una por archivo. Commit `9e91f2a4` en `landing-gerow`.
- [HECHO] Verificado primero en un deploy de preview aislado, y solo despues promovido a produccion
  como fast-forward sobre el commit que ya estaba desplegado, sin ningun otro delta.
- [HECHO] Verificado en produccion: las siete rutas de formulario devuelven `200` sin redirect, y
  home, blog, biblioteca, farmacias, centros de salud y noticias siguen en `200`.

Metodo, por si se repite: se trabajo en un `git worktree` aislado creado desde `origin/master`, sin
tocar la copia de trabajo de `landing-gerow`, que tiene 1368 archivos sin commitear y tres worktrees
activos. Es la forma de intervenir ese repo sin arriesgar trabajo ajeno.

- [RESUELTO DE OTRA FORMA] (`2026-08-14`) Esa rama **no se mergea**: se abrio y resulto estar 8 dias
  parada, adelantada por master en 63 commits, y reintroduciendo `supabase/functions/`, que master
  retiro a proposito. Su fix de routing ya estaba en master. Lo unico suyo que faltaba en produccion
  era el tracking de visita de `/pb`, recuperado en `feat/pb-visit-tracking`. Detalle en 13.2.
- [HECHO] (`2026-08-15`) Cuantificado con `sql/diagnostics/001_leads_afectados_por_regresion_ref.sql`,
  que ya estaba escrito para esto y define la firma correcta: lead que **viene de `/pb` o `/form`
  segun `source_url`/`source_path` pero quedo sin `capture_link_id`**.

  **Un solo lead vivo afectado**, del `2026-08-04`. Otros 49 comparten la firma pero estan borrados:
  son envios de prueba.

  La ventana real es mas larga de lo que decia este item. El commit roto no es `c3315ed7` sino
  `bcf6ca43` (`2026-08-03 15:07 -0400`), que es cuando **nacieron** las Functions de `pb` y `form`
  pidiendo `index.html` explicito; `c3315ed7` solo era lo que estaba desplegado el dia de la
  deteccion. El fix es `9e91f2a4` (`2026-08-12 13:47 -0400`): nueve dias, no uno.

  **Pero los datos no encajan con esa ventana, y eso es lo interesante.** Los leads con la firma
  empiezan el `2026-07-31`, tres dias **antes** de que el commit culpable existiera, y se cortan el
  `2026-08-06`, seis dias **antes** del fix:

  | dia | vivos | borrados |
  |---|---|---|
  | 2026-07-31 | 0 | 3 |
  | 2026-08-01 | 0 | 5 |
  | 2026-08-02 | 0 | 8 |
  | 2026-08-03 | 0 | 23 |
  | 2026-08-04 | **1** | 6 |
  | 2026-08-05 | 0 | 1 |
  | 2026-08-06 | 0 | 3 |

  Si la regresion fuera la causa, el rastro empezaria el 3 de agosto y llegaria hasta el 12. Empieza
  antes y termina antes, asi que **lo que se esta viendo es una tanda de pruebas, no una sangria
  comercial**: el rastro sigue al trafico de prueba, no a la ventana del bug.

  Conclusion: el impacto comercial medible es **un lead**, y ni siquiera se le puede atribuir con
  seguridad a la regresion, porque el patron ya existia antes de que la regresion pudiera producirlo.
  No se reasigna nada, en linea con lo que el propio diagnostico advierte: el ref se perdio en el
  navegador antes de llegar al backend, asi que **no hay forma automatica y fiable de saber a que
  asesor pertenecia cada lead**. El dato no llego nunca.

  Hallazgo lateral que si vale la pena, y que no es de la regresion: el canal `general` (el
  formulario `/form`) **no ha atribuido nunca**. 78 leads en total, 0 con link de captura, antes,
  durante y despues de la ventana. `pb` atribuye el 84% y `retiro` el 100%. Anotado en 12.2.

Nota para la migracion: el estado correcto de `_redirects`, `_routes.json` y las Pages Functions es
exactamente lo que hay que llevarse al proyecto nuevo. Arreglar esto no es un desvio, es preparar el
bloque 4.

### Capitulo 13.4.e - Configurar ALLOWED_EXTENSION_IDS

- [PENDIENTE] Configurar el secreto `ALLOWED_EXTENSION_IDS` con el id de la extension
  (`blphejkibijeolonnebffpclhlghofnn`, derivado del `manifest.key` y por tanto estable) y redesplegar
  `form-lead-file`.

  ```
  npx supabase secrets set ALLOWED_EXTENSION_IDS=blphejkibijeolonnebffpclhlghofnn
  npx supabase functions deploy form-lead-file --no-verify-jwt
  ```

  **Motivo real: consistencia del estandar, no seguridad.** Conviene registrarlo asi para que nadie
  le de una urgencia que no tiene. Sin el secreto, la funcion acepta cualquier origen
  `chrome-extension://`, pero eso aporta poca proteccion efectiva por tres razones verificadas:

  1. el unico flujo que usa este endpoint abre el PDF con un `<form>` que navega a una ventana nueva,
     y eso es navegacion, no `fetch`: **no pasa por CORS en absoluto**
  2. la autorizacion real es el Bearer token mas la comprobacion de que el lead pertenece al usuario
  3. una extension maliciosa con permisos de host puede llamar a la API sin que CORS la frene, asi
     que si ya tiene el token, el allowlist no la detiene

  La auditoria de seguridad del `2026-08-12` lo clasifico MEDIO precisamente por consistencia: era la
  unica funcion del proyecto que se salia de la allowlist estandar. Decision del usuario del
  `2026-08-12`: se mantiene como pendiente para que todo quede dentro del estandar, con prioridad
  baja. Si alguna superficie futura pasa a usar `fetch` contra este endpoint, sube de prioridad.

### Capitulo 13.5 - Consolidacion de formularios (bloque 4) - CERRADO el `2026-08-14`

**El traslado de los formularios a LeadSeed se descarta.** El bloque se cierra como decision, no como
trabajo pendiente.

#### Por que

Un proyecto de Cloudflare Pages se conecta a **un** repositorio. El reconocimiento del `2026-08-12`
(capitulo 13.4.c) confirmo que existe **un solo** proyecto Pages, `planespro`, conectado a
`landing-gerow`, y de el se sirve todo `planespro.cl`.

Entonces mover los formularios a LeadSeed exige una de tres cosas, y ninguna sale bien:

1. **Crear un segundo proyecto Pages** mas un Worker que reparta el trafico por ruta. Es lo que
   pedia el item 1 de este bloque. El usuario decidio explicitamente no crear nada nuevo en
   Cloudflare mientras se cierra el resto.
2. **Mover el codigo sin mover el deploy.** Es la peor: produccion seguiria sirviendo la copia de
   `landing-gerow` y LeadSeed tendria una copia que no se despliega. Eso es exactamente la doble
   fuente de verdad que costo dos incidentes este mes (`form-leads` divergente entre repos,
   `form-progress` desplegada desde un arbol sin commitear), y esta vez sobre la captacion de leads.
3. **Sincronizar por CI** de LeadSeed a `landing-gerow`. Sigue habiendo dos copias; solo se agrega
   una tuberia que puede fallar en silencio. La deriva ya es el modo de fallo dominante de este
   proyecto: no conviene construirle una via mas rapida.

#### Lo que el bloque mezclaba

Al abrirlo aparece que juntaba dos cosas distintas: **arreglar problemas reales de los formularios** y
**cambiarlos de repositorio**. Solo la segunda esta bloqueada. Los problemas reales se arreglan igual
de bien donde estan, y se conservan abajo reescritos con ese alcance.

#### Que queda, ya sin el traslado

- [HECHO] (`2026-08-14`) Alineada la traduccion de rutas de la API. Rama
  `fix/unificar-form-api-client` en `landing-gerow`, pendiente de merge.

  **El item exageraba el problema y conviene dejarlo escrito.** Decia "cuatro implementaciones
  independientes". Verificado contra `origin/master`, son **dos**: `pb/app.js` no es una tercera,
  porque `build.js` lo copia de `frontend/lead-capture/js/app.js` (es un artefacto de build, no
  codigo fuente), y `retiro-tecnico-extranjero/app.js` no traduce nada porque usa las rutas finales
  directamente, que es correcto por construccion.

  **Tampoco habia bug vivo.** La version de `/form/` cubria dos de las cuatro traducciones: justo las
  dos que ese formulario usa. La que faltaba, la de abandono, nunca se ejecutaba porque `/form/` no
  llama a ese endpoint. Era una trampa, no un fallo: el dia que alguien anadiera ahi esa llamada, la
  URL habria salido mal y el servidor habria devuelto 404 a una ruta inventada, sin aviso.

  Se completo la de `/form/` para que ambas den el mismo resultado, y se agrego
  `tests/form-api-path-parity-smoke.mjs`, que las compara sobre 16 entradas: las traducciones, las
  rutas ya normalizadas (que no deben traducirse dos veces), las desconocidas y los prefijos
  parciales. Comprobado que falla si se rompe la paridad a proposito. Es el arreglo real para un
  problema de deriva: mientras sean dos copias, el test las mantiene honestas.
- [PENDIENTE, sin urgencia] Arreglar `retiro-v2` antes de desplegarlo: canal invalido, sin
  idempotencia, y redirige a Hotmart tanto si el lead se guardo como si fallo. Verificado el
  `2026-08-14`: **no esta en `origin/master`**, o sea que no esta desplegado ni puede desplegarse por
  accidente. Solo existe en `wip/rescate-arbol-sucio-2026-08-14`. No corre ninguna prisa; lo que no
  puede pasar es que se despliegue en el estado en que esta.
- [DESCARTADO] Borrar `.codex-tmp/deploy-clean/`. Verificado el `2026-08-14`: **no existe en
  `origin/master`**, asi que no hay nada versionado que borrar. Solo vive en el arbol de trabajo
  local de `landing-gerow`, que no es de este roadmap.
- [PENDIENTE] Decidir el destino de la reorganizacion a `forms/`, rescatada en
  `wip/rescate-arbol-sucio-2026-08-14`. Esta a medias y **no se puede desplegar tal cual**: las Pages
  Functions ya apuntan a `/forms/pb/` y esa carpeta no esta completa, asi que `/pb/` daria 404. O se
  termina en `landing-gerow` o se abandona; dejarla a medias en un arbol sucio es lo que ya paso.

#### Decisiones que se conservan de la version anterior

- **Las Edge Functions no se mueven a los formularios**: sirven tambien a la extension. Ya se cerro
  al contrario, trayendolas todas a LeadSeed (capitulo 15.5 del protocolo).
- El reparto de propiedad queda asi: **LeadSeed posee las Edge Functions y las migraciones SQL;
  `landing-gerow` posee los formularios publicos y el sitio.** Es la frontera que ya funciona.

#### Como reabrirlo

Si algun dia se acepta crear un segundo proyecto Pages, el traslado vuelve a ser viable y este
capitulo se reabre con el item 1 primero. La decision no es tecnica sino de infraestructura, y esta
tomada solo mientras se mantenga la restriccion de no crear recursos nuevos en Cloudflare.

### Capitulo 13.6 - Preparacion para app movil (bloque 5)

Hallazgo clave: el acoplamiento que bloquea el port no es Chrome (93 usos bien contenidos en 18
archivos) sino el DOM dentro de hooks de dominio.

- [HECHO] `src/platform/` con seis puertos: `Dialogs`, `Navigation`, `KeyValueStore`, `Deeplink`,
  `MessageBus` y `OAuthLauncher`.

  Sobre los cuatro que faltan, con una correccion al plan original. La auditoria listaba nueve
  puertos como si todos tuvieran el mismo valor. No lo tienen. Al activar la regla que prohibe
  `chrome` en la capa de dominio aparecieron 11 archivos, y al mirarlos uno por uno se dividen en dos
  grupos que merecen trato distinto:

  - **Dominio acoplado por descuido**, que si gana con un puerto: `appSettings.ts` y
    `appMaintenance.ts` guardaban preferencias con `chrome.storage`. Migrados a `KeyValueStore`.
    Tambien `DataManagement.tsx` y `EmailSender.tsx`, que escribian en `chrome.storage` **desde un
    componente**, exactamente como marco la auditoria.
  - **Plataforma por naturaleza**, que no gana nada: `alertNotifier`, `offscreenAudio`,
    `extensionBadgeTheme` y los dos servicios de background son la superficie nativa de Chrome. No se
    portan a movil, se reescriben con el equivalente nativo. Envolverlos en un puerto solo agregaria
    indireccion sin quitar acoplamiento.

  Cerrados despues `Deeplink`, `MessageBus` y `OAuthLauncher`. **Los cinco puertos que bloqueaban
  dominio reutilizable estan hechos.**

  `OAuthLauncher` elimino ademas una duplicacion real: `LoginPage` y `useEmailChannels` calculaban
  por su cuenta, con codigo identico, si corrian dentro de la extension y de ahi derivaban la URL de
  retorno. Ahora ambos preguntan al puerto. El contrato distingue los dos flujos posibles, que no son
  cosmeticamente distintos: `launch` devuelve la URL de callback cuando la app sigue viva, y `null`
  cuando la plataforma navego fuera y el proveedor traera de vuelta al usuario despues. `oauthTab.ts`
  se movio de `utils/` a `platform/`, que es donde le corresponde.

  Al migrar `waHelper` se separo lo que estaba mezclado: construir la URL de WhatsApp segun la
  preferencia del usuario es logica de dominio y se quedo, extraida a `buildWhatsAppUrl` y ahora con
  tests; lo unico que salio al puerto es el acto de abrirla. El puerto **no conoce WhatsApp**, y no
  debe conocerlo. Se conserva la via por proceso de fondo cuando esta disponible, porque reutiliza
  una pestaña de WhatsApp Web ya abierta en vez de abrir una nueva por cada lead.

  `MessageBus` absorbe el `.catch()` vacio que cada llamador repetia para tolerar el service worker
  dormido. En MV3 eso es un estado normal, no un error, y no tenia por que estar en la capa de
  dominio.

- [HECHO] Regla de frontera extendida: `chrome` prohibido en `services`, `repositories`, `hooks`,
  `utils` y `config`. Los modulos de plataforma quedan exentos por una **lista explicita en
  `eslint.config.js`**, no por `eslint-disable` repartidos. La diferencia importa: una lista en un
  solo archivo se audita de un vistazo y crece solo con una decision visible en el diff.

  Resultado: fuera de `src/platform/` y de esa lista, el unico `chrome.*` que queda vive en
  `App.tsx`, que es la shell de la extension y su uso ahi es legitimo.

  Correccion del `2026-08-12`: este parrafo tambien citaba `LoginPage.tsx`, que ya no contiene
  ninguno desde que se migro al puerto `OAuthLauncher` en el mismo bloque.

**Estado final del bloque al `2026-08-12`: no queda ni un archivo de dominio acoplado a Chrome.**
Los `chrome.*` que sobreviven estan en `src/platform/`, en los dos puntos de entrada de la extension
(`background.ts`, `offscreen.ts`), en `App.tsx` (la shell) y en los cinco servicios de plataforma
declarados como exentos.

- [HECHO] (`2026-08-12`) Movidos a `src/platform/` los cinco servicios que seguian en `services/`
  mas `lib/chromeStorageAdapter.ts`. Reubicacion pura: ni una linea de logica cambio, solo rutas de
  import. Los dos de background pierden el sufijo `Service` en el camino (`backgroundLeadAlerts`,
  `backgroundAgendaAlerts`), porque en `platform/` ese sufijo nombraba una capa a la que ya no
  pertenecen.

  El criterio del corte, que conviene dejar escrito porque no es obvio: **`platform/` es lo que hay
  que reescribir para otra plataforma, no lo que se ejecuta en segundo plano.** Por eso
  `backgroundMessageAlertsService` **se queda en `services/`** aunque sea hermano de los otros dos y
  arranque desde el mismo service worker: se verifico que no toca ni una API de Chrome. Es
  suscripciones de Realtime mas una llamada a `dispatchAlert`, y eso se porta a Expo casi tal cual.
  Los otros dos si usan `chrome.storage` para su estado de deduplicacion.

  Efecto en `eslint.config.js`: la lista de exentos de la frontera pierde seis entradas y gana una,
  el glob `src/platform/**`. Queda anotado ahi mismo que eso es un comodin y que la garantia deja de
  ser el linter: si esa carpeta crece hasta no poder revisarse de un vistazo, hay que volver a
  enumerar archivo por archivo. Verificado con archivos sonda que la frontera sigue disparando en
  `services/` y en `hooks/`.
- [HECHO] Decidido **no construir** cuatro de los nueve puertos que listaba la auditoria:
  `Notifier`, `BadgeCounter`, `BackgroundScheduler` y el audio. Envolverlos no quitaria acoplamiento,
  solo agregaria indireccion: no se portan a movil, se reescriben con el equivalente nativo. Se marca
  como decision cerrada, no como pendiente, para que nadie lo reabra.

- [HECHO] Efecto colateral util del puerto: el `try/catch` vacio alrededor de `chrome.storage`, que
  estaba repetido en cada llamador para tolerar el desarrollo web sin extension, ahora vive una sola
  vez dentro de la implementacion. La capa de dominio dejo de defenderse de un detalle de plataforma
  que no le corresponde.
- [HECHO] Eliminados `confirm()`, `alert()` y `window.location.hash` de la capa de dominio. **Este
  era el bloqueador real del port a movil**, por encima del acoplamiento a Chrome.
  - `useAgenda.ts`: un `confirm` y dos usos del hash.
  - `useLeadsPageController.ts`: nueve dialogos y cinco usos del hash, en 15 sustituciones.
  - Ambos `eslint-disable` retirados: ESLint vigila esos archivos activamente y pasa.
  - Marcas de deuda de frontera: de 5 a 3. Las tres restantes son de 13.4, no de portabilidad.

  Dos decisiones de diseño que conviene no revertir. Primera: `DialogsPort.confirm` devuelve una
  promesa aunque la implementacion web sea sincrona, porque en movil o con un dialogo propio la
  respuesta llega despues y un contrato sincrono lo haria inimplementable. Segunda: la navegacion se
  modela como rutas con parametros (`{ name: 'leads', leadId, filter, action }`) y no como cadenas de
  hash, porque el hash es un detalle del entorno web; el formato serializado se conserva identico
  para no romper la shell, y el parseo quedo centralizado y con 15 tests, donde antes eran
  expresiones regulares repartidas por dos hooks.

  No se toco el comportamiento: la implementacion web sigue llamando a los mismos `confirm`, `alert`
  y `window.location.hash` de antes. Lo que cambia es quien depende de quien.

- [HECHO] Verificado que los `window.location.hash` restantes viven solo en `components/` y
  `pages/`, que es la capa web y se reescribe para movil. La regla de frontera no los cubre a
  proposito; no son deuda.
- [HECHO] Retirado `chrome.storage` de `DataManagement.tsx` y `EmailSender.tsx`, y `chrome.identity`
  de `useEmailChannels.ts`. Los tres pasan por puertos.
- [PENDIENTE] Evaluar TanStack Query como capa unica de estado servidor. Hoy no hay cache: cada
  guardado cuesta del orden de 8 consultas por doble disparo entre refetch manual y evento realtime de
  la propia escritura, y no hay guard de "ultima respuesta gana" en la bandeja.
- [PARCIAL] Movidos a `src/types/` los tipos de dominio que vivian en hooks: `OnlineUser` y
  `DmSession`, ambos a `types/chat.ts`. `DmSession` era el caso claro, lo importaban tres
  componentes desde un hook.

  El item se cierra mas chico de lo que prometia, y la razon es que al revisarlo uno por uno la
  mayoria de candidatos **no eran tipos de dominio**. De los 22 tipos exportados desde `hooks/` y
  `utils/`, el resto se divide en tres grupos que estan bien donde estan: contratos de retorno de un
  hook (`ChatScroll`, `LeadsSelection`, `UseAgendaResult`), estado de formulario
  (`ParticipantFormState`, `RescheduleFormState`, `ChannelDraft`) y forma de salida de una funcion
  (`ParsedRow`, `MentionQuery`, `CompressedImage`). Cuatro de ellos, ademas, tienen un unico
  consumidor que es su propio archivo: moverlos separaria una funcion de su firma a cambio de nada.
  Se deja como PARCIAL y no como HECHO para que quede claro que el resto es una decision tomada, no
  trabajo olvidado.

Frontera de portabilidad estimada: reutilizable tal cual `src/types/**`, `src/repositories/**`, la
mayoria de `src/services/**` y `src/utils/**`.

### Capitulo 13.6.b - Inyeccion real de la plataforma

Ejecutado el `2026-08-12`, tras la segunda auditoria. **Cierra la "ultima milla" del bloque 5**, que
era el hallazgo de fondo: los puertos existian como interfaces pero no como frontera.

El diagnostico de la auditoria fue exacto: los diez consumidores hacian
`import { webDialogs } from '../platform/web'`, lo que arrastra `chrome.*` al grafo de modulos igual
que llamar a `chrome` directamente. Se habia cambiado acoplamiento textual por acoplamiento de
import, y ESLint solo sabia ver el primero. El indicador estaba optimizado, no la propiedad.

- [HECHO] `src/platform/registry.ts` con `setPlatform` / `getPlatform`. La capa de dominio pide la
  implementacion en tiempo de ejecucion; el contrato (`platform/types`) son solo tipos y desaparece
  al compilar.
- [HECHO] `main.tsx` registra `webPlatform` antes de montar nada. **Es el unico modulo de la
  aplicacion que menciona la implementacion concreta**, verificado con grep.
- [HECHO] Migrados los diez consumidores. Las marcas de deuda bajan de 29 a 19: las 10 de import
  desaparecen y quedan las 19 de DOM.
- [HECHO] La regla que prohibe importar `platform/web` fuera del entry point ya no tiene exentos y
  bloquea activamente. Verificado con archivo de prueba, no leyendo la config.
- [HECHO] 5 tests sobre el registro, incluido el que fija el criterio de exito del bloque: sustituir
  la plataforma por una falsa sin tocar un solo archivo de dominio.

Decision de diseño: **un registro y no un contexto de React**. Tres de los diez consumidores
(`appSettings`, `appMaintenance`, `waHelper`) no son componentes ni hooks, asi que un contexto no les
sirve; tener contexto para React y registro para el resto serian dos mecanismos para el mismo
problema. `getPlatform()` lanza si nadie registro la plataforma, en vez de caer a la implementacion
web: un fallback silencioso reintroduciria exactamente el acoplamiento que este modulo cierra.

Que falta para que el bloque 5 este cerrado del todo: las 19 marcas de DOM. Con ellas resueltas, el
entry de Expo llamaria `setPlatform(nativePlatform)` y ningun archivo de dominio cambiaria.

### Capitulo 13.6.c - Retiro del DOM de la capa de dominio

Ejecutado el `2026-08-12`. **La deuda del bloque 5 baja de 29 marcas a 2.**

Cuatro puertos nuevos, cada uno porque la intencion si cruza de plataforma aunque el mecanismo no:

- `FileSaver`: entregar un archivo generado. En web es un `<a download>` sintetico; en movil,
  `expo-file-system` mas la hoja de compartir. El puerto recibe el contenido y no una URL de objeto,
  porque crear y revocar esa URL es un detalle del navegador.
- `ScrollLock`: impedir que el fondo se desplace con un modal abierto. En movil el componente `Modal`
  ya lo resuelve, asi que la implementacion nativa sera vacia.
- `ProtectedFile`: abrir un archivo que el servidor solo entrega si recibe credenciales en el cuerpo.
  Sustituye el truco de abrir ventana mas enviar un `<form>` oculto por POST. Devuelve un resultado
  en vez de lanzar, porque el fallo mas comun no es un error de programa sino que el navegador
  bloqueo la ventana emergente, y el dominio necesita distinguirlo para mostrar el mensaje correcto.
- (mas `Deeplink`, `MessageBus`, `KeyValueStore`, `Dialogs`, `Navigation` y `OAuthLauncher` de las
  fases previas: **nueve puertos en total**.)

Dos correcciones de fallos reales encontradas al migrar, no buscadas:

- `exportData` y `backup` solo revocaban la URL de objeto si el `click()` tenia exito. Ahora va en un
  `finally`: una URL sin revocar retiene el blob completo en memoria hasta recargar la pagina.
- El formulario oculto del PDF solo se retiraba del DOM en el camino feliz. Tambien pasa a `finally`.

Cuatro modulos se declaran **mecanica de interfaz web y no dominio**, con motivo escrito en
`eslint.config.js`: `useAppKeyboardShortcuts` (un atajo de teclado no existe en un telefono),
`useFlipOnOverflow` y `useResponsiveColumns` (medir el viewport lo resuelve el layout nativo), e
`imageCompression` (en movil es `expo-image-manipulator`, sustitucion y no adaptacion). No son deuda:
son decision.

**Segunda ampliacion de la regla en el mismo dia.** Al volver a medir aparecieron mas globals del DOM
que la regla no veia: `ResizeObserver`, `FileReader` e `Image`, que se usaban sin prefijo y por eso
pasaban limpios. Es la misma clase de error que la auditoria senalo: la regla cubria menos de lo que
yo creia. Ahora estan incluidos.

- [CERRADO POR DECISION] (`2026-08-15`) Las 2 marcas restantes, ambas de `FileReader` en
  `importParser.ts`. **No son deuda: estaban mal clasificadas.**

  Un puerto de plataforma existe para que la capa de dominio no toque el navegador. Aqui no hay nada
  que aislar: la funcion entera es web-only por una razon anterior e independiente, que es su
  dependencia de `xlsx`, que tampoco cruza a React Native. Un puerto para `FileReader` dejaria la
  frontera igual de rota y con una indireccion mas.

  Portar la importacion de archivos es un frente del bloque movil, cuando exista. Se cierra aqui para
  que deje de contarse como pendiente de portabilidad, que es lo que no es.

### Capitulo 13.7 - Division de archivos grandes (bloque 6)

Por orden de riesgo: `ChatRoom.tsx` (1097), `useLeadsPageController.ts` (578, devuelve un objeto de 70
propiedades), `leadsRepository.ts` (535), `useLeadDetail.ts` (493), `ListsPage.tsx` (480),
`AdminUsersPage.tsx` (455), `AgendaSettings.tsx` (438), `useEmailChannels.ts` (433),
`FormTypeLinksSection.tsx` (428).

- [PENDIENTE] Aplicar el patron que ya funciona en el repo: `LeadsPage.tsx` (213 lineas) mas su
  controller dedicado.

### Capitulo 13.7.b - Extracciones ejecutadas del bloque 6

Metodo adoptado el `2026-08-12`, tras introducirme tres bugs con transformaciones automaticas
durante el bloque 2: **extraer a mano, una unidad por vez, escribiendo antes el test de la pieza
extraida**. Nada de scripts sobre estructuras donde la posicion importa.

Prerrequisito resuelto primero: React Testing Library y `happy-dom`, sin los cuales no se puede
verificar que una extraccion de hook no cambie comportamiento. Se corrigio de paso el glob de tests
de ESLint, que solo cubria `.test.ts` y habria aplicado la frontera de portabilidad al primer test
de componente.

- [HECHO] `usePendingAttachment` fuera de `ChatRoom`. 14 tests. Unidad coherente: tres estados que
  solo tienen sentido juntos mas la gestion del `object URL`, que hay que revocar al limpiar, al
  reemplazar y al desmontar. Repartir esa responsabilidad entre hook y consumidor es como se filtra
  memoria.
- [HECHO] `useLeadsSelection` fuera de `useLeadsPageController`. 16 tests. Incluye
  `lastClickedIndex`, que solo existe como ancla de la seleccion por rango: separarlo obligaria al
  llamador a sincronizar dos estados que son uno.

  El hook expone acciones con nombre en vez del `setSelectedIds` crudo, y eso destapo algo: el
  controller limpiaba la seleccion desde seis sitios con `setSelectedIds(new Set())` repetido, y
  `LeadsPage` hacia lo mismo desde fuera dos veces mas. Ahora hay una sola `clear()`.

- [HECHO] `src/platform/dialogs.contract.test.ts`, que cubre el hueco marcado como critico por la
  auditoria: los diez `confirm`/`alert` convertidos a asincronos no tenian red. Un test demuestra
  explicitamente el fallo que se evita: sin `await`, la negacion de una Promise nunca corta y la
  accion destructiva se ejecutaria aunque el usuario cancele.

- [HECHO] (`2026-08-13`) `useDismissibleToast` fuera de `useLeadsPageController`. 8 tests.

  La unidad no se eligio por tamaño sino porque el mismo patron estaba escrito **tres veces**:
  mostrar un aviso, programar un `setTimeout` para apagarlo y, en dos de los tres, comprobar dentro
  del temporizador que el aviso siguiera siendo el mismo antes de borrarlo.

  Esa comprobacion era el sintoma. Existia porque **los temporizadores no se cancelaban**: si
  aparecia un segundo aviso antes de que venciera el primero, el temporizador viejo apagaba el nuevo.
  El tercer caso, el de anclar un lead, **no llevaba esa defensa**, asi que anclar dos leads seguidos
  hacia desaparecer el segundo aviso antes de tiempo. Es un bug real que el hook cierra por
  construccion, no por añadir otra comprobacion.

  Ninguno de los tres se limpiaba al desmontar: salir de la bandeja con un aviso abierto dejaba un
  temporizador vivo intentando escribir estado en un componente que ya no existia.

  **El archivo paso de 539 a 541 lineas**, o sea que crecio. Se deja escrito para no aparentar lo
  contrario: las dos lineas de mas son las constantes de duracion con su comentario, y la ganancia no
  esta en el contador sino en que las tres copias del patron son ahora una sola con test propio.
  Contar lineas como medida de exito es justo lo que 13.1.c advierte que no hay que hacer.

Estado de los dos monolitos: `ChatRoom.tsx` de 1097 a 1069 lineas,
`useLeadsPageController.ts` de 572 a 538.

- [PENDIENTE] El resto de las extracciones de `ChatRoom` son de JSX (composer, lista de mensajes,
  panel de moderacion, seis modales) y **no se pueden verificar sin un test de render del componente
  completo**, que exige simular unos quince hooks. Extraerlas a ciegas bajaria el numero de lineas
  rapido y es exactamente lo que la restriccion 13.1.c prohibe. Decision pendiente del usuario:
  seguir extrayendo hooks con test propio, o invertir primero en ese test de render.

### Capitulo 13.8 - Consolidacion del sistema visual (bloque 7)

El sistema de tokens (`src/design/tokens.css`) existe y esta bien disenado. El problema es la adopcion
parcial: conviven tres fuentes de verdad de color.

### 13.8.a - Lo ejecutado sin aprobacion por superficie (`2026-08-12`)

Son los dos sub-items que 13.1.c autoriza por ser "identico o estrictamente mejor". Los otros tres
**no** lo eran, y el detalle de por que esta mas abajo, porque el hallazgo cambia el plan.

- [HECHO] Corregido el offset del anillo de foco en `src/index.css`. Habia un `#0a0a0a` fijo en
  `focus:ring-offset-[...]` de `.btn`. El offset debe ser el color de **detras** del boton, para que
  el hueco de 2px se funda con el fondo; con un casi-negro fijo, en modo oscuro pasaba desapercibido
  pero en modo **claro** dibujaba un halo negro alrededor de cada boton enfocado, o sea justo lo
  contrario de lo que hace un anillo de foco. Ahora usa `var(--ls-bg)`. Verificado en el CSS
  compilado: `#0a0a0a` ya no aparece en `dist/`.

- [HECHO] Corregido el contraste de `--ls-text-muted`, que **incumplia WCAG 2.2 AA en los dos temas**.
  Medido, no estimado:

  | | antes | sobre surface | sobre bg | ahora | sobre surface | sobre bg |
  |---|---|---|---|---|---|---|
  | claro | `#8c95a6` | 3.02 | 2.86 | `#697387` | 4.77 | 4.53 |
  | oscuro | `#64748b` | 3.66 | 3.97 | `#73839a` | 4.51 | 4.90 |

  El minimo para texto normal es 4.5. Se movio **solo la luminosidad**, conservando tono y
  saturacion, para que siga siendo el mismo gris azulado.

  El radio de impacto resulto ser mucho menor de lo que sugiere un token de texto: sus unicos
  consumidores reales son las etiquetas de los ejes de los graficos, a 10px. Y 10px es texto normal,
  no grande, asi que el umbral que aplica es el de 4.5 y no el de 3. Actualizado tambien el respaldo
  en `palette.ts`, que por contrato debe coincidir con `tokens.css`.

### 13.8.c - Detector de clases CSS muertas (`2026-08-13`)

Nacio de un hallazgo del usuario: en el modal de soporte habia un cuadrado en blanco donde deberia
verse un icono. La causa era `dark:backdrop-blur-md/20`, una clase que no existe. Tailwind no avisa
de eso: descarta en silencio lo que no entiende, y la clase se queda en el codigo sin hacer nada
hasta que alguien nota el hueco a ojo.

`npm run check:classes` compara las clases usadas en el codigo contra las que Tailwind emitio de
verdad en el CSS compilado. Es deliberadamente empirico: no reimplementa la gramatica de Tailwind,
que cambia entre versiones y admite valores arbitrarios. Le pregunta al build.

Corre en CI **despues** del build, porque con un `dist/` viejo el resultado no significaria nada.
Comprobado que falla, con codigo de salida 1, si se reintroducen las clases del caso original.

**25 clases muertas en la primera pasada.** Repartidas en tres causas:

- `animate-fadeIn` en cuatro paneles de admin, cuando el CSS define `animate-fade-in`. Esos cuatro
  paneles no tenian animacion de entrada. Corregido.
- `custom-scrollbar`, `scrollbar-hide` y `hide-scrollbar`: tres nombres distintos para lo mismo, y
  **ninguno definido en ningun CSS**. `index.css` ya oculta la barra en todo el documento, asi que
  eran decorativas. Retiradas.
- **Once por una sola causa sistemica**, que es el hallazgo de fondo. Ver abajo.

- [HECHO] (`2026-08-13`, aprobado por el usuario) **La opacidad sobre colores propios ya funciona.**
  Los colores estan definidos en `tailwind.config.js` como `var(--ls-primary)`, y esas variables
  guardan un hexadecimal. El modificador `/25` necesita inyectar un canal alfa, cosa que no puede
  hacer sobre un `var()` opaco, asi que Tailwind descarta la clase entera.

  No es un detalle de tres sitios: afecta a las primitivas del propio sistema. `Badge`, `Surface` y
  `Button` declaran bordes `border-state-*/25` que **no se estan pintando**. Tambien `bg-primary/10`
  en el login y `dark:bg-primary/20` en varios paneles del chat.

  **Solucion adoptada:** `tailwind.config.js` expone cada token a traves de un helper `conAlfa` que
  usa `color-mix`. Se descarto la via habitual (guardar los tokens como tripletes
  `--ls-primary: 108 76 246` y componer `rgb(var(--x) / <alpha-value>)`) porque aqui rompe tres
  cosas: los **30 usos directos** de `var(--ls-*)` en CSS y en estilos en linea, y `palette.ts`, que
  lee la variable y se la pasa a Recharts como color. Un triplete no es un color valido en ninguno de
  esos sitios. `color-mix` deja el hexadecimal intacto y funciona desde Chrome 111, piso de sobra
  para una extension.

  Sin modificador el color no cambia: Tailwind pasa su variable de opacidad con 1 por defecto y la
  mezcla queda al 100%. Verificado en el CSS compilado.

  **Lo que se ve distinto**, que es exactamente el diseño que llevaba tiempo sin aplicarse:

  | Donde | Que aparece |
  |---|---|
  | `Badge` y `Surface` | borde tenue del color del estado en los cuatro tonos |
  | `Button` variante `danger` | su borde rojo al 25% |
  | Chat: pestañas, miembros, menciones, adjuntos, me gusta | fondo violeta tenue del estado activo |
  | Adjuntos, tarjetas de comunidad, info de sala | borde violeta al pasar el cursor |
  | Login | el halo suave bajo el logo |

  **Aviso metodologico.** El primer intento parecio no funcionar: las clases seguian sin generarse
  despues de tres comprobaciones. La causa no era el config sino un `dist/` obsoleto que Vite
  reutilizaba. Se llego a concluir que el problema era el anidamiento con `DEFAULT`, y una sonda lo
  desmintio. Por eso el detector gano un guardian que **falla si el CSS es anterior al codigo**: el
  error no fue de codigo, fue de sacar conclusiones de un build que ya no correspondia.

### 13.8.b - Los tres sub-items que alteran apariencia: EJECUTADOS el `2026-08-13`

Se verificaron uno por uno antes de tocarlos, y ninguno resulto ser el cambio neutro que el plan
suponia. Se mapearon a pantallas concretas, se presentaron asi al usuario y **los aprobo los tres**.
Ejecutados pantalla por pantalla, con las cuatro puertas en verde tras cada una.

Lo que aparecio al ejecutarlos, que el plan no anticipaba:

- **Dos variantes faltaban en la primitiva** y se agregaron ahi, no en el consumidor, que es lo que
  manda el propio sistema. `Button` gana `ghost-danger` (accion destructiva sin peso visual, para
  tarjetas densas como las de Agenda). `IconButton` gana `variant` y `shape`: el boton de enviar del
  chat de soporte era redondo por un `rounded-full` puesto encima del `rounded-md` de la primitiva, y
  eso **solo funcionaba por el orden en que Tailwind emite las utilidades**. Si ese orden cambiara,
  el boton se habria vuelto cuadrado sin que nadie tocara nada.
- **La paginacion de Leads no encajaba en la primitiva y se resolvio al reves.** Las flechas usaban
  `.btn-secondary` (con borde) al lado de numeros que son celdas sin borde, y forzarlas a los 34px de
  la primitiva las habria descuadrado respecto a los 32px de los numeros. Se igualaron al estilo de
  celda. De paso su hover pasa de `bg-gray-50`, que no tiene variante oscura y aclaraba sobre fondo
  oscuro, al token.
- **Un defecto encontrado al tocarlo:** el campo de mensaje del chat de soporte declaraba la clase
  `input-standard`, **que no existe en ningun CSS del proyecto**. Estaba sin borde, sin alto y sin
  padding. Pasa a la primitiva `Input`.
- Cuatro botones icono ganan `aria-label`, que no tenian (engranaje de Listas, las dos flechas de
  paginacion, el de enviar del chat). Adelanta parte de 13.9.

- [HECHO] Unificados los **30 botones** de las 8 pantallas con la primitiva `Button`, y retiradas
  las reglas `.btn*` de `index.css`: cero usos en TSX y cero apariciones en el CSS compilado.
  El plan lo daba por neutro. No lo era: son dos sistemas con medidas distintas. `.btn` usa padding `8px 16px`, fuente de
  14px y altura libre; `Button` usa altura fija de 34px, padding de 12px y fuente de 13px. Ademas
  `.btn-secondary` pinta el texto con `--ls-text` y `Button secondary` con `--ls-text-secondary`, y
  el hover de `.btn-ghost` es `--ls-surface` mientras que el de `Button ghost` es `--ls-primary-soft`
  con texto violeta. Migrar los 32 usos cambiaria el tamano, el peso visual y el hover de cada boton
  afectado. Es un rediseno, no un refactor.
- [HECHO] Eliminado `PageHeader.tsx`. Al buscar donde dolia aparecio que lo usaba **una sola
  pagina**, Plantillas, o sea que era la unica de toda la extension con titulo de 24px en negrita:
  de las 13 paginas, 10 no llevan titulo (la barra superior ya dice en cual estas) y Pipeline tiene
  uno de 20px. El encabezado pasa a `PageShell`, que ya envolvia a todas pero sin cabecera, mediante
  un mapa `PAGE_HEADER` junto a los de ancho y alto que ese fichero ya tenia. La descripcion se
  conserva; el titulo baja a los 17px del sistema.
- [HECHO, REFORMULADO] "Erradicar 94 colores literales". Al inventariarlos aparece que la
  premisa esta mal: **la mayoria no son estilo, son datos**. Son las paletas de `SMART_LIST_DEFS`,
  `STATUS_COLORS`, `SOURCE_CHANNEL_COLORS` y `BADGE_COLORS`: valores que se guardan, se serializan o
  se le pasan a una API. `BADGE_COLORS` en particular **no puede** ser un token, porque lo consume
  `chrome.action` desde el service worker, donde no hay DOM del que leer una variable CSS. Y de los
  que si son estilo, casi ninguno tiene "equivalente exacto": sustituir un `#ffffff` por
  `var(--ls-surface)` se ve igual en claro y **cambia en oscuro**, porque ese token se redefine.

  Los unicos tokens seguros de sustituir son los que **no** cambian entre temas (`--ls-primary` y
  familia, y los cuatro de estado), y para esos ya existe `palette.ts` como puente.

  Ejecutado asi: se agrega `src/design/colors.ts` con los unicos colores que **no** cambian entre
  temas, que es justo lo que permite tenerlos como constante sin mentir. Ahi apuntan `palette.ts`,
  `BADGE_COLORS`, `STATUS_COLORS`, `SOURCE_CHANNEL_COLORS`, las listas inteligentes y el color por
  defecto de una lista. Antes habia cinco copias sueltas de `#ef4444`.

  No se tocan las paletas de seleccion de color de Listas y Plantillas: son cajas de lapices con
  nombre propio ("Rojo Claro", "Azul"), y que un hexadecimal coincida con un token no las convierte
  en el mismo concepto. Tampoco la rampa violeta de `LossReasonsChart`, donde solo 1 de 4 valores
  coincide y la rampa es una unidad.

  Cambio visual: **ninguno**, verificado valor por valor contra `tokens.css`. La comprobacion queda
  como test (`colors.test.ts`, 9 casos) en vez de como comentario, y se confirmo que falla si se
  desincroniza un valor. Uno de los 9 vigila la premisa, no los valores: que ninguno de estos colores
  pase a redefinirse en modo oscuro, porque ese dia la constante empezaria a mentir.

- [PARCIAL] Las clases `.card-*`. Al mapearlas aparecio la diferencia clave con los botones:
  **`.card-standard` y la primitiva `Card` generan exactamente el mismo conjunto de clases**
  (`bg-surface border border-line rounded-lg shadow-card p-3`), asi que migrar no cambia nada visual
  y no necesita aprobacion. Con los botones no pasaba: ahi los dos sistemas tenian medidas distintas.

  **18 de 24 usos migrados**, verificados uno por uno con un script que compara el conjunto de clases
  resultante antes de tocar nada. Los `p-4` pasan a `padding="lg"`, que es el mismo `p-4`.

  `Card` gana `forwardRef` en el camino: la tabla de leads mide su propio ancho con un ref, y sin
  reenviarlo ese uso no podia adoptar la primitiva. No era una excepcion legitima, era una carencia
  de la primitiva.

  Los 6 que quedan tienen cada uno su razon, y ninguna es pereza:

  | Uso | Por que no |
  |---|---|
  | `TemplatesPage:199` | anade `bg-slate-50`, que pelea con el `bg-surface` de la primitiva |
  | `TemplatesPage:223` | anade `p-5`, que no existe como valor de `padding` |
  | `TemplatesPage:237` | estado seleccionado con `bg-primary-soft/30`, mismo conflicto de fondo |
  | `PipelinePage:155` | anade `border-2`, que pelea con el `border` de la primitiva |
  | `SendStep:29` | es un `<section>`, y `Card` renderiza un `div`. Cambiarlo seria perder semantica |
  | `VariableDropdown:26-27` | la clase se compone en una variable, no en el JSX |

  Los cuatro primeros se arreglan dando a `Card` variantes de fondo y de borde; los dos ultimos, un
  prop `as` y una pequena reescritura. Ninguno es urgente y todos cambian algo visible o estructural,
  asi que se dejan anotados en vez de forzarlos.

- [HECHO] (`2026-08-13`) `.card-title` migrado a la primitiva `CardTitle`. **0 usos de la clase**.
  El conteo anterior de "10" mezclaba dos cosas: 5 usos de la clase legacy y 5 del token
  `text-card-title`, que no es legacy y no habia que tocar.

  `CardTitle` gana un prop `as` en el camino. Migrar a ciegas habria bajado esos titulos de `h2` a
  `h3` "porque la primitiva dice h3", y esas paginas no tienen ni `h1` ni `h2`: el orden de
  encabezados habria quedado peor. Con `as="h2"` el render es identico y la decision de nivel queda
  explicita.

- [PENDIENTE] Lo que queda del sistema de tarjetas, ya sin `.card-title`:
  - `.card-header` (5 usos). No tiene primitiva equivalente; es un atajo de maquetacion
    (`flex justify-between items-center mb-2`). Decidir si merece primitiva o se inlinea.
  - Los 4 titulos inline de `FunnelReport` (`text-card-title font-medium text-ink`). Podrian usar
    `CardTitle`, pero la primitiva es `font-semibold` y estos son `font-medium`: **cambia el peso
    visual**. Requiere aprobacion.
- [HECHO] (`2026-08-14`) `dark:*` de **1022 a 796**, y las brechas de modo oscuro de **122 a 0**.

  **El item estaba planteado al reves y eso importa.** Decia "eliminar los `dark:*` ad-hoc porque
  `tokens.css` ya resuelve el tema", como si sobraran clases. Al ver la aplicacion en oscuro por
  primera vez, gracias a capturas del usuario, aparecio lo contrario: habia **122 bloques con un
  color claro fijo y ninguna clase `dark:`**. Como los tokens de texto si cambian con el tema, el
  resultado era **texto claro sobre fondo blanco**.

  Lo peor estaba en la pantalla principal. `LeadsTableRow` pintaba las filas con
  `bg-white hover:bg-gray-50` y el texto con `text-ink`, que en oscuro es casi blanco: **las filas de
  leads ya leidos eran ilegibles**. Igual la cabecera de la tabla, la columna fija de acciones, la
  casilla sin marcar, los selectores de periodo del Pipeline y las tarjetas de Overview.

  La transformacion correcta resulto tener dos pasos, y el segundo es el que le da sentido al
  enunciado original: la clase base pasa a su token, y **entonces** el `dark:` de esa misma propiedad
  sobra y se retira, porque dejarlo haria que el ad-hoc pisara al token justo en oscuro. De ahi salen
  las 226 clases `dark:` retiradas: no se borraron porque si, se borraron porque su base dejo de
  necesitarlas.

  Equivalencias medidas antes de aplicarlas, no elegidas a ojo. `bg-white` a `bg-surface` es
  **identico** en claro (`--ls-surface` vale `#ffffff`). Las de fondo desvian entre 1 y 5 unidades de
  RGB. Las de texto se movieron mas y a mejor: `text-slate-400`, con 14 usos solo en el detalle de
  lead, daba **2.56:1 sobre blanco**, muy por debajo del minimo de 4.5; con `text-ink-muted` da 4.77.
  `text-slate-700` pasa de 10.35 a 17.39.

  Aparecio ademas un residuo del barrido roto de la vez anterior: 21 `dark:backdrop-blur-md`
  huerfanos, que acompañaban a un `dark:bg-slate-800/80` retirado al tokenizar. Un desenfoque solo en
  oscuro sobre tarjetas opacas, que no hace nada. Se quitaron solo donde ya no quedaba ningun
  `dark:bg-` en el mismo bloque.

  Metodo conservado en `scripts/audit-dark-gaps.py` (encuentra las brechas) y
  `scripts/tokenize-fixed-colors.py` (aplica el mapa). **Aviso sobre el primero: se queda corto.**
  Solo mira dentro de `className`, y por eso no vio la fila de `LeadsTableRow`, cuya clase vive en una
  variable. Que marque cero no demuestra que no queden.
- [PENDIENTE] Barrer el patron prohibido de caja blanca redondeada. **82 usos de `bg-white` en 44
  archivos** al `2026-08-14`; eran 185 al abrir el bloque. La mayor parte cayo con la tokenizacion del
  modo oscuro, que era el mismo problema visto desde otro lado. Lo que queda son sobre todo elementos
  que si deben ser blancos en ambos temas (globos de chat sobre color, iconos sobre fondo tenido) mas
  un resto por revisar uno por uno; ya no hay un barrido mecanico que aplicar: `ListsPage.tsx:427,446`, `TemplateEditor.tsx:242`, `TemplatesPage.tsx:189,222`,
  `PipelinePage.tsx:137`.
- [PENDIENTE] Reducir los **131** anchos fijos en px y grids de columnas fijas en 68 archivos, criticos
  para sidebar angosto y movil.

### Capitulo 13.14 - Datos fabricados en el panel analitico (auditoria del `2026-08-14`)

**Frente nuevo. No estaba en el roadmap ni en la auditoria del `2026-08-11`.**

Varios componentes del panel analitico **muestran numeros inventados con apariencia de datos
reales**. No son placeholders visibles: llevan porcentajes, flechas de tendencia y unidades, y se
presentan junto a metricas que si son reales, lo que los hace indistinguibles.

Verificado leyendo cada componente:

| Componente | Que muestra | De donde sale |
|---|---|---|
| `QualityMatrix` | "Calidad de Leads por Fuente": volumen, win rate y ciclo | **literal en el codigo**: LinkedIn 126 / 15.2% / 12d, WhatsApp 178 / 12% / 5d... |
| `SourceBreakdownChart` | "Desglose por fuente" | el total real repartido por porcentajes **fijos**: 38.8 / 29.8 / 21.1 / 10.3 |
| `LossReasonsChart` | "Razones de descarte" | literal: Precio alto 42, No responde 28, Competencia 18 |
| `TimeInStageChart` | "Tiempo promedio por etapa" | literal: Nuevo 1.2d, Contactado 2.5d... |
| `DynamicAcquisitionChart` (modo apilado) | reparto por fuente de cada mes | el mismo reparto por porcentajes fijos; el comentario lo llama "mocked sources" |
| `OverviewTab` | "0% vs ayer" en tareas y respuestas | `calcTrend(x, 0)` y `calcTrend(0, 0)`, con un TODO al lado |

El caso mas claro esta en las capturas que el usuario mando el `2026-08-14`: el desglose mostraba
Web 749 (38.8%), WhatsApp 575 (29.8%), LinkedIn 407 (21.1%), Formulario 199 (10.3%). Son exactamente
esas constantes aplicadas a sus 1930 leads.

**Por que importa mas que un bug visual.** El resto de este roadmap trata de que no haya dos fuentes
de verdad y de que lo escrito coincida con lo real. Un panel que presenta constantes como analitica
es la misma clase de problema, pero apuntando al usuario en vez de al equipo: se toman decisiones
comerciales mirando numeros que no salen de ningun lado.

- [HECHO] (`2026-08-14`) `SourceBreakdownChart` conectado a datos reales. La migracion **099** agrega
  dos cortes a `get_my_dashboard_snapshot`: `originCounts` (manual, imported, web_form) y
  `channelCounts` (pb, general, retiro, form). **No son el mismo dato con otro nombre**: un lead
  cargado a mano tiene origen y no tiene canal, asi que sus totales no coinciden a proposito.
  `channelCounts` queda disponible aunque todavia no se pinte en ningun sitio.

  Un origen desconocido se muestra con su clave cruda en vez de descartarse: si aparece uno nuevo,
  conviene verlo.

- [HECHO] (`2026-08-14`) `LossReasonsChart` conectado, **capturando el dato que faltaba**. Migracion
  **100** (columna `leads.discard_reason` con indice parcial) y **101** (`lossReasons` en el
  snapshot), mas un dialogo que pregunta el motivo al descartar desde la accion masiva.

  Tres decisiones que conviene dejar escritas:

  - **El motivo es opcional.** Obligar a rellenarlo convertiria descartar en un tramite y la gente
    elegiria cualquier cosa para salir del paso, que ensucia el dato mas que dejarlo vacio. Hay un
    boton "Sin motivo" explicito.
  - **Los descartados anteriores quedan en nulo y se cuentan como "Sin motivo".** No se reparten
    entre categorias: nadie les pregunto, y repartirlos seria inventar otra vez el dato que este
    grafico existia para mostrar. Al principio esa barra sera casi todo, y esta bien: es el estado
    real y se encoge sola.
  - **El motivo se limpia si el lead sale de `descartado`**, para que no quede contradiciendo al
    estado ni contaminando el conteo.

- [HECHO] (`2026-08-14`) Los tres restantes, **sin capturar nada nuevo**: el dato ya estaba en
  `leads` y nadie lo estaba agregando. La migracion **102** suma tres cortes al snapshot y los tres
  componentes pasan a leerlos.

  | Componente | Campo nuevo | Se calcula con |
  |---|---|---|
  | `QualityMatrix` | `originQuality` | volumen, convertidos y ciclo por `metadata.origin` |
  | `DynamicAcquisitionChart` (apilado) | `monthlyByOrigin` | el conteo mensual desglosado por origen |
  | `TimeInStageChart` | `stageDurations` | `first_contacted_at - created_at` y `closed_at - first_contacted_at` |

  Tres decisiones que no se leen del codigo:

  - **El ciclo de venta promedia solo los convertidos.** Incluir los que siguen abiertos daria un
    numero que *baja* cuando entran leads nuevos, que es justo lo contrario de lo que la metrica
    quiere decir.
  - **`TimeInStageChart` ahora muestra dos barras, no cuatro.** `leads` no registra cuando el lead
    paso a "interesado", asi que dos de los cuatro tramos no existen. El grafico se ve mas vacio y
    esta bien: dos tramos ciertos valen mas que cuatro inventados. Para los otros dos haria falta un
    historial de cambios de estado, que es un frente propio.
  - **Las franjas del apilado son dinamicas.** Se ordenan por volumen total de la ventana, no por
    nombre, para que la franja grande quede abajo y no salte de mes a mes. Un origen desconocido se
    pinta con su clave cruda en vez de esconderse.

  Los promedios pueden venir nulos si todavia no hay ningun caso; el frontend los muestra como `—`,
  nunca como `0d`, porque un cero se leeria como "cierra el mismo dia".

- [HECHO] (`2026-08-14`) `OverviewTab`: los **tres paneles de abajo** estaban escritos en el JSX, no
  solo "Fuentes principales". Tambien "Conversion por etapa" (Nuevo 592, Contactado 2, tasa global
  0%) y "Hallazgos" (Mejor mes: Julio (596)). Ninguno necesitaba backend nuevo: salen de
  `originCounts`, `statusCounts` y `monthlyCounts`, que ya venian en el snapshot.

  El tercer hallazgo era un consejo redactado a mano ("Optimiza Web") que no dependia de ningun
  dato; se cambio por contactados sobre total, que si se mide.

- [HECHO] (`2026-08-14`) Las tres tarjetas de "Rendimiento hoy" y los tres anillos de metas.
  Habia **cuatro** problemas distintos, no uno:

  1. `completedToday` filtraba por `created_at`, asi que contaba tareas *creadas* hoy que
     estuvieran completadas. Una tarea creada el lunes y terminada hoy no aparecia. Migracion
     **103**: columna `tasks.completed_at` con trigger, porque una tarea se completa desde tres
     pantallas y si el sello lo pusiera cada una, bastaba con que a una se le olvidara para que el
     conteo volviera a mentir en silencio.
  2. La tendencia de tareas se calculaba contra un cero fijo (`calcTrend(x, 0)`), asi que siempre
     decia "0% vs ayer" con flecha verde. Migracion **104**: `completedCompare`.
  3. `MetricCard` y `GoalRingCard` tenian **"vs ayer" escrito en el JSX** e ignoraban el `label` que
     recibian. Con el periodo puesto en "mes pasado", la comparacion era mensual y el texto seguia
     diciendo "vs ayer".
  4. Los anillos pasaban la diferencia en unidades con un `%` pegado detras: cinco mensajes mas que
     ayer se mostraban como **"5%"**.

  Los cuatro se cierran con `calcularTendencia` (`src/components/dashboard/trend.ts`, 8 casos de
  prueba), que ademas distingue tres direcciones en vez de dos: **sin cambios ya no es verde**, y
  cuando no hay periodo anterior con que comparar muestra la diferencia absoluta (`+12`) en vez de
  inventar un porcentaje.

- [HECHO] (`2026-08-14`) La tarjeta **"Respuestas" se retiro**. Su valor estaba fijo en `0` y no
  podia cambiar: se reviso el esquema completo de la base (46 tablas) y **las respuestas de un lead
  no se registran en ninguna parte**. No era un numero inventado, pero tampoco una medicion, y
  ocupaba el sitio de algo que si se puede medir.

  En su lugar va **"Leads nuevos"** (`createdToday` / `createdCompare`, migracion 104). No es un
  rodeo para estimar respuestas: son leads entrados y se etiquetan asi.

  Capturar respuestas de verdad exige o un canal entrante (webhook de WhatsApp, buzon IMAP) o pedir
  al usuario que las marque a mano. Las dos cosas son un frente propio.

- [HECHO] (`2026-08-14`) El arrastre en el pipeline ya pregunta el motivo al soltar en "descartado",
  reusando el mismo dialogo de la accion masiva. Si se cancela **no se guarda nada** y el lead se
  queda donde estaba.

  Correccion a lo que decia este capitulo: **la edicion de ficha no descartaba**. `LeadForm` guarda
  el estado que ya tenia el lead pero no ofrece cambiarlo, asi que los caminos que descartan eran
  dos, no tres, y ahora los dos preguntan.

### Capitulo 13.15 - Guardas que existian y no se ejecutaban (`2026-08-15`)

Frente pequeno pero con un patron que conviene nombrar: **escribimos detectores y no los
enchufamos**. Un detector que nadie ejecuta es documentacion, no una guarda.

- [HECHO] (`2026-08-15`) `audit-dark-gaps.py` **salia siempre con codigo 0**, incluso con hallazgos:
  solo imprimia. Habria pasado por CI con los 122 bloques rotos igual que sin el. Ahora sale con 1 si
  encuentra algo, y esta en el workflow.

  Verificado en los dos sentidos, que es lo que da valor al cambio: con el arbol limpio sale 0, y con
  un `bg-white` sin contraparte metido a proposito en un archivo de sonda sale 1 y lo senala. Probar
  solo el caso verde habria dejado pasar un detector que nunca falla.

- [HECHO] (`2026-08-15`) `check:functions` estaba en `package.json` desde que se escribio y **nunca
  se anadio al workflow**. Ya esta. Sin credenciales enlazadas sale con 0 y un aviso, asi que en CI
  comprueba lo que puede sin romperse; el valor completo sigue siendo correrlo en local antes de un
  deploy.

- [HECHO] (`2026-08-15`) Trinquete de cobertura apretado. Estaba en 11 / 15 / 6 / 10 desde que la
  cobertura real era 11.67, y ya iba por **12.69 / 16.7 / 6.83 / 11.8**: se podia perder mas de un
  punto entero sin que el CI dijera nada. Subido a 12 / 16 / 6.5 / 11.

  Un trinquete que no se aprieta cuando sube la cobertura deja de ser un trinquete, y eso no se nota
  nunca, porque falla por omision.

- [HECHO] (`2026-08-15`) **El detector ni siquiera estaba en el repo.** `.gitignore` tenia `*.py` para
  descartar scripts sueltos de un solo uso, y de paso se tragaba `scripts/`. El paso de CI recien
  anadido habria fallado en el acto por archivo inexistente.

  Lo encontro `git status` al no listar un archivo que si se habia modificado. Es el mismo patron que
  el resto de este capitulo: la guarda existia en la maquina de quien la escribio y en ningun otro
  sitio. Corregido con `!scripts/*.py`; entran al repo `audit-dark-gaps.py` y
  `tokenize-fixed-colors.py`.

- [BLOQUEADO] Alinear `master` y `design` con `develop`. Estan **79 commits atras y 0 adelante**, asi
  que es un avance rapido sin conflictos posibles. El clasificador de permisos rechazo tanto
  `git branch -f` como el push. Queda del lado del usuario:

  ```
  git branch -f master develop && git branch -f design develop
  git push origin master design
  ```

- [BLOQUEADO] `ALLOWED_EXTENSION_IDS` (capitulo 13.4.e). Confirmado que **el secreto no existe** en el
  proyecto: se listaron los 13 configurados y no esta. El comando para ponerlo lo rechazo el
  clasificador.

### Capitulo 13.16 - Checklist visual por pantalla (absorbido de `ux-ui-checklist.md` el `2026-08-15`)

Venia de un documento aparte con **76 casillas, ninguna marcada**, aunque parte del trabajo estaba
hecho. Aqui queda contrastado contra el estado real del codigo.

**Fase 1, sistema visual base.** Cerrada casi entera por el bloque 7 (capitulo 13.8):

| Casilla original | Estado real |
|---|---|
| Unificar alturas de botones, inputs y selects | hecho, primitiva `Button` en 30 botones |
| Unificar radios de bordes por nivel | hecho, tokens |
| Unificar jerarquia tipografica | hecho, `CardTitle` y escalas de texto |
| Unificar colores semanticos | hecho, `src/design/colors.ts` con test contra `tokens.css` |
| Patron estable para headers de seccion | hecho, `PageHeader` eliminado y unificado |
| Contraste, hover, focus y disabled | hecho, incluido el fallo WCAG de `--ls-text-muted` |
| Unificar espaciado vertical entre secciones | **pendiente**, ligado a los 131 anchos fijos |
| Patron estable para toolbars y filtros | **pendiente** |
| Patron estable para cards, tablas y bloques | **pendiente**, es el item de tarjetas de 13.8 |

Las tres pendientes de la fase 1 **ya estan en 13.8** y no se duplican aqui: se siguen desde alli.

**Fases 2 a 10, por pantalla.** Son 67 casillas de rediseño (Leads, Pipeline, Enviar, Tareas,
Mensajes, Historial, Dashboard, Listas, Ajustes) mas una validacion final. Ninguna es deuda tecnica:
todas cambian apariencia, y por 13.1.c ninguna se ejecuta sin que el usuario mire el resultado.

Se conservan como estaban, sin marcar, porque describen un rediseño que no se ha emprendido:

- Fase 2 Leads (10), Fase 3 Pipeline (6), Fase 4 Enviar (8), Fase 5 Tareas (7), Fase 6 Mensajes (6),
  Fase 7 Historial (5), Fase 8 Dashboard (6), Fase 9 Listas (4), Fase 10 Ajustes (6)
- Validacion final (5): consistencia entre pantallas, build de produccion, densidad en el panel
  lateral, estados vacios, mensajes de confirmacion y error

El detalle casilla por casilla esta en el historial de git de `docs/planning/ux-ui-checklist.md`. No
se reproduce entero aqui a proposito: copiar 67 lineas de "rediseñar cabecera de X" a este documento
lo alargaria sin decir nada que el titulo de la fase no diga ya.

**Lo que si conviene retener:** el rediseño por pantalla es un frente propio, posterior al cierre de
13.8, y depende por completo de poder ver la aplicacion.

### Capitulo 13.17 - Links de retiro duplicados en Configuracion (`2026-08-16`)

Reportado por el usuario: cada link de "Retiro tecnico extranjero" aparecia **dos veces**, con
visitas distintas en cada fila y el mismo numero de leads.

- [HECHO] (`2026-08-16`) Migracion **105**. No habia links duplicados: `capture_links` tiene 7 filas y
  solo 2 son de retiro. La duplicacion la fabricaba `list_my_capture_links`.

  El CTE `progress` agrupaba por `(capture_ref, form_slug)` y el JOIN aceptaba **dos** slugs para un
  link de retiro:

  ```sql
  AND ( progress.form_slug = cl.link_type
        OR (cl.link_type = 'retiro' AND progress.form_slug = 'retiro-v2') )
  ```

  Mientras el formulario emitio un solo slug el JOIN encontraba una fila y todo se veia bien. Desde
  que hay eventos con los dos slugs para el mismo `capture_ref`, encuentra dos, y un `LEFT JOIN` que
  casa dos veces duplica la fila. Los leads salian identicos en ambas filas porque vienen de otro
  JOIN que si es uno a uno; esa pista es la que apunta al fan-out y no a un dato duplicado.

  Los cuatro numeros de la pantalla cuadran exactamente con los datos:

  | ref | `retiro` | `retiro-v2` |
  |---|---|---|
  | `3fn2er` | 54 visitas | 164 visitas |
  | `vwzrm2` | 1 visita | 5 visitas |

  **Arreglo:** agrupar por *familia* de formulario, quitando el sufijo de version con
  `regexp_replace(form_slug, '-v[0-9]+$', '')`. Suma las visitas de las dos versiones en una fila, que
  es lo que el usuario espera porque es el mismo formulario, y sobre todo **hace imposible la
  duplicacion por construccion**: tras el `GROUP BY`, el par `(capture_ref, form_family)` es unico, asi
  que el JOIN no puede devolver dos filas. Si aparece un `retiro-v3`, entra solo.

  Se descarto la alternativa evidente, añadir el slug nuevo a la condicion, porque es la misma
  solucion que ya fallo: enumerar versiones a mano deja el defecto esperando a la siguiente.

  Verificado despues de aplicar: los 7 links devuelven **una fila cada uno**; `3fn2er` queda con 218
  visitas (54 + 164) y `vwzrm2` con 6 (1 + 5).

- [HALLAZGO] La clausula del `OR ... 'retiro-v2'` **no existia en ninguna migracion de este
  repositorio**. Se aplico directamente contra la base en algun momento. La 105 la reemplaza y
  devuelve la funcion al historial versionado.

  Es el mismo patron que ya obligo a descargar `form-progress` desde produccion en vez de copiarlo del
  repo: cambios aplicados a mano que el git no registra. Conviene comprobarlo antes de dar por buena
  cualquier funcion.

- [EXTERNO] El disparador viene de `landing-gerow`, no de aqui. El formulario desplegado en
  `planespro.cl/retiro-tecnico-extranjero/` **cambio el slug que emite**: hasta el `2026-08-15` mandaba
  `retiro-v2` y desde ese dia manda `retiro`. Comprobado en produccion: el `app.js` que se sirve hoy
  declara `form_slug: "retiro"` y su token es `retiro-v5-progress-tracking`.

  Ese archivo se sirve desde `forms/retiro/app.js` de la rama `codex/seo-clicmed-aeo`, no desde
  `retiro-tecnico-extranjero/app.js` de `origin/master`, que sigue declarando `retiro-v2` y el token
  `retiro-v2-9`. Es decir: **la reorganizacion a `forms/` esta desplegada en produccion sin estar en
  `origin/master`**, que es el segundo caso de la misma clase que el del Worker `ppforms` descrito en
  `docs/integrations/landing-gerow-superficie-compartida.md`.

  Consecuencia que conviene tener presente: el historial de eventos de retiro queda **partido en dos
  nombres**. La 105 los vuelve a unir al mostrarlos, pero en la tabla siguen separados.

- [OBSERVACION] Los cuatro links de tipo `pb` muestran 0 visitas. No es efecto de este defecto: los 9
  eventos con `form_slug = 'pb'` tienen `capture_ref` nulo, asi que no hay nada que enlazar. Queda
  anotado por si resulta que el formulario `pb` no esta mandando el ref, que seria un problema propio.

### Capitulo 14 - Flujos de mensajes y variables de catalogo (abierto el `2026-08-16`)

Frente nuevo, pedido por el usuario: secuencias de mensajes con seguimiento por lead, y una variable
`{motivo}` con catalogo propio.

Se reviso con tres agentes antes de construir (infraestructura y datos, arquitectura frontend, UX y
accesibilidad). Lo que sigue recoge las decisiones ya tomadas; el detalle de la discusion esta en
`AI_SYNC.md` de esta fecha.

**Restricciones de dominio que condicionan todo el diseño.** No son opinables:

- WhatsApp se envia **abriendo una URL**. La aplicacion no sabe si el mensaje salio, llego o se leyo.
  `send_logs` registra la intencion en el clic.
- **No existe canal entrante.** Las respuestas de un lead no se registran en ninguna tabla. Por eso un
  paso no puede avanzar "cuando el lead responda", y por eso no habra ramificacion condicional.
- El correo si se envia de verdad, pero **no hay webhook de Resend**: "enviado" significa que la
  llamada a la API no fallo, no que llego al buzon.

**Decisiones del usuario (`2026-08-16`):**

- Un lead puede estar en varios flujos a la vez **pero no dos del mismo canal**. Los flujos son por
  canal, no multicanal: un flujo de llamado, uno de correo, uno de WhatsApp. La inscripcion activa es
  unica por lead y canal.
- El historial guarda copia del mensaje enviado, muestra el nombre del flujo, y debe seguir siendo
  legible aunque la plantilla se borre.
- En pantalla se dira **"Abierto en WhatsApp"**, nunca "Enviado". El correo si dice "Enviado".

- [HECHO] (`2026-08-16`) Migracion **106**: `send_logs` guarda `template_name`, `content`, `subject` e
  `is_html`.

  **El historial no guardaba nada**: reconstruia el mensaje buscando la plantilla por id en la lista
  viva. Dos consecuencias que nadie habia notado:

  1. Al borrar la plantilla, el mensaje desaparecia del historial. El nombre pasaba a `'?'` y, como
     `LeadDetailHistory` decidia si la fila se podia desplegar con `templateName !== '?'`, el registro
     quedaba sin poder abrirse.
  2. Al **editar** la plantilla, el historial mostraba el texto nuevo como si fuera el enviado. Este es
     el peor de los dos porque no se nota: un mensaje de julio se ve con el texto de agosto y parece
     correcto.

  Se guarda el mensaje **ya resuelto**, con las variables sustituidas y con la edicion temporal del
  compositor incluida. No es el texto de la plantilla: dos leads del mismo envio reciben textos
  distintos, asi que el registro pertenece al envio, no a la plantilla.

  Detalle que evita un fallo silencioso futuro: `buildLeadMessages` resuelve el texto **una sola vez**
  y el mismo objeto alimenta el registro y la apertura de WhatsApp. Si cada uno resolviera por su
  cuenta, bastaria con que uno cambiara para que el historial empezara a mentir sin que nada fallara.
  Hay cuatro casos de prueba sobre eso.

  Los envios anteriores quedan sin copia y **no se rellenan**: reconstruirlos desde la plantilla actual
  seria escribir como texto enviado algo que quiza no lo es, que es justo el defecto que se corrige. El
  frontend cae a la plantilla viva solo cuando no hay copia.

  Correccion a lo que el usuario recordaba: el contador de envios por lead y el historial desplegable
  en la ficha **no se habian perdido**, funcionan desde antes. Lo que fallaba era el caso de la
  plantilla borrada o editada.

- [HECHO] (`2026-08-16`) El correo con formato se abre en un dialogo en vez de en la tira de 128 px que
  sirve para el texto plano. Pedido explicito del usuario.

- [HECHO] (`2026-08-16`) Catalogo de motivos y variable `{motivo}`. Migracion **107**:
  `message_reasons` con RLS propia, y `templates.default_reason_id`.

  Habia urgencia real y no se habia notado: el usuario **ya tenia una plantilla usando `{motivo}`**
  ("WS Cold #1"), y ese texto salia con las llaves puestas al enviarlo, porque la variable no existia.

  **El valor no se ata a la plantilla.** La tentacion era una columna con el motivo, pero entonces
  cada motivo exige su propia plantilla y `{motivo}` deja de ahorrar nada: seria escribir el texto
  directo con un rodeo. Lo que si guarda la plantilla es un **valor por defecto**, que viene
  prellenado al enviar y se puede cambiar en cada envio. Asi se responde que si a "¿puedo elegir el
  motivo al crear la plantilla?" sin perder que una plantilla sirva para muchos motivos.

  **Se elige una vez por envio, no por lead.** Mandar a treinta personas es una decision, no treinta.
  Para motivos distintos, se separa el envio en dos tandas con el selector de destinatarios.

  **El selector solo aparece si la plantilla usa `{motivo}`.** Un control que no hace nada confunde
  mas de lo que ayuda. Se mira el cuerpo y tambien el asunto, porque un correo puede llevarlo en el
  titulo.

  **Sin motivo elegido, el token se deja intacto.** Borrarlo dejaria la frase coja ("Te escribo porque
  .") sin que nadie se entere; dejarlo visible avisa de que falta elegirlo. Es la misma regla que ya
  seguia `replaceVariables` con las variables que no sabe resolver.

  Vocabulario: en pantalla se llama **"motivo del mensaje"**, para no chocar con el "motivo" del
  dialogo de descarte (`leads.discard_reason`), que responde a otra pregunta.

  Un solo campo de texto por motivo, no etiqueta mas texto: el motivo es la frase que sustituye al
  token y esa misma frase es la que se lee en el desplegable. Si algun dia se alargan tanto que el
  desplegable se vuelve ilegible, agregar la etiqueta es aditivo.

  Los tres canales resuelven por el mismo sitio (`applyReason` en `waHelper`), asi que la vista previa
  y lo que se envia no pueden separarse. Once casos de prueba nuevos.

- [PENDIENTE] Generalizar el catalogo si aparece una segunda variable de este tipo (`{ciudad}`,
  `{plan_actual}`). Se dejo `message_reasons` especifica a proposito, contra la recomendacion del
  agente de datos, porque hoy hay **una** variable de catalogo y generalizar sin el segundo caso es
  diseñar a ciegas. La migracion a un catalogo generico es aditiva: una tabla de catalogos, y
  `message_reasons` pasa a ser una fila suya.

- [PENDIENTE] Tablas de flujos, pasos e inscripciones, con progreso por paso. El progreso **no se
  deduce de `send_logs`**: esa tabla no tiene referencia al flujo, asi que un envio manual de la misma
  plantilla contaria como paso completado, y ademas no hay donde expresar cuando toca el siguiente
  paso, que es justo lo que el usuario pide ver. La fila de progreso no copia lo enviado: apunta a
  `send_logs`.

- [PENDIENTE] Las tablas hijas necesitan `user_id` propio y un trigger que lo copie del padre. Una FK
  no impide insertar un paso apuntando al flujo de otro usuario: se pasa la RLS con el `user_id`
  propio mientras el `flow_id` es ajeno.

- [PENDIENTE] Vista "Hoy" como pantalla de entrada, no la lista de flujos. La pregunta del usuario
  ("que me falta enviar hoy") es transversal a todos los flujos.

- [DEUDA] (`2026-08-16`) Los avisos de lint suben de 116 a **121** con el catalogo de motivos: cinco
  efectos de carga asincrona nuevos (`useEffect` que hace `getAll().then(setState)` en los tres
  compositores y en la pagina de plantillas). Es exactamente la familia que el capitulo 13.3 clasifico
  como **no resoluble sin una capa de estado servidor**: `setState` despues de un `fetch` dentro de un
  efecto es el patron correcto mientras no haya cache. Se anota para que el numero no parezca un
  descuido.

- [HALLAZGO] (`2026-08-16`) El lint de fronteras **no impide que un componente importe un
  repositorio**. Solo bloquea `lib/supabaseClient`, `platform/web` y la creacion del cliente. La
  separacion de capas se sostiene por convencion, no por la guarda. Frente propio.

### Capitulo 13.9 - Accesibilidad WCAG 2.2

Frente nuevo, nunca registrado en este roadmap.

- [HECHO] (`2026-08-13`) **Ningun boton icono queda sin nombre accesible.** De 6 apariciones de
  `aria-label` a 20: cuatro llegaron al unificar botones en el bloque 7 (los que pasaron a
  `IconButton`, que lo exige por tipos) y las diez restantes se agregaron aqui.

  Dos decisiones que conviene dejar escritas:

  - **No se migraron a `IconButton`.** Estos diez viven en filas y tarjetas densas con `p-1` y
    `text-xs`; la primitiva mide 34px y los agrandaria. Eso es un cambio de apariencia, y la
    aprobacion que dio el usuario cubria los botones que se le describieron, no estos. El
    incumplimiento de WCAG 4.1.2 se cierra igual con el atributo, sin tocar nada visual. Migrarlos
    queda como pendiente aparte, del mismo tipo que `.card-*`.
  - **La etiqueta nombra el objeto, no solo la accion.** Un `aria-label="Eliminar"` repetido en una
    tabla de cincuenta leads no le dice a nadie *cual*: son cincuenta botones con el mismo nombre.
    Se usa `Eliminar ${lead.name}`, `Editar ${task.titulo}`, `Eliminar la lista ${list.name}`. El
    `title` se conserva porque sigue sirviendo al puntero.
- [HECHO] Los 16 archivos con `fixed inset-0` se revisaron uno por uno, y el item resulto ser
  **dos problemas distintos que el plan trataba como uno**:

  - **6 no son dialogos y no deben serlo**: los cuatro menus del chat, el menu de usuario y el cajon
    de navegacion. Usan `fixed inset-0` solo como capa invisible para cazar el clic. Un menu
    desplegable no atrapa el foco ni bloquea el scroll, y convertirlo en `Modal` cambiaria como se
    ve. Lo que si les faltaba es la tecla: **se cerraban unicamente con el raton** (WCAG 2.1.2).
    Resuelto con `useCloseOnEscape`, 8 tests. Sin cambio visual.
  - **6 eran dialogos y estan migrados** (`2026-08-13`, aprobado por el usuario): `ImportModal`,
    `SmartListSettingsModal`, `ProfileModal`, `SupportTicketModal`, la vista previa de
    `TemplateEditor` y el editor de `AdminFeaturesPage`. Eran 7 en la cuenta anterior:
    `SendConfirmModal` ya usaba la primitiva y entro en la lista por un `fixed inset-0` que estaba
    **dentro de un comentario**.

    Lo que se ve distinto: el panel pasa a `rounded-[8px]` con borde del sistema, donde antes cada uno
    elegia el suyo (`rounded-3xl` en soporte, `rounded-2xl` en perfil y admin, `rounded-xl` en la
    vista previa), y el fondo del overlay se unifica.

    Lo que se gana, que es el motivo real: cierran con **Escape** y con **clic fuera**, declaran
    `role="dialog"` y `aria-modal`, bloquean el scroll de atras y se montan por portal a
    `document.body`. Eso ultimo no es cosmetico: un elemento `fixed` deja de posicionarse contra el
    viewport si algun ancestro tiene `transform`, `filter` o `contain`, y estos vivian dentro de
    `<main>`, que ademas scrollea. Estaban a una clase de distancia de aparecer recortados.

    Con el ultimo consumidor migrado, `.modal-container` queda sin usos y se retira de `index.css`.
    Verificado que no aparece en el CSS compilado.
  - Los 3 restantes ya estaban bien o no aplican: `Modal.tsx` es la primitiva, `AttachmentLightbox`
    ya maneja Escape y `role="dialog"`, y `LoadingOverlay` no es interactivo.

  Sobre el hook: lleva una **pila** en vez de un listener por instancia, y la razon no es elegancia.
  Con un listener por hook, un Escape con dos menus anidados los cerraba los dos, porque todos
  cuelgan del mismo `document` y `stopPropagation` no detiene a los demas listeners del mismo nodo.
  Lo descubrio el test, que se escribio antes y fallo. Con la pila gana siempre el ultimo montado,
  que es el mas interno.

  Queda en la lista de exentos de la frontera de portabilidad, junto a los otros de mecanica web: en
  un telefono no hay tecla Escape, el gesto equivalente es el boton atras del sistema y se escucha
  con otra API entera.
- [HECHO] Corregido `focus:ring-offset-[#0a0a0a]` (WCAG 2.4.11) y el contraste de
  `--ls-text-muted` (WCAG 1.4.3). Ambos se cerraron en el bloque 7; el detalle y las mediciones
  estan en 13.8.a.

### Capitulo 13.10 - Higiene de repositorio (bloque 8)

Ejecutado el `2026-08-12`. La raiz del repositorio paso de 29 archivos versionados a 17, y los que
quedan son solo normativos (`PROTOCOLO_CONTROL.md`, `AI_SYNC.md`, `README.md`), configuracion y
puntos de entrada.

- [HECHO] Reorganizada la documentacion en `docs/` con `planning/`, `integrations/`, `auditorias/`,
  `redesign/`, `design-assets/` y `_revision/`. Indice en `docs/README.md`.
- [HECHO] Corregidas las referencias cruzadas tras el movimiento, incluidas las rutas absolutas de
  Windows que el protocolo tenia escritas a mano y que rompian el documento en cualquier otra maquina.
- [HECHO] Eliminado el codigo muerto, reverificado archivo por archivo antes de borrar:
  `ChannelPerformanceChart.tsx`, `InsightsPanel.tsx`, `ListEditor.tsx`, `LayoutContext.tsx` y el asset
  `assets/img/icons/leadseed-icon.png`.
- [HECHO] Eliminada la dependencia `dotenv`, declarada y sin un solo uso.
- [HECHO] Renombrada la carpeta `rediseño leadseed/` a `docs/redesign/`, sin espacios ni tildes.
- [HECHO] Retirado el `console.log` de arranque de `src/main.tsx`.
- [HECHO] `package.json` renombrado de `leads-crm-extension` a `leadseed`.
- [HECHO] PDFs de diseno movidos a `docs/design-assets/` con nombres sin mayusculas ni parentesis.

Precision sobre el peso del repositorio: la auditoria proponia "sacar los PDFs del arbol de git" para
recuperar 3.7 MB. Eso es incorrecto y no se hizo. Dejar de trackear un archivo **no reduce el tamaño
del clon**, porque los blobs siguen en el historial. Solo una reescritura de historial lo lograria, y
eso invalida cualquier clon existente. Se ordenaron, no se purgaron.

- [HECHO] (`2026-08-13`, decidido por el usuario) Eliminada `docs/_revision/` entera, 2962 lineas.
  - `handoff-2026-07-30.md`: sus decisiones de arquitectura de alertas, que solo estaban ahi, se
    verificaron contra el codigo actual y se movieron al capitulo 13.1.d. El resto del documento
    estaba contradicho por el codigo: declaraba comunidad, foro y chat fuera de alcance, y los tres
    existen.
  - `pb-form-redesign-2026-07-29.md`: no aporta nada que no este ya, verificado y mas actualizado, en
    el contrato de formularios y el contexto de landing-gerow, ambos en version 2.0.
  - `implementation_plan.md`: absorbido por este roadmap, que es lo que ya venia pasando de hecho.
    Requeria un cambio normativo y se hizo en el mismo movimiento: el protocolo lo citaba en **siete
    sitios** y todos apuntan ahora al roadmap. Sin eso el protocolo habria quedado exigiendo mantener
    al dia un archivo inexistente, que es peor que el problema que se queria resolver.

### Capitulo 13.11 - Correccion de la documentacion normativa (bloque 9)

- [HECHO] Reescrito `docs/integrations/landing-gerow-cloudflare-context.md` (version 2.0, `2026-08-12`).
  Los nueve puntos falsos estan corregidos y tabulados en su seccion 2, contra `origin/master` y contra
  los servicios desplegados. De paso salio el hallazgo que corrige los dos primeros items de 13.5.
- [HECHO] (`2026-08-13`) Actualizado `planespro-form-integration-contract.md` a version 2.0. Los
  cuatro canales, el protocolo de dos fases con sus tres RPC y sus reglas de validacion, y el
  endpoint corregido: publicaba la URL cruda de Supabase cuando los formularios llaman al dominio
  branded, y no podrian hacer otra cosa porque la CSP de `landing-gerow` no incluye `*.supabase.co`.

  **Al verificarlo aparecio un defecto real en produccion, ya corregido y desplegado.**
  `normalizeSourceChannel` aceptaba solo `pb` y `general`, y como la funcion sobreescribe
  `source_channel` en el payload antes de llamar al RPC, un `retiro` declarado se convertia en
  `general` o en `pb` y el RPC nunca veia el valor original.

  Con ref el resultado final salia bien igual, porque `resolve_planespro_booking_context` adopta el
  `link_type` del link y corrige. Sin ref no: el lead quedaba etiquetado `general` y, sobre todo, la
  rama "siempre admin" que la migracion 090 agrego a proposito para `retiro` **era codigo
  inalcanzable**, porque su condicion es `v_source_channel = 'retiro'` y ese valor no llegaba nunca.
  El respaldo volvia a depender del correo hardcodeado que esa migracion queria dejar de usar.

  Corregido en `form-leads` y `form-lead-abandoned`, que compartian el codigo: la lista de canales
  refleja ahora `form_types`, y la deduccion mira la **ruta antes que el ref**, porque un ref existe
  en los tres tipos de formulario y por si solo no dice de cual viene. Ambas desplegadas y
  verificadas con preflight.
- [HECHO] Archivados `HANDOFF_NEXT_SESSION.md` y `pb_form_redesign_handoff.md` en `docs/_revision/`.
  Duplicaban items ya cerrados en 13.10.
- [HECHO] Eliminado `implementation_plan.md` junto con el resto de `docs/_revision/`. Detalle y
  cambio normativo asociado en 13.10.
- [HECHO] (`2026-08-15`) Fusionado `docs/planning/ux-ui-checklist.md`: su contenido vive ahora en el
  capitulo 13.16 y el archivo se elimino, junto con su fila en `docs/README.md`.

  Al absorberlo aparecio por que llevaba tanto sin tocarse: **sus 10 fases tenian las 76 casillas sin
  marcar**, incluidas nueve que el bloque 7 ya habia cerrado. Un checklist que no refleja lo hecho no
  se consulta, y uno que no se consulta se queda atras: era una tercera lista de trabajo compitiendo
  con este roadmap y con el protocolo.
- [HECHO] Documentacion reorganizada en `docs/`. Duplicaba el item ya cerrado en 13.10.

### Capitulo 13.12 - Deuda de datos y rendimiento

- [PENDIENTE ESTRUCTURAL] Definir un modelo unico de migraciones. `sql/migrations/` y
  `supabase/migrations/` estan hoy sincronizadas byte a byte, pero el modelo dual ya provoco
  colisiones de numero en `036` y `090`. Recomendacion: `supabase/migrations/` como unica fuente de
  verdad, y `sql/migrations/` generada automaticamente o retirada. Esto cierra el pendiente historico
  del capitulo 2.3.
- [PARCIAL] `list_my_forgotten_leads`. **`pg_trgm` con indice GIN aplicado en produccion el
  `2026-08-13`** (migracion 098). El buscador usa `ilike '%token%'`, y un comodin inicial inutiliza
  cualquier B-tree: cada busqueda recorria entera la lista de olvidados del usuario, que en la cuenta
  de referencia son **1927 de 1930 leads**.

  Hubo que tocar tambien la funcion, y el motivo no es evidente: para que el planificador use un
  indice de expresion, la expresion indexada debe coincidir **exactamente** con la del `where`, y la
  funcion usaba `concat_ws`, que Postgres declara STABLE y por tanto no se puede indexar. Se
  sustituyo por concatenacion con `||` y `coalesce`, que si es inmutable.

  El resultado de la busqueda no cambia: la unica diferencia es que `concat_ws` omite los nulos y la
  nueva deja un espacio de mas, y como los tokens se parten por espacios antes de comparar, ninguno
  puede contener uno.

  **Metodo, que aqui importo.** El primer intento reescribio la funcion a mano y **truncó el
  `ORDER BY`**: se perdieron los casos de `healthSystem`, `isapre` y `comuna`, que ordenan leyendo
  dentro de `metadata`. Habria roto el orden por esas tres columnas sin que nada fallara. Se
  descarto y se regenero la migracion **derivandola del texto de 063**, sustituyendo solo el filtro
  de busqueda. Verificado despues, comparando ambas funciones sin comentarios ni espacios, que la
  unica diferencia entre las dos es esa expresion.

- [PENDIENTE] Migrar `list_my_forgotten_leads` a paginacion por cursor. Se separa del item anterior a
  proposito: cambia la firma del RPC y el contrato con la bandeja, asi que toca frontend y no es una
  optimizacion transparente como el indice. Hoy usa `ilike` con comodin inicial sin indice de soporte, `OFFSET`, y un `NOT EXISTS`
  correlacionado.
- [HECHO] Corregido el orden de columnas para el patron de `get_my_dashboard_snapshot`.
  Migracion `097_send_logs_dashboard_index.sql`, **aplicada en produccion el `2026-08-13`** junto con
  la de reconciliacion del dia anterior. El `NOTICE` de Postgres al aplicarla
  (`relation "leads_form_submission_id_uidx" already exists, skipping`) confirmo en la practica lo que
  esa migracion afirmaba pero no se habia podido verificar: sus objetos ya estaban en produccion.

  Dato que hay que tener presente antes de aplicarla: `db push` arrastra **dos** migraciones, no una.
  La otra es `20260812000100_reconcile_form_lead_two_phase_submit.sql`, escrita el dia anterior al
  cerrar la doble fuente de verdad con `landing-gerow`. Es idempotente por construccion
  (`create index if not exists`, `create or replace function`) y su contenido se copio de la version
  que ya corre en produccion, pero **eso no se pudo verificar contra el esquema real**: el volcado
  con `supabase db dump` tambien quedo bloqueado. Si esas dos funciones hubieran derivado desde
  entonces, el `create or replace` las sobreescribiria, y tocan la ruta publica de captura de leads.
  El modo de fallo del indice unico, en cambio, es benigno: si hubiera `form_submission_id`
  duplicados la transaccion se revierte entera.

  Al verificar la consulta real antes de tocar nada, el hallazgo fue mas concreto que lo que decia la
  auditoria. Seis de los ocho conteos filtran por `user_id` y `template_type` con rango en `sent_at`.
  `send_logs_user_lead_type_idx (user_id, lead_id, template_type)` mete `lead_id` en medio, y como la
  consulta no filtra por esa columna el recorrido se corta en `user_id`: la tercera columna de un
  indice solo sirve si las dos anteriores estan fijadas. Se crea
  `send_logs_user_type_sent_at_idx (user_id, template_type, sent_at desc)`.

  De paso, el indice viejo se reduce a su prefijo util `(user_id, lead_id)`: se reviso consulta por
  consulta y **ninguna** fija `user_id` y `lead_id` y ademas filtra por `template_type`, asi que esa
  tercera columna no la aprovechaba nadie. La migracion lleva la tabla de que consulta va a que
  indice y su bloque de reversion.
- [HECHO] (`2026-08-15`) Separados los scripts de reparacion de datos de las migraciones de esquema.
  Creado `sql/data-repairs/` con la regla escrita, y `sql/README.md` documenta ya los cuatro
  directorios (`migrations`, `seeds`, `data-repairs`, `diagnostics`).

  **Los dos historicos no se mueven, y conviene entender por que.** `036_planespro_capture_ref_recovery`
  y `037_repair_historical_pb_owner_assignments` estan aplicados en produccion y espejados en
  `supabase/migrations/` como `20260601000037` y `20260601000038`, que es el libro de registro que lee
  el CLI. Renombrarlos o sacarlos de ahi desincroniza ese registro con el remoto. Ordenar dos archivos
  historicos no compensa tocar el unico sitio donde consta que se aplicaron: la regla es **hacia
  adelante**.

  El criterio que separa una cosa de la otra, que era lo que faltaba: una migracion de esquema debe
  aplicarse sobre una base vacia y una reparacion de datos no tiene nada que hacer ahi. Mezcladas, el
  historial deja de ser reproducible, porque quien levante el proyecto desde cero arrastra
  correcciones de incidentes que en su base nunca ocurrieron.

  Matiz sobre la `036`: define `resolve_planespro_capture_ref_from_payload`, que es esquema de verdad
  y sigue en uso, **y ademas** repara filas. Es mitad y mitad; hoy se escribiria en dos archivos.
- [HECHO] (`2026-08-12`) `AbortController` con timeout en las llamadas a Resend y Google, via
  `supabase/functions/_shared/http.ts`. **18 puntos de llamada** en ocho funciones, mas de los 12 que
  estimaba la auditoria.

  El limite es de 15 s y queda por debajo del corte de ejecucion de una Edge Function a proposito:
  la idea es fallar nosotros, con un mensaje que se entienda en un log, antes de que nos corten sin
  explicacion. El helper encadena un `signal` que traiga el llamador en vez de pisarlo, y distingue
  el aborto por reloj del aborto pedido, porque `AbortError` no dice quien fue.

  Incluida tambien la llamada de `form-leads` a `google-calendar-create-event`, que la auditoria no
  listaba por ser interna: encadena hacia Google y hereda su latencia, asi que un Google lento
  colgaba el guardado del lead, que es lo unico que el usuario esta esperando de verdad.

  **Desplegado el `2026-08-13`.** Las siete funciones afectadas (`form-leads`, `send-email` y las
  cinco de `google-calendar-*`), en ese orden de riesgo creciente: primero
  `google-calendar-sync-attendees` como prueba de que Deno resuelve el nuevo `_shared/http.ts` en el
  bundle, y `form-leads` de ultima por ser la ruta publica de captura. El CLI confirma que sube
  `_shared/http.ts` junto a cada una.

  Antes de tocar `form-leads` se comprobo que su diff contra la version adoptada de produccion
  (`ea03ac6`) fueran **solo** los tres cambios de timeout, sin arrastrar nada mas.

  Verificacion posterior: preflight `OPTIONS` a `/api/form/leads`, `/api/form/leads/abandoned` y
  `/api/form/progress`, los tres 204. Un preflight arranca la funcion, asi que un import roto habria
  salido ahi. `GET /api/public/availability` sigue en 200 como control, y las tres paginas publicas
  (`/pb/`, `/form/`, `/retiro-tecnico-extranjero/`) en 200.

  Matiz sobre `npm run check:functions`: valida **propiedad** (de que repo salio el deploy), no
  contenido. Que diga "sin deriva" no demuestra que el codigo nuevo este vivo; eso lo demuestran los
  preflights.

### Capitulo 13.13 - Retiro final de Cloudflare

- [PENDIENTE ESTRUCTURAL] Migrar `ppusers` fuera de `FORMS_DB` (D1 `ppforms_db`) y `FORMS_UPLOADS`
  (R2 `ppforms-uploads`). Mientras siga montado ahi hay dos fuentes de verdad de leads, que es
  exactamente lo que la regla 16.2 del protocolo prohibe.
- [APLAZADO CON MOTIVO] (`2026-08-15`) Anadir `*.supabase.co` a `connect-src` en `_headers` de
  `landing-gerow`. **No se hace ahora, y es deliberado.**

  Verificado en `origin/master`: `_headers` no menciona supabase, y los formularios funcionan porque
  van contra `https://form.planespro.cl`, que si esta permitido. Esta entrada de CSP no arregla nada
  hoy: es un prerrequisito de un cambio que todavia no se ha decidido, que los formularios dejen de
  pasar por el proxy.

  Abrir un destino en la politica de seguridad para algo que nadie usa todavia amplia la superficie
  sin ninguna contrapartida, y ademas se olvidaria de retirar si el corte del proxy no llega a
  hacerse. Va **en el mismo cambio** que apague el proxy, no antes.

  Se llego a preparar el arbol de trabajo aislado para hacerlo y se descarto al ver esto; se deshizo
  sin dejar rama ni worktree. `landing-gerow` ya acumula dos ramas sin mergear, y una tercera
  huerfana que nadie va a desplegar es coste, no avance.
- [PENDIENTE] Migrar `ppcrm` (`admin.planespro.cl/crm`).
- [HECHO] (`2026-08-13`) Retirada la ruta `POST /api/form/appointments` de la documentacion. Se
  comprobo que sigue devolviendo **404** en produccion y que **no queda ninguna referencia a ella en
  el codigo**, ni en la extension ni en las Edge Functions: solo la citaban documentos. Los dos
  documentos vigentes (`landing-gerow-cloudflare-context.md` y el contrato de formularios, ambos en
  version 2.0) ya no la declaran como ruta valida, la listan como correccion de lo que la version
  anterior afirmaba de mas.

---

## Punto exacto actual al 2026-08-12

Este bloque se reescribio tras la **segunda auditoria** (cinco agentes independientes sobre los 28
commits del 2026-08-12). La version anterior seguia listando como abierto lo que la Seccion 13
declaraba cerrado, y viceversa. Ironicamente acertaba en algo que un `[HECHO]` negaba.

Verificado por auditoria independiente:

- **Correccion: cero bugs.** Se revisaron uno por uno los diez sitios de conversion de `confirm()`
  sincrono a asincrono. Todos con `await` correcto; no hay inversion de logica ni borrado sin
  confirmar. Veredicto: aprobado.
- **Seguridad: cero criticos, cero altos.** El CORS de `form-lead-file` ya desplegado es correcto: la
  allowlist usa comparacion exacta y la autorizacion real no depende de CORS sino del Bearer token
  mas la validacion de propiedad del lead. Las doce declaraciones de `verify_jwt` se contrastaron una
  a una contra el codigo: ninguna funcion quedo desprotegida.
- 193 tests, `npm run build` en verde, historial git lineal.
- La capa de datos sigue solida: 48 tablas, todas con RLS.

Lo que la auditoria encontro mal, y que la Seccion 13 daba por cerrado:

- **`form-leads` sigue desplegada desde `landing-gerow`.** Estaba marcado `[HECHO]`. El source se
  adopto, la propiedad del deploy no. `npm run check:functions` falla hoy.
- **La regla de frontera tenia un hueco real** en `services/` y `config/` por colision de claves en
  flat config. Estaba declarado cerrado con la frase "una frontera con un hueco no es una frontera".
  Corregido y verificado empiricamente con archivos de prueba.
- **La regla medía el sintoma, no la propiedad.** Prohibia cuatro identificadores mientras quedaban
  20 usos de DOM en la capa de dominio y diez imports directos de `platform/web`, que arrastran
  `chrome.*` al grafo de modulos igual que antes. Corregido: la deuda real son 29 marcas contables.
- **Los puertos son interfaces, no un seam.** El agregado `Platform` no tiene ni un consumidor y no
  hay inyeccion. El bloque 5 **no** esta cerrado.
- Varias cifras del roadmap eran falsas y un emoji seguia vivo en la UI pese a estar registrado como
  norma. Corregidos.

Lo que sigue abierto de verdad:

- propiedad del deploy de `form-leads` (requiere decision del usuario)
- inyeccion real de la plataforma: sin ella, el nucleo no corre en Expo
- 29 marcas `DEUDA BLOQUE 5` contables con `grep -rc "DEUDA BLOQUE 5" src`
- cobertura de tests del 11,6%, sin umbral minimo configurado
- validacion E2E de Google Calendar y Meet, abierta desde julio
- validacion funcional final del envio real por Gmail
- retiro o encapsulamiento final de `emailjs`
- `ppusers` como segunda fuente de verdad de leads
- la rama `fix/reconcile-ppforms-retirement-with-tracking` de `landing-gerow`, sin mergear

**Leccion metodologica, registrada para que no se repita.** El patron de error de las 28 primeras
entregas fue consistente: *declarar una propiedad como conseguida cuando lo conseguido era que la
comprobacion pasara*. Ocurrio tres veces (frontera de Supabase, bloqueador del DOM, marcas de deuda).
La contramedida adoptada no es prometer mas cuidado, sino tres cambios verificables:

1. toda regla nueva se comprueba con un archivo de prueba que debe fallar, no leyendo la config
2. `reportUnusedDisableDirectives: 'error'` hace que una marca de deuda sobrante rompa el CI, asi que
   el contador no puede mentir hacia arriba
3. las marcas viven en el archivo afectado y no en una lista central, porque una lista central
   acumulo cuatro entradas inertes sin que nadie lo notara
