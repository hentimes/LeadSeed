# Roadmap Operativo: PlanesPro CRM / MENSAJES

Fecha de control: 2026-07-18
Estado ejecutivo: base CRM, captura publica, links `pb` y ciclo completo de agenda Supabase completados en corte tecnico; quedan validaciones reales con usuario Google conectado antes de pasar a Blog/Noticias.

Este roadmap esta dividido en secciones, capitulos y tareas para que cualquier IA o persona pueda saber exactamente donde estamos, que se cerro, que esta en curso y que falta.

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
- [PENDIENTE] Revisar regresion puntual de carga Vite dentro de la extension cuando el navegador funciona pero el sidebar queda en `Connecting to the Vite dev server`.
- [PENDIENTE] Crear validacion manual repetible para sidebar extension antes de cerrar cada fase visible.
- [PENDIENTE] Crear validacion equivalente para layout movil, pensando en futura app.

### Capitulo 1.3 - Reglas visuales de producto

- [COMPLETADO] Registrar en CONTROL que toda UI debe ser compacta, sidebar-first y mobile-first.
- [COMPLETADO] Registrar prohibicion de usar emoticones o emojis.
- [COMPLETADO] Registrar prohibicion de crecer con cajas blancas genericas de bordes redondeados como patron por defecto.
- [COMPLETADO] Registrar criterio visual: seguir el lenguaje compacto de MENSAJES.
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
- [PENDIENTE] Evitar que disponibilidad publica siga dependiendo de `advisor_id` como primera opcion cuando existe `ref`.
- [PARCIAL] La reserva, ownership y bloqueo de horario `pb` ya quedaron validados; sigue pendiente validar el mismo flujo con un owner que tenga Google Calendar conectado para confirmar Meet y sync `ok` en vez de `error`.

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
- [COMPLETADO] Formatear y validar RUT desde el sidebar de MENSAJES.
- [COMPLETADO] Separar visualmente adjunto PDF y comentario en la ficha del lead.
- [COMPLETADO] Mostrar fecha de ingreso.
- [COMPLETADO] Evitar mostrar fecha de actualizacion como dato redundante si no hubo actualizacion real.
- [PARCIAL] El `2026-07-19` el usuario valido con prueba real que la captura general de `planespro.cl` vuelve a entrar en MENSAJES; siguen pendientes validaciones reales equivalentes para `pb`, carga manual e importacion.

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
- [COMPLETADO] Copiar URL publica `https://planespro.cl/pb/?ref=...`.
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
- [COMPLETADO] Auditar codigo actual de Cloudflare y MENSAJES antes de crear nuevas tablas.
- [COMPLETADO] Confirmar que Supabase remoto ya tenia `appointments`, `user_availability` y `user_availability_overrides`.
- [COMPLETADO] Confirmar que la agenda remota previa solo tenia `get_available_slots(p_user_id, p_start_date, p_days)`, sin resolucion por `ref`.
- [COMPLETADO] Confirmar que `submit_planespro_public_lead` guardaba `scheduled_at` y metadata, pero no creaba fila en `appointments`.
- [COMPLETADO] MENSAJES ya tiene fundacion Supabase de agenda, frontend publico conectado y UI interna compacta.

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
- [COMPLETADO] Crear RPC autenticada de gestion de disponibilidad y bloqueos del usuario para MENSAJES.
- [COMPLETADO] Crear DTOs frontend para el contrato interno de agenda.

### Capitulo 7.3 - Disponibilidad publica

- [COMPLETADO] Resolver contexto de booking por `capture_ref` cuando existe link `pb`.
- [COMPLETADO] Resolver disponibilidad general contra cuenta central `planespro.cl@gmail.com` o fallback admin.
- [COMPLETADO] Combinar disponibilidad base, bloqueos manuales y citas MENSAJES.
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
- [COMPLETADO] Permitir reprogramar cita desde MENSAJES actualizando Supabase primero.
- [COMPLETADO] Replicar reprogramacion hacia Google Calendar cuando exista `google_event_id`.
- [COMPLETADO] Permitir cancelar cita desde MENSAJES actualizando Supabase primero.
- [COMPLETADO] Replicar cancelacion hacia Google Calendar cuando exista `google_event_id`.
- [COMPLETADO] Permitir crear una cita desde el detalle del cliente en MENSAJES.
- [COMPLETADO] Replicar la cita creada desde detalle hacia Google Calendar/Meet cuando exista conexion Google.
- [COMPLETADO] Liberar slot en disponibilidad publica al pasar cita a `cancelada` o `rechazada`.
- [COMPLETADO] Ampliar estados: pendiente, agendada, confirmada, tentativa, cancelada, rechazada, completada, no_asistio.
- [COMPLETADO] Crear historial/auditoria visible de cambios de cita.
- [COMPLETADO] Definir reglas de invitacion al lead: el cliente con email valido queda como participante automatico de la cita.
- [COMPLETADO] Permitir agregar participantes a una cita desde MENSAJES.
- [COMPLETADO] Permitir quitar participantes de una cita desde MENSAJES.
- [COMPLETADO] Replicar participantes hacia Google Calendar como invitados del evento cuando exista `google_event_id`.
- [COMPLETADO] Agregar automaticamente el lead capturado como participante `lead` para que reciba invitacion y recordatorios de Google Calendar.
- [COMPLETADO] Mantener accion explicita solo para participantes terceros agregados por el asesor desde MENSAJES.
- [COMPLETADO] Definir copy operativo cuando Google falla pero Supabase ya bloqueo la cita.

### Capitulo 7.5 - UI de agenda en MENSAJES

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
- [PARCIAL] Validar responsive movil: estructura, historial y tabs son compactos, falta prueba visual manual en extension/movil.

### Capitulo 7.6 - Google Calendar

- [COMPLETADO] Login ya solicita permisos de Google Calendar.
- [COMPLETADO] Definir almacenamiento seguro de tokens mediante Edge Function con service role y tabla sin lectura directa de UI.
- [COMPLETADO] Exponer solo estado no sensible de conexion con `get_my_calendar_connection_status()`.
- [COMPLETADO] Capturar `provider_token` y `provider_refresh_token` desde login OAuth cuando Supabase los entregue.
- [COMPLETADO] Sincronizar ocupacion real desde Google Calendar usando FreeBusy sin leer detalles privados de eventos.
- [COMPLETADO] Crear evento Google Calendar desde cita Supabase como replica externa no bloqueante.
- [COMPLETADO] Guardar link Meet cuando Google lo entregue en la respuesta de `Events Insert`.
- [COMPLETADO] Actualizar evento Google al reprogramar desde MENSAJES.
- [COMPLETADO] Cancelar/eliminar evento Google al cancelar desde MENSAJES.
- [PENDIENTE] Definir si un rechazo/cancelacion originado desde Google debe modificar Supabase o solo alertar.
- [PENDIENTE] Implementar sync inverso de cambios Google si se decide que Google pueda modificar estado en Supabase.
- [COMPLETADO] Documentar fallback tecnico si Google Calendar falla: la agenda Supabase/manual sigue funcionando y Google queda como replica externa no bloqueante.

---

## Seccion 8 - Dominio Branded y Retiro Progresivo de Cloudflare

### Capitulo 8.1 - Principio de arquitectura

- [COMPLETADO] Definir Supabase como backend destino y fuente de verdad.
- [COMPLETADO] Definir Cloudflare como capa transitoria en retirada.
- [COMPLETADO] Definir que el dominio visible debe ser `planespro.cl` o subdominios branded.
- [COMPLETADO] Confirmar que usar dominio branded no debe degradar Supabase Realtime si solo se usa como proxy/API para flujos publicos.

### Capitulo 8.2 - Endpoints publicos

- [PARCIAL] Captura de leads y disponibilidad publica ya apuntan a Supabase, pero aun conviven con Cloudflare en abandono, admin historico y funciones auxiliares.
- [COMPLETADO] Crear frontera branded para submit y retirar URLs crudas de Supabase en flujos visibles.
- [COMPLETADO] Crear frontera branded para descarga/visualizacion de archivos cuando aplique.
- [COMPLETADO] Migrar disponibilidad publica desde Cloudflare hacia Supabase con fallback legado.
- [PENDIENTE] Retirar endpoints Cloudflare obsoletos despues de validar reemplazos.
- [PENDIENTE] Mantener compatibilidad temporal para no romper `planespro.cl` durante la transicion.

### Capitulo 8.3 - Realtime

- [COMPLETADO] Mantener Supabase Realtime como canal live del CRM.
- [PENDIENTE] Auditar suscripciones live despues de agenda para asegurar que no hay doble fuente de eventos.
- [PENDIENTE] Medir impacto de dominio branded en latencia percibida de formularios, sin confundirlo con Realtime.

---

## Seccion 9 - Blog, Noticias y Dashboard Editorial

### Capitulo 9.1 - Estado actual

- [PARCIAL] `landing-gerow` conserva dashboard editorial historico para noticias y blog.
- [COMPLETADO] Definir que blog y noticias no se migran todavia en el primer corte de formularios/leads/agenda.
- [COMPLETADO] Auditar modelo actual de noticias y blog en `landing-gerow`.
- [COMPLETADO] Identificar Blog actual: Worker `ppblog`, D1 `ppblog_db`, R2 `ppblog-uploads`, rutas publicas `blog.planespro.cl` y frontend `/blog/` + `/blog/:slug/`.
- [COMPLETADO] Identificar Noticias actual: Worker `ppnews`, D1 `ppnews_db`, R2 `ppnews-thumbnails`, cron de recoleccion, rutas publicas `news.planespro.cl` y frontend de home/noticias.
- [COMPLETADO] Identificar dependencia admin historica: ambos Workers validan admin via `ppusers` / `admin.planespro.cl`.
- [PENDIENTE] Decidir si dashboard editorial queda federado temporalmente o migra completo a MENSAJES.

### Capitulo 9.2 - Migracion futura

- [PENDIENTE] Definir tablas Supabase para posts, categorias, tags, autores, media, estados, SEO y publicaciones.
- [PENDIENTE] Definir tablas Supabase para noticias, fuentes, ejecuciones de recoleccion, estados editoriales, thumbnails y snapshots/cache publico.
- [PENDIENTE] Crear Edge Functions Supabase o RPCs para API publica de blog/noticias manteniendo contratos compatibles con `js/blog.js` y `js/index-news-blog.js`.
- [PENDIENTE] Crear admin editorial compacto si se integra en MENSAJES, con permisos superadmin/editor/helper.
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

### Capitulo 11.3 - Validacion tecnica recurrente

- [COMPLETADO] Usar `npm run build` como validacion minima del frontend.
- [COMPLETADO] Usar `git diff --check` como validacion de whitespace.
- [COMPLETADO] Usar `rg` para detectar mojibake, `!important`, emojis y accesos directos prohibidos.
- [PENDIENTE] Crear scripts automatizados para checks CONTROL.
- [PENDIENTE] Agregar pruebas E2E de flujos criticos: captura general, `pb`, agenda, PDF, edicion de lead y links.

---

## Punto exacto actual

Estamos dentro de Fase 6, en el cierre del ciclo completo de citas. Lo completado permite que:

- el formulario general de `planespro.cl` cree leads en MENSAJES para la cuenta central
- los links `pb` existan como canal separado por asesor y como formulario independiente para ejecutivos externos
- cada usuario gestione links de publicacion en primer corte
- los PDFs se suban, se vean y se descarguen con nombres trazables en leads nuevos
- la arquitectura de MENSAJES ya no siga creciendo desde UI acoplada a Supabase
- la disponibilidad publica consulte Supabase detras de `form.planespro.cl`
- una cita tomada desde formulario bloquee el slot de inmediato en Supabase
- Google Calendar aporte bloqueos externos por FreeBusy solo cuando el usuario sincroniza
- una cita creada en Supabase intente replicarse a Google Calendar y Meet sin bloquear la captura
- MENSAJES muestre Meet y avisos proximos cuando esos datos existen
- un asesor cree una cita nueva desde el detalle del cliente, bloqueando el horario en Supabase e intentando crear evento Google/Meet
- el `2026-07-19` quedo validado con prueba real de usuario que la captura general desde `planespro.cl` vuelve a entrar en MENSAJES
- el `2026-07-19` quedo validado tecnicamente que la disponibilidad branded responde desde Supabase tanto para canal `general` como para canal `pb`
- el `2026-07-19` quedo corregido un bug de frontend `pb` que truncaba `ref_code` largos y provocaba fallback silencioso a la agenda general
- el `2026-07-19` quedo validado con comparacion directa que `general` y `pb` ya exponen bloqueos distintos por owner
- el `2026-07-19` quedo validado con submit productivo real que un lead `pb` nuevo y su cita ya se asignan al owner del link, con `capture_link_id` correcto y Google Calendar sincronizado
- el `2026-07-19` quedo corregido en MENSAJES que la bandeja principal lea solo leads propios y no todos los leads visibles por policy admin

La siguiente fase concreta es:

1. Validar manualmente con usuario real conectado que una cita publica crea evento Google y Meet visible en MENSAJES.
2. Validar manualmente que una cita creada desde detalle crea evento Google/Meet o deja Google pendiente sin perder la cita Supabase.
3. Validar manualmente desde navegador limpio y extension recargada que un lead `pb` nuevo aparece en la bandeja del owner del link y no en la bandeja principal del superadmin.
4. Auditar y, si corresponde, corregir los registros historicos `pb` creados antes del fix del `ref` truncado que quedaron bajo superadmin.
5. Validar manualmente que reprogramar cita desde MENSAJES actualiza Google Calendar.
6. Validar manualmente que cancelar cita desde MENSAJES elimina o cancela el evento Google y libera el slot publico.
7. Validar manualmente que agregar y quitar participantes desde MENSAJES actualiza invitados en Google Calendar.
8. Validar manualmente el historial visible de citas en sidebar real de extension.
9. Auditar una anomalia de datos historicos: existen citas `general` antiguas con `capture_ref` poblado y debe confirmarse si son residuo de pruebas previas o un arrastre de contexto no deseado.
10. Solo despues retomar Fase 7 Blog/Noticias.
