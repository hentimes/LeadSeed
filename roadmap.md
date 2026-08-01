# Roadmap Operativo: PlanesPro CRM / LeadSeed

Fecha de control: 2026-07-22
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
- [COMPLETADO] Bajar entry principal validado a 30.27 kB en build.
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
- [PENDIENTE] Auditar si `PROTOCOLO_CONTROL.md`, `AI_SYNC.md`, `implementation_plan.md` y este roadmap siguen totalmente alineados despues de la fase de agenda.

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
