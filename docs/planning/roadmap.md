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
- [PENDIENTE] Auditar si `PROTOCOLO_CONTROL.md`, `AI_SYNC.md`, `docs/_revision/implementation_plan.md` y este roadmap siguen totalmente alineados despues de la fase de agenda.

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
- [PARCIAL] Borrado admin de mensajes de chat. El codigo y las dos migraciones existen en el arbol de
  trabajo pero no estan commiteados al `2026-08-11`. Bloque a medio cerrar.
- [PENDIENTE] Dividir `src/components/chat/ChatRoom.tsx`: 1097 lineas, ~30 `useState`, ~680 lineas de
  JSX. Es el archivo de mayor riesgo de mantenibilidad del repositorio.
- [HECHO] Resuelto el bloqueo sobre `EmojiPicker.tsx`. El usuario definio el `2026-08-12` la frontera
  exacta de la prohibicion, incorporada al protocolo como precision `10.1.a`: la regla aplica a todo
  emoji escrito en codigo, y no aplica a emojis que el usuario final elige y envia como contenido de
  un mensaje. `src/components/chat/EmojiPicker.tsx` queda como **excepcion legitima** y se mantiene.
- [PENDIENTE] Retirar el centinela con emoji de `ChatRoom.tsx:225` y `:376`. Correccion de la
  auditoria: no se persiste como contenido del mensaje, alimenta solo el fingerprint interno del
  anti-spam (`guard.verify` / `guard.confirmSent`). Sigue prohibido por `10.1.a` (emoji escrito en
  codigo) y se sustituye por una marca ASCII sin cambio de comportamiento.

### Capitulo 12.2 - Tipos de formulario y canales de captura

Base: commits `9e60aae`, `f04729f`, `a351b59`.

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

- [HECHO] Resuelta la doble fuente de verdad de `supabase/functions/form-leads/index.ts`. Se adopto en
  este repo la version desplegada en produccion (690 lineas, con el despacho de tres vias). La copia
  anterior de 584 lineas queda reemplazada.
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
- [PENDIENTE] Commitear el bloque completo, incluido el trabajo de borrado admin de chat que seguia
  sin commitear.
- [PENDIENTE] Migrar `form-progress` a este repo. No se movio porque al `2026-08-12` su copia en
  `landing-gerow` tiene cambios sin commitear; mover un archivo sucio crearia el mismo drift que este
  bloque busca cerrar.
- [BLOQUEADO] Eliminar `supabase/functions/` y `supabase/migrations/` de `landing-gerow`. Ese repo
  tiene al `2026-08-12` **1368 archivos sin commitear**, esta parado en la rama `fix/agenda-url-bug`
  (no `master`), y tiene tres worktrees activos. Borrar ahi en ese estado es inseguro. Requiere una
  pasada de ordenamiento propia de `landing-gerow` antes.
- [PENDIENTE] Anadir un check de CI en `landing-gerow` que falle si reaparece `supabase/functions/`.

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

- [PENDIENTE] Pushear los 4 commits pendientes de `develop`.
- [PENDIENTE] Avanzar `master` (66 commits atras) hasta `develop` por fast-forward.
- [PENDIENTE] Decidir el destino de la rama `design`, hoy un alias rezagado de `develop`.
- [PENDIENTE] Coordinar el merge de `fix/reconcile-ppforms-retirement-with-tracking` a `master` en
  `landing-gerow`. Sin ese merge, un deploy desde `master` pierde el formulario de retiro y el
  tracking.

### Capitulo 13.3 - Red de seguridad (bloque 2, prerrequisito)

Estado del bloque al `2026-08-12`: `parcial`. Los cuatro gates existen y estan en verde.

- [PARCIAL] Vitest instalado con 57 tests en verde sobre `tokenizeSearch`, `rutNormalizer` y
  `mentionParser`. Quedan pendientes `utils/importParser.ts`, `utils/smartLists.ts` y el mapeo de
  `services/leadsService.ts`.
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
  - Estado: `0 errores, 214 warnings`.
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
- [PENDIENTE] Endurecer `tsconfig.json`: `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess`, `paths` para el alias `@`, y un `tsconfig.node.json`. Se deja para
  despues de bajar el volumen de warnings, porque hoy anadiria ruido sobre ruido.
- [PENDIENTE] Reducir los 214 warnings por bloques. No son un objetivo en si: bajan solos al ejecutar
  13.4, 13.6 y 13.7.

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

- [PENDIENTE] Migrar las ~40 copias inline de `error instanceof Error ? error.message : '...'` al
  helper canonico. Se dejan para una pasada propia: cambian texto visible por el usuario (para mejor,
  porque hoy muestran el generico donde deberian mostrar la causa), y conviene revisarlas por
  superficie en vez de en un barrido.
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
- [HECHO] Nombres de canal realtime unicos por suscripcion. Ya no queda ningun `.channel()` con
  nombre literal en `src/`. 12 tests.

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

  Con las once declaraciones en `config.toml`, el estado correcto pasa a ser el que el repo describe
  en vez de depender de que quien despliegue recuerde un flag. `form-progress` no se declara aca
  porque su source todavia vive en `landing-gerow`.
- [PENDIENTE] Sacar el cliente Supabase de `hooks/useRealtimeRefresh.ts` y `services/realtimeService.ts`
  hacia repositorios.
- [PENDIENTE] Corregir el CORS de `supabase/functions/form-lead-file/index.ts`, que refleja cualquier
  origin a diferencia del resto de funciones.
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

- [PENDIENTE] Sigue sin mergear `fix/reconcile-ppforms-retirement-with-tracking`, que ademas del fix
  de routing contiene el formulario de retiro y el tracking. Se aplico solo la correccion minima, no
  la rama entera. Esa rama sigue siendo deuda abierta.
- [PENDIENTE] Cuantificar el impacto: cuantos leads entraron mal atribuidos mientras duro la
  regresion. El commit desplegado roto era `c3315ed7`; su fecha acota la ventana.

Nota para la migracion: el estado correcto de `_redirects`, `_routes.json` y las Pages Functions es
exactamente lo que hay que llevarse al proyecto nuevo. Arreglar esto no es un desvio, es preparar el
bloque 4.

### Capitulo 13.5 - Consolidacion de formularios en LeadSeed (bloque 4)

Principio: la extension y los formularios publicos no comparten runtime. La consolidacion es de codigo
fuente y de deploy, no de bundle.

- [PENDIENTE] Crear `public-forms/` como carpeta hermana con `package.json`, build, CI y deploy
  propios.
- [PENDIENTE] Mover `forms/{pb,form,retiro,retiro-v2}` y `frontend/lead-capture/` desde `landing-gerow`.
- [PENDIENTE] Extraer un unico `shared/form-api-client.js`. Hoy hay cuatro implementaciones
  independientes del normalizador de rutas mas `retiro-v2` que hardcodea rutas legacy.
- [PENDIENTE] Borrar las copias muertas versionadas (`pb/app.js`, `form/app.js`,
  `.codex-tmp/deploy-clean/`).
- [PENDIENTE] Garantizar el aislamiento: `public-forms` excluido de `tsconfig.json` y de la config de
  Vite, sin imports cruzados con `src/`, CI filtrado por `paths`.
- [PENDIENTE] Arreglar `retiro-v2` antes de desplegarlo: canal invalido, sin idempotencia, y redirige a
  Hotmart tanto si el lead se guardo como si fallo.
- [PENDIENTE] No mover las Edge Functions a `public-forms/`: sirven tambien a la extension.

### Capitulo 13.6 - Preparacion para app movil (bloque 5)

Hallazgo clave: el acoplamiento que bloquea el port no es Chrome (93 usos bien contenidos en 18
archivos) sino el DOM dentro de hooks de dominio.

- [PARCIAL] `src/platform/` creado con los dos primeros puertos, `Dialogs` y `Navigation`, en
  `types.ts`, mas su implementacion web en `web.ts`. Quedan por extraer los otros siete:
  `KeyValueStore`, `Notifier`, `BadgeCounter`, `OAuthLauncher`, `BackgroundScheduler`,
  `AppMessageBus` y `Deeplink`.
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

- [PENDIENTE] Los `window.location.hash` que quedan viven solo en `components/` y `pages/`, que es la
  capa web y se reescribe para movil. No los cubre la regla de frontera de ESLint a proposito.
- [PENDIENTE] Sacar `chrome.storage` de los componentes `DataManagement.tsx:60` y
  `EmailSender.tsx:188`, y de `useEmailChannels.ts:329`.
- [PENDIENTE] Evaluar TanStack Query como capa unica de estado servidor. Hoy no hay cache: cada
  guardado cuesta del orden de 8 consultas por doble disparo entre refetch manual y evento realtime de
  la propia escritura, y no hay guard de "ultima respuesta gana" en la bandeja.
- [PENDIENTE] Mover a `src/types/` los tipos de dominio que hoy viven en hooks y utils.

Frontera de portabilidad estimada: reutilizable tal cual `src/types/**`, `src/repositories/**`, la
mayoria de `src/services/**` y `src/utils/**`.

### Capitulo 13.7 - Division de archivos grandes (bloque 6)

Por orden de riesgo: `ChatRoom.tsx` (1097), `useLeadsPageController.ts` (578, devuelve un objeto de 70
propiedades), `leadsRepository.ts` (535), `useLeadDetail.ts` (493), `ListsPage.tsx` (480),
`AdminUsersPage.tsx` (455), `AgendaSettings.tsx` (438), `useEmailChannels.ts` (433),
`FormTypeLinksSection.tsx` (428).

- [PENDIENTE] Aplicar el patron que ya funciona en el repo: `LeadsPage.tsx` (213 lineas) mas su
  controller dedicado.

### Capitulo 13.8 - Consolidacion del sistema visual (bloque 7)

El sistema de tokens (`src/design/tokens.css`) existe y esta bien disenado. El problema es la adopcion
parcial: conviven tres fuentes de verdad de color.

- [PENDIENTE] Eliminar las clases legacy `.btn*` y `.card-*` de `src/index.css` (27 usos).
- [PENDIENTE] Eliminar `src/components/ui/PageHeader.tsx` en favor de `src/design/PageShell.tsx`. Hoy
  usan escalas tipograficas distintas (24px vs 17px) y producen jerarquia inconsistente.
- [PENDIENTE] Erradicar 94 colores literales y reducir 575 arbitrary values de Tailwind.
- [PENDIENTE] Eliminar 681 usos de `dark:*` ad-hoc; `tokens.css` ya resuelve el tema por variables.
- [PENDIENTE] Barrer el patron prohibido de caja blanca redondeada (`bg-white` aparece 186 veces en 83
  archivos): `ListsPage.tsx:427,446`, `TemplateEditor.tsx:242`, `TemplatesPage.tsx:189,222`,
  `PipelinePage.tsx:137`.
- [PENDIENTE] Reducir los 132 anchos fijos en px y grids de columnas fijas en 68 archivos, criticos
  para sidebar angosto y movil.

### Capitulo 13.9 - Accesibilidad WCAG 2.2

Frente nuevo, nunca registrado en este roadmap.

- [PENDIENTE ESTRUCTURAL] Botones icono sin nombre accesible: `LeadsTableRow.tsx:157-166` usa `title`
  en vez de `aria-label`. Solo 6 apariciones de `aria-label` en todo `src/`. Incumple WCAG 4.1.2. La
  primitiva correcta ya existe (`IconButton` fuerza `aria-label` por tipos) pero no se usa.
- [PENDIENTE] Migrar los overlays manuales a `src/design/Modal.tsx`: 17 archivos usan
  `fixed inset-0`, solo 4 manejan `Escape` o `role="dialog"`.
- [PENDIENTE] Corregir `focus:ring-offset-[#0a0a0a]` en `src/index.css:42`, color literal que no
  reacciona al tema y degrada el indicador de foco (WCAG 2.4.11).
- [PENDIENTE] Auditar el contraste de `--ls-text-muted` (`#8c95a6` sobre blanco da ~3.0:1,
  insuficiente para texto normal segun WCAG 1.4.3).

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

- [BLOQUEADO] Decidir el destino de los tres documentos en `docs/_revision/`. Estan documentados uno
  por uno en `docs/_revision/README.md` con su motivo de obsolescencia y su valor residual. Requiere
  decision del usuario, no de una IA.
  - `handoff-2026-07-30.md`: caducado, pero su seccion 2 tiene decisiones de arquitectura que no
    estan registradas en ningun otro lado y conviene extraer antes de borrar.
  - `pb-form-redesign-2026-07-29.md`: verificar vigencia contra `landing-gerow`.
  - `implementation_plan.md`: **no se puede borrar sin cambiar el protocolo**. La seccion 4.2 lo
    declara documento operativo de Nivel 2 y varias secciones mandan mantenerlo al dia. Eliminarlo
    exige actualizar `PROTOCOLO_CONTROL.md` en el mismo movimiento.

### Capitulo 13.11 - Correccion de la documentacion normativa (bloque 9)

- [PENDIENTE ESTRUCTURAL] Reescribir `docs/integrations/landing-gerow-cloudflare-context.md`. El protocolo seccion 7 lo
  declara de lectura obligatoria antes de tocar la integracion, y esta desactualizado en nueve puntos
  verificables. Un documento obligatorio y falso es peor que no tenerlo.
- [PENDIENTE] Actualizar `planespro-form-integration-contract.md`: declara dos canales publicos cuando
  existen cuatro (`general`, `pb`, `retiro`, `form`), y no documenta el protocolo de dos fases
  (`submission_id`, `update_token`, `action_only`) vigente desde el 3 de agosto.
- [PENDIENTE] Archivar `HANDOFF_NEXT_SESSION.md`, caducado: declara que chat, comunidad y foro no son
  alcance, y los tres se construyeron despues.
- [PENDIENTE] Archivar `pb_form_redesign_handoff.md`.
- [PENDIENTE] Decidir el destino de `docs/_revision/implementation_plan.md` (2314 lineas, solapa fuertemente con este
  roadmap).
- [PENDIENTE] Fusionar `UX_UI_CHECKLIST.md` dentro de este roadmap.
- [PENDIENTE] Reorganizar la documentacion en `docs/`, dejando `PROTOCOLO_CONTROL.md` y `AI_SYNC.md` en
  la raiz por ser registro normativo.

### Capitulo 13.12 - Deuda de datos y rendimiento

- [PENDIENTE ESTRUCTURAL] Definir un modelo unico de migraciones. `sql/migrations/` y
  `supabase/migrations/` estan hoy sincronizadas byte a byte, pero el modelo dual ya provoco
  colisiones de numero en `036` y `090`. Recomendacion: `supabase/migrations/` como unica fuente de
  verdad, y `sql/migrations/` generada automaticamente o retirada. Esto cierra el pendiente historico
  del capitulo 2.3.
- [PENDIENTE] Migrar `list_my_forgotten_leads` a paginacion por cursor y anadir `pg_trgm` con indice
  GIN. Hoy usa `ilike` con comodin inicial sin indice de soporte, `OFFSET`, y un `NOT EXISTS`
  correlacionado.
- [PENDIENTE] Corregir el orden de columnas de `send_logs_user_lead_type_idx`, que no favorece el
  patron de `get_my_dashboard_snapshot`.
- [PENDIENTE] Separar los scripts de reparacion de datos (`_recovery`, `repair_historical_`) de las
  migraciones de esquema. Cierra otro pendiente del capitulo 2.3.
- [PENDIENTE] Anadir `AbortController` con timeout a las llamadas a Resend y Google Calendar.

### Capitulo 13.13 - Retiro final de Cloudflare

- [PENDIENTE ESTRUCTURAL] Migrar `ppusers` fuera de `FORMS_DB` (D1 `ppforms_db`) y `FORMS_UPLOADS`
  (R2 `ppforms-uploads`). Mientras siga montado ahi hay dos fuentes de verdad de leads, que es
  exactamente lo que la regla 16.2 del protocolo prohibe.
- [PENDIENTE] Anadir `*.supabase.co` a `connect-src` en `_headers` de `landing-gerow`. Sin eso los
  formularios no pueden saltarse el proxy.
- [PENDIENTE] Migrar `ppcrm` (`admin.planespro.cl/crm`).
- [PENDIENTE] Retirar la ruta documentada `POST /api/form/appointments`, que ya no existe y devuelve
  404.

---

## Punto exacto actual al 2026-08-11

Lo consolidado y verificado en esta pasada:

- la capa de datos es solida: 48 tablas, todas con RLS, cero hallazgos criticos o altos
- la separacion `repositories / services / types` es real, no decorativa
- el retiro de Cloudflare del backend del formulario efectivamente ocurrio: `ppforms` es un proxy de
  288 lineas sin D1, sin R2, sin cron, sin Resend y sin Google Calendar
- el historial git es lineal y limpio
- `npm run build` esta en verde

Lo que esta abierto y no debe maquillarse como cerrado:

- doble fuente de verdad activa en `form-leads` entre este repo y `landing-gerow`
- una migracion de produccion ausente del historial de este repo
- cero tests y cero lint en 305 archivos TypeScript
- validacion E2E de Google Calendar y Meet, abierta desde julio y ya rebasada por trabajo posterior
- validacion funcional final del envio real por Gmail
- retiro o encapsulamiento final de `emailjs`
- `ppusers` como segunda fuente de verdad de leads

Regla de avance revisada al 2026-08-11: los bloques 0 (contencion) y 1 (alineacion de git) del plan de
accion deben cerrarse antes de abrir cualquier otro frente, incluido cualquier modulo nuevo de
producto. Son los unicos dos frentes con riesgo activo de romper produccion o de perder trabajo.
