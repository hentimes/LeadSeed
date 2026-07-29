# Auditoria y Plan Arquitectonico: Migracion a Supabase

Fecha de actualizacion: 2026-07-22
Estado: vigente, Fase 5 cerrada. Formulario principal, `pb`, ownership, agenda base, realtime admin y correo multi-canal ya quedaron reencaminados a Supabase. Blog/Noticias siguen fuera de este corte. El frente de email ya soporta canales `gmail + resend`, pero el envio efectivo por Gmail desde `Enviar Mensajes` sigue en validacion funcional final.

## Actualizacion de control al lunes 20 de julio de 2026, 20:20 CLT

- Se ejecuto una pasada de CONTROL concentrada solo en la puerta de salida Google Calendar / Google Meet.

### Evidencia real confirmada

1. Backend E2E presente
- `supabase/functions/google-calendar-create-event`
- `supabase/functions/google-calendar-update-event`
- `supabase/functions/google-calendar-sync-attendees`
  - ya cubren crear evento, reprogramar, cancelar y sincronizar invitados

2. Participante automatico del lead
- consulta real a `public.appointment_participants` via `supabase db query --linked`
- evidencia observada:
  - leads creados en citas recientes quedan como `participant_role = lead`
  - `invitation_status = synced`
  - `google_synced_at` real en multiples owners

3. Observabilidad frontend endurecida
- `src/utils/appointmentStatusCopy.ts`
  - ya no colapsa el estado Google solo a exito/error
  - distingue `pending`, `error`, `skipped` y `synced`
- `src/components/leads/LeadDetail.tsx`
  - muestra badge/resumen coherente cuando Google sigue pendiente o fue omitido
- `src/pages/AgendaPage.tsx`
  - muestra badge coherente para Google
  - expone `invitationStatus` de participantes en la UI compacta

### Validacion tecnica ejecutada

- `npm run build` en `MENSAJES`: OK
- `git diff --check -- src/utils/appointmentStatusCopy.ts src/components/leads/LeadDetail.tsx src/pages/AgendaPage.tsx`
  - sin errores de patch; solo avisos CRLF locales de Windows

### Riesgo abierto de esta pasada

- `supabase db query --linked` respondio intermitente con `502` al consultar algunas tablas del mismo proyecto durante esta validacion.
- Eso no invalida la evidencia util capturada sobre `appointment_participants`, pero si impide declarar el checklist E2E totalmente cerrado solo con esta pasada.

### Estado correcto despues de esta pasada

- Google E2E sigue en estado `parcial`
- ya existe evidencia real de:
  - lead auto-invitado
  - sincronizacion Google efectiva en participantes
  - UI interna mas fiel al estado real del backend
- falta cerrar evidencia manual completa para:
  - create
  - reschedule
  - cancel
  - attendees
  - sobre `planespro.cl`, `/pb` y MENSAJES con usuario Google conectado

## Actualizacion de control al lunes 20 de julio de 2026, 19:52 CLT

- Cerrada la deuda tecnica puntual reportada por `informe_auditoria_seguimiento.md` en el frente auditado.

### Correcciones aplicadas

1. Memory leaks en efectos asincronos
- `src/components/leads/LeadDetail.tsx`
  - las cargas de detalle, alertas cruzadas y agenda ahora respetan una guarda `cancelled`
- `src/hooks/useSendCounts.ts`
  - la carga de contadores ya no hace `setState` si el hook se desmonta o cambia de usuario

2. Errores silenciosos de repositorio
- `src/repositories/dashboardRepository.ts`
- `src/repositories/historyRepository.ts`
- `src/repositories/templatesRepository.ts`
  - ahora registran `console.error(...)` antes de devolver fallbacks vacios
  - esto preserva UX resiliente sin perder observabilidad para debugging

3. Dashboard con meta diaria cero
- `src/pages/DashboardPage.tsx`
  - se elimina el fallback matematico `|| 1`
  - si la meta es `0`, la UI ya no inventa porcentaje; muestra `N/A` y `sin meta`

4. Proxy de archivos
- `src/components/leads/LeadDetail.tsx`
  - la URL del proxy ya puede venir por `VITE_PLANESPRO_FILE_PROXY_URL`
  - se conserva fallback controlado a la ruta Supabase actual

### Validacion tecnica ejecutada

- `npm run build` en `MENSAJES`: OK
- `git diff --check` sobre el bloque corregido: sin errores de patch; solo avisos CRLF locales de Windows

### Pendiente acotado

- queda pendiente separar un commit limpio del bloque auditado dentro de un worktree con cambios mas amplios previos
- no queda deuda tecnica abierta en el frente puntual auditado por Seguimiento

### Puerta de salida obligatoria de esta fase

Aplicando CONTROL, esta fase no se considera cerrada solo porque la arquitectura, la captura y la agenda compilen o hayan pasado smoke tests.

Antes de abrir como foco principal:

- tareas operativas
- plantillas funcionales de envio
- grupos / listas de usuarios
- o cualquier otro frente nuevo de producto

debe quedar validado en entorno real el flujo end-to-end de Google Calendar / Google Meet.

Checklist de salida:

1. Crear cita desde `planespro.cl` con owner `general`.
2. Crear cita desde `/pb` con owner real de `capture_ref`.
3. Confirmar que ambos flujos:
   - crean lead
   - crean cita en Supabase
   - bloquean el slot correcto
   - no contaminan agenda ajena
4. Confirmar con usuario Google conectado que:
   - se crea evento Google Calendar
   - se genera y guarda `meet_link`
   - el lead/participante recibe invitacion cuando corresponde
5. Confirmar que reprogramar desde MENSAJES actualiza Google.
6. Confirmar que cancelar desde MENSAJES libera slot y cancela/elimina evento Google.
7. Confirmar que agregar/quitar participantes replica invitados en Google Calendar.

Hasta que ese checklist quede validado, el estado correcto del frente agenda/formulario sigue siendo `parcial`, aunque el backend ya este migrado a Supabase.

## Actualizacion de control al lunes 20 de julio de 2026, 18:45 CLT

- Auditada la ultima frontera visible del formulario publico que seguia exponiendo el hostname fisico de Supabase en runtime y CSP.
- Criterio de CONTROL aplicado:
  - no reintroducir logica de negocio en Cloudflare
  - no dejar hostname crudo de infraestructura en el runtime publico si la marca ya opera sobre `planespro.cl`
  - mantener una frontera publica branded y configurable, con build reproducible y smoke tests

### Correcciones aplicadas

1. Runtime fuente del formulario publico
- `landing-gerow/frontend/lead-capture/js/app.js`
  - reemplaza `supabaseFunctionsUrl` por `publicApiBaseUrl`
  - agrega `resolvePublicApiBaseUrl()`
  - agrega `normalizePublicApiPath(path)`
  - fallback branded: `https://form.planespro.cl/api`

2. Runtime compilado del sidebar publico
- `landing-gerow/frontend/lead-capture/js/sidebar-runtime.js`
  - resuelve la frontera branded por:
    - `window.__PLANESPRO_FORM_API_BASE__`
    - meta tag `planespro-form-api-base`
    - fallback `https://form.planespro.cl/api`
  - mapea rutas legacy del formulario:
    - `/form-public-availability -> /public/availability`
    - `/form-lead-abandoned -> /form/leads/abandoned`
    - `/form-leads -> /form/leads`

3. HTML y CSP publicos
- `landing-gerow/frontend/lead-capture/html/index.html`
  - agrega meta tag `planespro-form-api-base`
- `landing-gerow/_headers`
  - `connect-src` y `form-action` ya no apuntan al hostname crudo de Supabase
  - quedan alineados a `https://form.planespro.cl`

4. Validacion automatizada
- smoke tests actualizados:
  - `tests/lead-capture-source-boundary-smoke.mjs`
  - `tests/crm-forms-domain-ownership-smoke.mjs`
- el build publico vuelve a regenerar:
  - `pb/app.js`
  - `pb/index.html`
  - `public/assets/lead-capture/sidebar.min.js`

### Validacion tecnica ejecutada

- `npm run build:lead-capture` en `landing-gerow`: OK
- `node tests/lead-capture-source-boundary-smoke.mjs`: OK
- `node tests/crm-forms-domain-ownership-smoke.mjs`: OK

### Conclusiones de arquitectura

- El formulario ya no depende visualmente del hostname crudo de Supabase en sus fuentes publicas principales.
- La salida progresiva de Cloudflare sigue intacta:
  - Cloudflare no recupera logica de negocio
  - Supabase sigue siendo backend real
  - `form.planespro.cl` queda como frontera branded del formulario

### Riesgo abierto

- Sigue pendiente una limpieza dedicada de mojibake residual en `frontend/lead-capture/html/index.html` y assets derivados.
- No bloquea el corte de arquitectura, pero si bloquea el objetivo de copy premium si se deja crecer.

## Actualizacion de control al lunes 20 de julio de 2026, 16:10 CLT

- Auditado el ultimo hueco operativo de `Admin SaaS > Usuarios y Mensajes > Base`.
- Estado anterior:
  - el superadmin ya podia abrir la base observada
  - los badges de leads nuevos podian actualizarse
  - pero la tabla observada no recibia el lead en vivo mientras la base estaba abierta
- Criterio de CONTROL aplicado:
  - no mezclar agenda ni ownership
  - no volver al patron Cloudflare de refresco manual
  - no depender de realtime directo sobre `public.leads` para datos que el superadmin solo ve por RPC
  - crear una frontera realtime admin-dedicada en Supabase

### Correcciones aplicadas

1. Frontera realtime admin
- nueva migracion `048_admin_lead_events_realtime.sql`
- nueva tabla `public.admin_lead_events`
- trigger `emit_admin_lead_created_events_trigger` sobre `public.leads`
- inclusion de `public.admin_lead_events` en publicacion `supabase_realtime`

2. Servicio admin
- `subscribeAdminUsersRealtime(...)` ya entrega el payload real del evento admin al nivel de pagina

3. `AdminUsersPage`
- identifica `observed_user_id` y `lead_id` del evento admin insertado
- incrementa el badge local del usuario observado sin depender de un refetch completo
- si el superadmin ya esta en `Base` del mismo usuario:
  - dispara rehidratacion inmediata de `Base` por la ruta RPC ya validada
  - mantiene notificacion visual compacta
  - marca vistos en backend sin bloquear la UI

4. `AdminUserBase`
- ya acepta `liveInsertedLead`
- evita duplicados por `id`
- hace prepend visual y ademas refetch inmediato de la base observada
- muestra banner compacto `Nuevo lead en tiempo real`

### Validacion tecnica ejecutada

- `npm run build` en `MENSAJES`: OK

### Validacion manual pendiente

- abrir `Admin SaaS > Usuarios y mensajes > Base` de un usuario real
- enviar un lead nuevo a ese usuario
- confirmar que:
  - aparece sin refresh
  - el badge del usuario no queda pegado si la base ya estaba abierta
  - si la base no esta abierta, el badge sube y la insercion se ve al entrar luego

### Endurecimiento adicional del mismo bloque

- Se detecto que la primera version seguia recreando la suscripcion admin cada vez que cambiaba `activeTab` o `selectedUser`.
- Eso era tecnicamente fragil porque podia perder eventos justo en el borde de cambio de vista.
- Ajuste aplicado:
  - la suscripcion admin ahora queda estable
  - el callback lee estado actual mediante `refs`
  - al entrar un lead del usuario observado con `Base` abierta se dispara tambien un `loadBase()` inmediato
- Resultado buscado:
  - no depender solo del row insertado por realtime
  - rehidratar la base observada al instante por la ruta canonica ya validada

### Correccion estructural final

- Se confirmo que el superadmin no recibia eventos live fiables desde `public.leads` para leads ajenos.
- Esto era coherente con la arquitectura vigente:
  - el superadmin observa leads ajenos por RPC `SECURITY DEFINER`
  - no por lectura directa RLS de la tabla base
- Se cerro el hueco con un feed admin-only:
  - `public.admin_lead_events`
  - un evento por lead creado y por admin destinatario
  - suscripcion filtrada por `admin_user_id`

### Validacion tecnica adicional ejecutada

- `npx supabase db query --linked --file "sql/migrations/048_admin_lead_events_realtime.sql"`: OK

### Validacion manual adicional ejecutada

- el usuario confirmo el lunes 20 de julio de 2026 que la ultima correccion ya permite ver correctamente los leads en `Base` desde superadmin
- luego confirmo el mismo lunes 20 de julio de 2026 que el lead tambien entra en tiempo real sin cambiar de seccion mientras `Base` esta abierta
- esto valida que la frontera realtime admin-dedicada es la direccion correcta

## Actualizacion de control al lunes 20 de julio de 2026, 18:20 CLT

- Auditada la migracion `Cloudflare -> Supabase` contra CONTROL desde cuatro ejes: frontend publico, edge functions Supabase, supervision admin y deuda estructural residual.
- Confirmaciones de arquitectura:
  - `cloudflare/ppforms/src/index.js` ya no ejecuta backend del formulario; queda retirado como stub `health/410`
  - el backend funcional del formulario ya vive en Supabase:
    - `form-leads`
    - `form-public-availability`
    - `form-lead-abandoned`
  - la supervision admin de `Base` ya quedo correctamente aislada en Supabase con feed `admin_lead_events`
- Hallazgos de deuda aun abierta:
  - el runtime publico todavia expone el hostname fisico de Supabase en:
    - `landing-gerow/frontend/lead-capture/js/app.js`
    - `landing-gerow/frontend/lead-capture/js/sidebar-runtime.js`
    - `landing-gerow/pb/app.js`
  - persistia el mismo acoplamiento en MENSAJES para visor/descarga de PDF
  - seguia existiendo riesgo de falso vacio en `Admin SaaS > Base` si fallaba solo una mitad de la carga (`leads` o `templates`)
  - persiste mojibake en parte del runtime publico y fragmentos HTML de `pb`
- Correcciones aplicadas en esta pasada:
  - `src/services/adminService.ts`
    - `loadAdminUserBase(...)` deja de ocultar fallos parciales por `Promise.allSettled`
    - si falla `leads` o `templates`, ahora la UI recibe error real en vez de una base falsa vacia
  - `src/components/leads/LeadDetail.tsx`
    - el proxy de adjuntos deja de hardcodear `pfoikdneixbvpozbtqcx.supabase.co`
    - ahora usa `import.meta.env.VITE_SUPABASE_URL`
- Decision de CONTROL:
  - la migracion va en la direccion correcta y no requiere volver a Cloudflare
  - la siguiente deuda estructural obligatoria es sacar del frontend publico los endpoints crudos de Supabase, idealmente via frontera branded/configurable sin reintroducir logica de negocio en Cloudflare

## Actualizacion de control al lunes 20 de julio de 2026, 14:45 CLT

- Auditada la regresion de performance introducida en el arranque de la extension.
- Sintoma confirmado por validacion visual del usuario:
  - splash `Inicializando...` reteniendo la UI varios segundos
  - luego la bandeja mostraba `No hay leads` durante el primer fetch, aunque ese estado no estuviera confirmado aun
- Causa raiz confirmada:
  - `AuthContext` bloqueaba toda la shell hasta terminar `loadUserProfile(...)`, aunque la sesion ya estaba resuelta
  - `App.tsx` mezclaba bootstrap visual con mantenimiento en foreground y ademas reejecutaba `initializeShell()` al volver foco o visibilidad
  - `LeadsPage` disparaba carga de identidades al inicio aunque solo se usan en alta/importacion
  - `LeadsTable` no diferenciaba entre `loading` real y vacio real

### Correcciones aplicadas

1. Bootstrap de autenticacion
- `AuthContext.tsx` ahora libera `loading` al resolver la sesion
- perfil y feature flags pasan a background
- se eliminaron logs ruidosos de arranque
- se evita sobreescritura por respuestas tardias usando control de version interno

2. Shell principal
- `App.tsx` deja de atar la UI inicial a `processScheduledEmails()`, `purgeDeletedLeads()` y `refreshTaskCount()`
- esas tareas quedan en background por sesion
- al recuperar foco o volver de minimizado ya no se rehidrata toda la shell; solo se refrescan contadores livianos

3. Bandeja de leads
- `LeadsPage.tsx` inicia con estado de carga real
- `loadLeadIdentities()` ya no corre en primer render salvo que se abra formulario o importacion
- `LeadsTable.tsx` ahora muestra `Cargando leads...` mientras el fetch inicial sigue corriendo
- `leadsRepository.ts` elimina un conteo redundante cuando no hay filtros activos y paraleliza filas + conteos

### Validacion tecnica ejecutada

- `npm run build` en `MENSAJES`: OK
- verificacion remota de indices de runtime:
  - `leads_active_user_created_at_idx`
  - `leads_deleted_user_deleted_at_idx`
  - `lead_cross_exec_events_lead_created_at_idx`
  - `send_logs_user_lead_type_idx`
  - `send_logs_user_sent_at_idx`
  - todos presentes en Supabase remoto

### Validacion manual pendiente

- confirmar en extension recargada que el splash de arranque ya no retiene la UI de forma perceptible
- confirmar que la bandeja muestra datos reales tras `Cargando leads...`
- si aun apareciera vacia con sesion valida, el siguiente corte deja de ser bootstrap y pasa a sesion/RLS efectiva del usuario en runtime

## Actualizacion de control al lunes 20 de julio de 2026, 15:40 CLT

- Auditado el fallo especifico de `Admin SaaS > Usuarios y Mensajes > Base` reportado despues del hardening de performance.
- Confirmado que `Agenda` y `Base` no compartian la misma causa raiz.
- Causas raiz reales verificadas en Supabase remoto:
  - `list_admin_user_templates(uuid)` consultaba `template.lista_ids`, columna inexistente en `public.templates`
  - `list_admin_user_leads(uuid, integer)` declaraba `score numeric`, pero `public.leads.score` es `integer`

### Correcciones aplicadas

1. RPC de templates observados
- nueva migracion local `046_fix_admin_user_templates_rpc.sql`
- la funcion queda alineada a las columnas reales de `public.templates`
- se elimina la referencia invalida a `lista_ids`

2. RPC de leads observados
- nueva migracion local `047_fix_admin_user_leads_rpc_score_type.sql`
- en remoto se rehizo la funcion con `DROP + CREATE` para permitir cambio de firma
- `score` queda alineado a `integer`

3. UI de `Base`
- `AdminUserBase.tsx` ahora extrae `message` tambien desde errores Supabase no tipados como instancia de `Error`
- esto evita perder el mensaje real si reaparece otra incidencia backend

### Validacion tecnica ejecutada

- verificacion de esquema real:
  - `public.templates` no tiene `lista_ids`
  - `public.leads.score` es `integer`
- verificacion de definicion activa:
  - `list_admin_user_templates(uuid)` ya no referencia `lista_ids`
  - `list_admin_user_leads(uuid, integer)` ya retorna `score integer`
- simulacion SQL con contexto `auth.uid()` del superadmin:
  - `list_admin_user_leads('03b16aa2-27a9-4183-849f-182762678892', null)` devuelve `2`
  - `list_admin_user_templates('03b16aa2-27a9-4183-849f-182762678892')` ejecuta sin error
- `npm run build` en `MENSAJES`: OK

### Validacion manual pendiente

- recargar la extension y abrir:
  - `Admin SaaS > Usuarios y Mensajes > Soluciones Isapre > Base`
  - `Admin SaaS > Usuarios y Mensajes > Henry Farias > Base`
- confirmar que:
  - `Soluciones Isapre` ya muestra leads observados
  - un usuario sin leads no rompe `Base`, solo muestra vacio limpio

## Actualizacion de control al lunes 20 de julio de 2026, 13:40 CLT

- Auditado el corte final `Cloudflare -> Supabase` sobre los sintomas reportados en agenda publica y `Admin SaaS`.
- Causa raiz confirmada en frontend publico:
  - el runtime legacy del sidebar seguia leyendo atribucion almacenada de `pb` aun cuando el usuario ya estaba en `planespro.cl`
  - por eso el formulario general podia consultar disponibilidad con contexto contaminado
- Causa raiz confirmada en supervision admin:
  - la RPC `list_admin_user_templates(uuid)` declaraba `lead_ids uuid[]` pero la tabla real usa `text[]`
  - la carga observada de `Base` podia romper completa por ese mismatch
  - las RPC observadas rechazaban al propio admin como `observed_user`, dejando `Base` y `Agenda` propias fuera de la vista `Admin SaaS`

### Correcciones aplicadas

1. Runtime publico `sidebar`
- el contexto almacenado ya no se reutiliza fuera de la ruta `/pb`
- `advisor_id` ya no contamina el formulario general
- el beacon de abandono conserva `capture_ref`, `first_touch_ref`, `advisor_id`, `source_channel` y `source_form_variant`

2. Supabase / supervision admin
- nueva migracion `045_admin_observed_workspace_self_and_template_fix.sql`
- `mark_admin_user_leads_seen(uuid)` hace `noop` si el admin se observa a si mismo
- `list_admin_user_appointments(uuid, date, date)` ya permite autoobservacion del admin
- `list_admin_user_leads(uuid, integer)` ya permite autoobservacion del admin
- `list_admin_user_templates(uuid)` se recrea con `lead_ids text[]`

3. UI de admin
- `AdminUserBase.tsx` ahora muestra error explicito y deja de quedar en `loading` infinito cuando falla la carga observada

### Validacion tecnica ejecutada

- `supabase db query --linked --file "sql/migrations/045_admin_observed_workspace_self_and_template_fix.sql"`: OK
- `npm run build` en `MENSAJES`: OK
- `npm run build:lead-capture` en `landing-gerow`: OK
- `node tests/lead-capture-legacy-runtime-boundary-smoke.mjs`: OK
- deploy publico:
  - `npx wrangler pages deploy . --project-name planespro --branch master`: OK
  - purga de cache de assets publicos: OK

### Validacion manual pendiente

- verificar en extension que `Admin SaaS > Base` carga leads propios y ajenos
- verificar en extension que `Admin SaaS > Agenda` carga agenda propia y ajena
- verificar en sitio real que una cita creada por `/pb` ya no grisifica ni ocupa slots en `planespro.cl` salvo owner `general`

## Actualizacion de control al lunes 20 de julio de 2026, 23:58 CLT

- Auditada la agenda publica de `planespro.cl` y `pb`.
- Confirmado en backend:
  - `general` y `pb` resuelven owners distintos en Supabase.
  - las horas iguales vistas en ambos formularios el lunes 20 de julio de 2026 correspondian a `past_time`, no a un bloqueo compartido por owner.
- Endurecimiento aplicado:
  - nueva migracion `042_cancel_appointments_when_lead_deleted.sql`
  - trigger server-side para cancelar citas activas cuando un lead se elimina por soft delete
- Ajuste visual aplicado en formulario publico:
  - horas pasadas: gris azulado
  - horas ocupadas/agendadas: rojizo
  - otros slots no disponibles: gris claro
- Estado:
  - fix de base remota aplicado
  - frontend publico desplegado
  - pendiente validacion manual visual cruzada en `general` y `pb`

## Actualizacion de supervision admin al lunes 20 de julio de 2026, 23:59 CLT

Nuevo criterio confirmado de producto:

- el superadmin si debe poder observar leads, agenda y calendario de otros usuarios
- esa observacion no puede reutilizar ni contaminar la agenda operativa propia del superadmin
- la agenda principal del superadmin sigue siendo la cuenta central de `planespro.cl`
- las agendas de ejecutivos observados solo se consultan dentro de `Admin SaaS > Usuarios y mensajes`

### Capacidad nueva: workspace supervisor por usuario observado

Se consolida una capacidad separada del flujo diario:

1. `Base`
- ya permite ver leads del usuario observado
- ahora debe agregar alerta persistente de leads nuevos para ese usuario
- esa alerta debe vivir en el perfil del usuario dentro del bloque admin, no en la bandeja propia del superadmin

2. `Agenda`
- nueva pestana vecina a `Base`
- muestra citas/agendas del usuario observado en modo solo lectura
- no permite reprogramar, cancelar, crear, bloquear ni sincronizar desde esa vista
- no reutiliza `list_my_appointments(...)` del superadmin
- no altera disponibilidad publica del owner `general`

3. Aislamiento obligatorio
- `Agenda` de admin consulta por `observed_user_id`
- `Agenda` propia del superadmin sigue consultando solo `auth.uid()`
- los slots, citas y bloqueos del usuario observado no se mezclan con la agenda del superadmin
- el formulario general de `planespro.cl` sigue respondiendo contra la agenda owner `general`
- los links `pb` siguen respondiendo contra la agenda del owner del `capture_ref`

### Frontera tecnica elegida

Aplicando CONTROL, este bloque no debe resolverse con hacks de cliente ni con lectura oportunista de la agenda propia.

Se implementa con una frontera explicita:

- tabla de estado supervisor `admin_user_monitor_state`
- RPC admin-only para listar alertas de leads nuevos por usuario observado
- RPC admin-only para marcar esos leads como vistos al abrir `Base`
- RPC admin-only para listar citas de un usuario observado

### Regla funcional de alertas

- la alerta cuenta leads nuevos del usuario observado no vistos aun por el superadmin
- el contador se muestra:
  - en la fila del usuario en `Usuarios`
  - en la pestana `Base` del usuario seleccionado
- al abrir `Base` del usuario seleccionado, el superadmin confirma lectura y el contador de ese usuario baja a cero
- esta confirmacion debe persistir en backend, no en `localStorage`

### Regla funcional de agenda observada

- la pestana `Agenda` del usuario observado es read-only
- debe mostrar al menos:
  - fecha y hora
  - estado
  - lead asociado
  - canal/origen
  - enlace Meet si existe
  - estado de replica Google si aplica
- no debe exponer acciones destructivas ni operativas

### Validacion de cierre esperada

Para cerrar este bloque debe quedar validado que:

- `Base` y `Agenda` de admin leen datos del usuario observado
- la agenda propia del superadmin no cambia ni incorpora citas ajenas
- el contador de leads nuevos persiste y se limpia solo al abrir `Base`
- `planespro.cl` y `pb` conservan owners de agenda separados

## Corte final del dominio formulario al lunes 20 de julio de 2026

Aplicando CONTROL, el estado real del corte `Cloudflare -> Supabase` para formularios quedo asi:

- ya viven en Supabase como fuente de verdad y frontera canonica:
  - ownership comercial `general` y `pb`
  - `capture_links`
  - insercion de leads
  - creacion de citas
  - bloqueo real de slots
  - agenda operativa del CRM
  - PDF en Storage
  - replica Google Calendar / Meet
  - disponibilidad publica `form-public-availability`
  - abandono publico `form-lead-abandoned`
- Cloudflare deja de ejecutar logica de negocio del formulario:
  - `pb/app.js` y `frontend/lead-capture/js/app.js` ya apuntan directo a `supabase/functions/v1`
  - `ppcrm` ya no proxyea rutas del formulario; responde `410` en rutas legacy
  - `ppusers` ya no proxyea rutas del formulario; responde `410` en rutas legacy
  - `ppforms` ya no ejecuta runtime de formulario; queda como stub legacy retirado
- conclusion arquitectonica obligatoria:
  - el backend operativo del formulario ya quedo migrado a Supabase
  - Cloudflare queda solo como hosting estatico publico y superficies editoriales de blog/noticias mientras esas areas no migren

Este documento define la migracion de leads, agenda, archivos e integracion publica desde Cloudflare hacia Supabase. Desde esta fecha incorpora un requerimiento transversal obligatorio: cualquier UI nueva debe priorizar sidebar de extension y movil antes de asumir vistas amplias o patrones visuales pesados.

## Criterio arquitectonico consolidado al domingo 19 de julio de 2026

- Supabase sigue siendo el backend objetivo y la fuente de verdad final del producto.
- Cloudflare no debe volver a recibir logica de negocio canonica nueva si esa logica puede vivir en Supabase.
- Cloudflare se mantiene solo como borde branded y capa transitoria en estos casos:
  - dominio publico `planespro.cl` y `form.planespro.cl`
  - compatibilidad de rutas publicas existentes
  - tolerancia defensiva para clientes cacheados mientras termina el corte
- Toda decision de ownership, agenda, disponibilidad, citas, archivos y analitica comercial debe quedar resuelta finalmente en Supabase, aunque temporalmente exista un proxy branded delante.

## Riesgo arquitectonico detectado al domingo 19 de julio de 2026

El principal riesgo ya no es de migracion funcional sino de escalabilidad operativa de la bandeja de leads.

Hallazgo:

- la bandeja actual sigue cargando todos los leads del usuario y filtra/ordena en cliente
- luego enriquece toda la coleccion con alertas cruzadas
- y ademas carga `send_logs` para contadores por lead

Esto no rompe la direccion `Cloudflare -> Supabase`, pero si amenaza la escalabilidad del CRM aunque el backend sea correcto.

## Corte obligatorio siguiente para leads

Orden correcto:

1. aplicar indices estructurales en Supabase para `leads`, `lead_cross_exec_events` y `send_logs`
2. mantener queries auxiliares livianas para contadores y badges
3. reemplazar la carga completa de leads por paginacion, busqueda, orden y filtros server-side
4. separar los flujos que si necesiten universo completo, como exportacion o deteccion masiva de duplicados

Nota de criterio:

- si se sigue agregando UI o analitica encima del modelo actual de carga completa, luego habra que reescribir esa pantalla para escalar
- por eso la siguiente fase de hardening debe atacar primero la bandeja de leads antes de seguir creciendo el bloque administrativo o analitico

Estado al lunes 20 de julio de 2026:

- los puntos `1` y `2` ya quedaron ejecutados
- el punto `3` ya quedo implementado para la bandeja principal de leads
- el modo `olvidados` ya salio de la excepcion client-side y ahora vive en RPC dedicada en Supabase
- el dashboard operativo ya dejo de cargar colecciones completas y ahora consume snapshot agregado via `040_dashboard_snapshot_rpc.sql`
- sigue pendiente endurecer casos especiales que aun requieren universo completo o logica mixta:
  - exportaciones filtradas masivas si luego se decide optimizarlas sin fetch completo
  - chequeos de duplicados masivos si el volumen operativo exige mover esa lectura a una frontera mas especializada
  - analytics avanzados por link si su volumen deja de ser tolerable en lectura actual

## 0. Estado real al 2026-07-18

Este plan seguia describiendo bien la direccion, pero ya no reflejaba el estado real del trabajo ejecutado.

Resumen honesto:

- El proyecto si avanzo.
- El avance dominante reciente fue de base tecnica, no de funcionalidades visibles nuevas.
- Eso explica la percepcion de poco avance: se invirtieron varios cortes en dejar de crecer sobre una base acoplada.

### 0.1 Ya ejecutado

1. Integracion publica base
- `planespro.cl` ya envia leads al backend Supabase.
- los leads del formulario general ya aterrizan en la cuenta central esperada.
- los adjuntos PDF ya quedan en Storage y se pueden servir por la capa protegida desplegada.

2. Hardening del flujo de leads publicos
- el detalle del lead ya no pierde metadata al editar.
- el RUT ya se formatea y valida desde MENSAJES.
- los adjuntos nuevos ya usan nomenclatura trazable.
- existe edge function para servir PDFs autenticados inline.

3. Refactorizacion estructural ejecutada
- `App.tsx` fue partido.
- `useLeads`, `useLists`, `useTemplates` fueron adelgazados.
- se formalizo capa de `repositories` y `services`.
- se desacoplaron paginas operativas importantes:
  - tareas
  - historial
  - dashboard
  - pipeline
  - templates
  - comunidad
- se desacoplaron hooks auxiliares importantes:
  - send counts
  - telemetry
  - duplicates
  - saas

### 0.2 Lo que sigue pendiente de verdad

1. Refactorizacion
- Fase 5 cerrada en el alcance actual.
- `LeadsPage`, `LoginPage`, `usePresence` y `useChat` ya quedaron sin acceso directo a Supabase en el alcance auditado.
- El entry principal ya bajo con carga diferida por rutas.
- La deuda restante pasa a Fase 6 si corresponde a modelo de datos, SQL, storage o contratos backend.

2. Migracion funcional grande
- disponibilidad publica en Supabase
- agenda por asesor en Supabase
- separacion real del flujo general `planespro.cl` y el flujo `pb`: completada para captura y ownership de leads
- panel y modelo de `capture_links`: completado en primer corte; falta panel configurable avanzado

3. Cierre de producto
- analitica por link
- alertas cruzadas multi-captura
- agenda compacta sidebar/movil
- decision editorial sobre blog y noticias

### 0.3 Punto de proyecto

El proyecto hoy ya tiene captura publica y links por asesor en primer corte operativo.
El frontend publico activo ya quedo alineado directo a `functions/v1` de Supabase en el codigo local corregido.
La visualizacion y descarga de PDF ya corre por la frontera canonica `supabase/functions/form-lead-file` dentro de MENSAJES. El borde branded `form.planespro.cl/api/private/form-lead-file` queda solo como compatibilidad publica mientras siga existiendo trafico antiguo contra esa ruta.

El proyecto ya tiene primer corte de fundacion de agenda en Supabase mediante `025_planespro_agenda_supabase_foundation.sql` y la correccion `026_planespro_agenda_public_rpc_volatility_fix.sql`.

La disponibilidad publica ya responde desde Supabase como frontera canonica del formulario. El worker `ppforms` local quedo retirado y ya no procesa disponibilidad ni agenda.

El proyecto hoy esta en:

- integracion publica base ya funcionando
- refactorizacion estructural en progreso avanzado
- base SQL/RPC inicial de agenda ya aplicada en Supabase
- availability publica ya conectada a Supabase detras del dominio branded
- preparacion para UI compacta de agenda sin seguir acumulando deuda

## 1. Parametros confirmados del negocio

- Limite de archivos: 3MB por PDF adjunto.
- Asignacion de vendedores: determinista por `ref` en la URL.
- Frontera actual: `planespro.cl` conserva una frontera branded estable, pero la logica operativa principal del formulario ya debe resolverse en Supabase.

## 2. Estado actual auditado

### 2.1 Lo ya presente en MENSAJES

- CRM React con autenticacion, leads, plantillas, tareas y soporte interno.
- Backend Supabase con `leads`, `lead_notes` y SQL local nuevo para agenda (`appointments`, `user_availability`, `user_availability_overrides`) aun pendiente de consolidacion remota.

### 2.2 Lo que todavia resuelve Cloudflare

Aplicando CONTROL al 2026-07-20, Cloudflare ya no resuelve backend operativo del formulario.

Cloudflare queda solo para:

1. hosting estatico de `planespro.cl`
2. panel editorial y workers de `blog` y `noticias`
3. borde legacy retirado de `ppforms`, que ya no procesa negocio y solo devuelve `health`/`410`

### 2.3 Distincion confirmada de entradas publicas

El flujo externo no es un unico formulario.

- Existe un formulario general de `planespro.cl` que captura trafico organico o directo y debe aterrizar en una cuenta central o regla comercial controlada.
- Existe ademas el flujo `pb`, que representa formularios de publicacion por asesor y se resuelve por `ref` usando capture links dedicados.
- `pb` no es el formulario original de la landing principal: es un formulario independiente, pensado para ejecutivos externos.
- Cada link `pb` debe abrir directo ese formulario independiente y no la landing principal de `planespro.cl`.
- El formulario general original de `planespro.cl` no debe modificarse para hacer funcionar `pb`.
- En `landing-gerow`, el CRM actual genera dos tipos de links:
  - formulario general dirigido: `/?advisor_id=...&openForm=1`
  - formulario `pb`: `/pb/?ref=...`
- La agenda publica no se resuelve solo por `advisor_id`: primero intenta resolver `ref`, y si existe un capture link valido, ese `ref` define el asesor owner del flujo.
- La disponibilidad publica actual mezcla cuatro capas:
  - reglas base del asesor
  - bloqueos manuales
  - citas ya tomadas dentro del CRM
  - ocupacion real traida desde Google Calendar

### 2.4 Reglas nuevas del negocio para links de publicacion

- Cada usuario debe tener 1 link por defecto.
- El maximo de links no es global: depende del perfil o plan del usuario.
- La capacidad objetivo inicial es hasta 6 links de publicidad por usuario cuando su perfil lo permita.
- Cada link debe guardar al menos:
  - nombre visible
  - `short_code` publico corto, sin slug descriptivo y sin exponer UUID completo
  - campana
  - estado activo o inactivo
  - owner del link
- Cada link debe exponer metricas operativas y comerciales:
  - cantidad total de leads entrados por ese link
  - cantidad de leads cerrados originados por ese link
  - tasa de cierre derivada de ese mismo origen
- Las estadisticas no deben limitarse a conteos; deben permitir lectura por atributos del lead captado:
  - rango de edad
  - rango de renta
  - region
  - sistema actual: Fonasa o Isapre
  - isapre especifica
  - y otros atributos configurables despues en un panel de evaluacion

### 2.5 Regla comercial de multi-captura entre ejecutivos

- La propiedad operativa del lead se define por ultimo toque.
- `capture_ref` manda para ownership cuando el cliente completa nuevamente un formulario.
- `first_touch_ref` se conserva solo como trazabilidad historica y analitica.
- La funcionalidad no bloquea la captura de un segundo ejecutivo; solo informa que ya existio una captura previa.
- La deteccion de coincidencias debe revisar:
  - `rut`
  - `telefono`
  - `email`
- Como el formulario publico no exige `rut`, en la captura inicial la coincidencia se apoya en `telefono` y `email`.
- Cuando un usuario agrega o corrige el `rut` manualmente dentro del CRM, el sistema debe volver a evaluar coincidencias incluyendo ese `rut`.
- El segundo ejecutivo no debe ver que ejecutivo capturo antes al cliente. Solo debe ver que ya fue captado previamente y la fecha.
- El primer ejecutivo tampoco debe ver que ejecutivo recibio luego al cliente. Solo debe saber que ese cliente contacto a otro ejecutivo y la fecha.
- Esa notificacion cruzada debe poder activarse o desactivarse por usuario.
- La visibilidad debe ser reciproca:
  - si un usuario desactiva esta funcion, no avisa a otros cuando un cliente suyo contacta otro ejecutivo
  - y tampoco recibe avisos equivalentes cuando eso ocurra en sentido inverso
- Esta regla aplica a cualquier lead del CRM, no solo a los captados por formulario publico:
  - lead manual
  - lead importado por archivo
  - lead captado desde `planespro.cl`
- Para leads manuales o importados, la coincidencia solo debe servir para alertas de cruce entre ejecutivos.
- Para leads manuales o importados no se debe inferir campaña o `capture_link` si ese origen no existe de verdad.
- A futuro puede existir una asignacion manual explicita de campaña para leads no captados por formulario, pero no debe asumirse automaticamente.

## 3. Ajustes obligatorios introducidos por CONTROL

- No se puede planificar una agenda solo como vista a pantalla completa.
- La agenda debe nacer con patron compacto, responsive y escalable a sidebar y movil.
- La integracion con `planespro.cl` debe aterrizar en una UX coherente con `MENSAJES`, no en modales o tarjetas blancas genericas sin control de densidad.
- No usar emoticones o emojis en documentacion operativa ni microcopy del flujo.

## 4. Plan de implementacion estrategico

El plan se divide en cuatro modulos.

### Modulo 0: Refactorizacion estructural previa [COMPLETADO PARA FASE 5]

Este modulo pasa a ser el siguiente bloque prioritario antes de seguir expandiendo agenda, paneles editoriales o nuevas superficies admin.

#### 4.0 Objetivo

Separar responsabilidades y cerrar acoplamientos para que:

- `MENSAJES` pueda crecer sin seguir metiendo logica de negocio en UI
- la migracion branded hacia `planespro` no agregue otra capa improvisada
- agenda, blog y noticias aterricen sobre una arquitectura modular
- Supabase Realtime siga funcionando como hoy

#### 4.0.1 Frentes de refactor obligatorios

1. Shell de aplicacion
- [x] dividir `src/App.tsx` en un shell minimo de composicion
- [x] mover tareas operativas a modulos dedicados

2. Capa de acceso a datos
- [x] crear capa `services` o `repositories` por dominio
- [x] prohibir crecimiento nuevo de consultas `supabase.from(...)` dentro de paginas o componentes en dominios ya tocados
- [x] cerrar las fugas directas restantes en `admin`, `support`, `send` y `settings` para esta pasada de control
- [x] cerrar las fugas directas restantes en `LeadsPage`, `LoginPage`, `usePresence` y `useChat`

#### 4.0.2 Cierre de pasada 2026-07-18

Bloque completado en esta pasada:

- `AdminLayout`, `AdminUsersPage` y `AdminRequirementsPage` quedaron consumiendo `adminService` en vez de resolver queries directo en la pagina.
- `AdminUserTelemetry`, `AdminUserInventory`, `AdminUserHeatmap`, `AdminUserBase` y `AdminUserHelperStats` quedaron alineados con la capa de servicios.
- `SupportFloatingChat`, `AdminSupportChat`, `SupportTicketModal` y `SupportTicketsSettings` quedaron homogeneizados sobre `supportService`.
- `CallSender`, `EmailSender` y `WhatsAppSender` quedaron homogeneizados sobre `sendService`.
- `vite.config.ts` quedo con chunking manual por dominios y librerias pesadas para la primera pasada real de performance.

Validacion ejecutada:

- `rg` sin coincidencias de `supabaseClient` en `src/components/send`, `src/components/support`, `src/components/settings`, `src/pages/admin` y `src/components/admin`
- `rg` de `getSession()` con unico residuo esperado en `src/repositories/authRepository.ts`
- `npm run build` OK el 2026-07-18

3. Dominio leads
- [x] separar en `useLeads`:
  - lectura
  - mutaciones
  - realtime
  - mapeo de filas
  - prioridad de bandeja
- [ ] cerrar el ultimo acoplamiento UI fuerte que sigue alrededor de `LeadsPage`

4. Dominio branded `planespro`
- [x] aislar submit publico y lectura de archivos como dominio propio inicial
- [x] evitar que el detalle y la edicion del lead destruyan metadata publica capturada
- [ ] aislar agenda publica y ownership comercial final como dominio propio completo
- [ ] separar formalmente formulario general y flujo `pb`

5. Tipos y contratos
- [x] avanzar en tipos canonicos para metadata publica, leads, tasks, history y comunidad
- [x] reemplazar `any` restante en zonas criticas del alcance de Fase 5
- [ ] centralizar DTOs y contratos finales entre frontend, Edge Functions y SQL

#### 4.0.4 Cierre final de Fase 5 - 2026-07-18

Bloque completado en esta pasada:

- `LeadsPage` y `LoginPage` quedan normalizados para esta fase.
- `usePresence` y `useChat` quedan sin fuga directa de `supabaseClient` en el alcance auditado.
- `supportRepository`, `adminRepository` y `adminService` quedan con payloads y DTOs tipados en las rutas revisadas.
- `AdminSupportChat` y `SupportFloatingChat` quedan sin refs `any`.
- `TasksPage` y `SendHistoryPage` quedan sin mojibake detectado y sin casts `any` en callbacks revisados.
- `AppPageRenderer` usa carga diferida por rutas, bajando el entry principal del build a 30.27 kB.

Validacion ejecutada:

- `rg` global de mojibake en `src`, `PROTOCOLO_CONTROL.md`, `AI_SYNC.md`, `implementation_plan.md` y `roadmap.md`: sin coincidencias.
- `rg` de `any` en el bloque critico de paginas, hooks, servicios, repositorios, admin y soporte: sin coincidencias.
- `rg` de `supabaseClient` en paginas/hook/zonas migradas: sin coincidencias.
- `npm run build`: OK el 2026-07-18.

Estado:

- Fase 5 cerrada para el alcance de esta pasada.
- La siguiente IA debe auditar este cierre aplicando CONTROL antes de abrir agenda, `capture_links`, blog/noticias o nueva migracion de dominio.

#### 4.0.2 Restriccion clave

La refactorizacion no puede apagar ni degradar el tiempo real de Supabase.

Eso implica:

- no reemplazar canales realtime por polling
- no mover logica live a otra fuente de eventos
- no interponer una capa branded entre cliente autenticado y realtime de Supabase

La marca y el dominio pueden cambiar en HTTP publico, pero la conexion realtime interna puede seguir hablando directo con Supabase si eso preserva simplicidad y latencia.

#### 4.0.3 Regla de backend objetivo

Toda la arquitectura nueva debe asumir que el backend objetivo y permanente es Supabase.

Eso implica:

- Supabase es la source of truth de datos, auth, storage, SQL y realtime
- Cloudflare queda solo como capa transitoria de compatibilidad, proxy o routing publico mientras se completa la migracion
- no se deben crear nuevas dependencias de negocio que amarren el proyecto a Cloudflare si ya pueden resolverse nativamente en Supabase
- toda pieza nueva debe diseñarse para poder retirar Cloudflare sin reescribir el dominio principal del sistema

### Modulo 1: Infraestructura y Edge Functions en Supabase

#### 4.1 Endpoint de disponibilidad y agenda publica

- Reemplazara `GET /api/public/availability`.
- Leera `from` y `to`.
- Resolvera primero `ref` y luego `advisor_id`, replicando el contrato actual de `landing-gerow`.
- Consultara la funcion SQL equivalente en Supabase.
- Si el vendedor tiene Google Calendar conectado, cruzara disponibilidad real.
- Debe considerar reglas base, bloqueos manuales, citas CRM y busy intervals de Google.
- Debe devolver el contrato JSON esperado por el frontend actual.

#### 4.2 Endpoint de recepcion de leads

- Reemplazara `POST /api/form/leads`.
- Parseara `FormData`.
- Validara limite de 3MB.
- Subira adjuntos a Supabase Storage.
- Insertara el lead asignando owner segun el canal correcto:
  - formulario general `planespro.cl`
  - formulario `pb` por `ref`
- Si existe `cita_fecha_hora`, insertara `appointments` y disparara integracion de agenda.
- Enviara confirmacion transaccional por el proveedor definido.

Estado al 2026-07-18:

- Ya existe y esta en uso productivo el corte base de recepcion de leads en Supabase.
- El formulario general ya cae en la cuenta central.
- Falta la parte realmente dificil:
  - agenda
  - disponibilidad
  - `pb`
  - ownership comercial fino
  - `capture_links`

#### 4.2.1 Frontera de dominio branded

El objetivo ya no es dejar visible `pfoikdneixbvpozbtqcx` en la superficie operativa.

La direccion correcta es:

- formularios publicos y archivos servidos bajo `planespro.cl` o subdominios branded controlados por el proyecto
- Supabase como backend source of truth y capa de ejecucion de datos
- proxys o rutas branded solo donde aporten UX, seguridad operativa o control de contrato publico

No corresponde forzar el dominio branded sobre Supabase Realtime del CRM si eso agrega complejidad sin beneficio real.

Estado al 2026-07-17:

- Ya existe en `MENSAJES` la base SQL remota para captura publica:
  - `public.capture_links`
  - `public.submit_planespro_public_lead(jsonb)`
  - bucket privado `planespro-form-uploads`
- Ya existe y fue desplegada la Edge Function `form-leads`.
- El endpoint ya acepta `application/json` y `multipart/form-data`.
- La asignacion comercial hoy resuelve:
  - `capture_ref`
  - `first_touch_ref`
  - fallback a perfil admin
- Sigue pendiente:
  - separar explicitamente el flujo del formulario general y el flujo `pb` dentro del modelo Supabase
  - cambiar el frontend publico de `planespro.cl` para apuntar a esta funcion
  - agregar abandono de lead, disponibilidad y agenda sobre el mismo backend Supabase

Estado al 2026-07-18:

- El frontend publico ya fue ajustado en `landing-gerow` para que el submit de leads apunte a la Edge Function `form-leads` en Supabase.
- El corte aplicado es intencionalmente parcial:
  - `POST` de leads de `pb` ya apunta a Supabase
  - `POST` del formulario general/sidebar ya apunta a Supabase
  - el formulario general/sidebar conserva `fuente_cta`, `source_cta`, `campana`, `source_path` y `source_url` como origen de pagina/CTA
  - el formulario general/sidebar no envia `capture_ref`, `first_touch_ref` ni `advisor_id`, para no heredar ownership de links `pb`
- `GET /api/public/availability` ya tiene frontera canonica en `supabase/functions/form-public-availability`
- `POST /api/form/leads/abandoned` ya tiene frontera canonica en `supabase/functions/form-lead-abandoned`
- Se enviaron ya desde frontend los campos explicitos:
  - `source_channel`
  - `source_form_variant`
  - `source_hostname`
  - `source_path`
  - `source_url`

Estado de corte al 2026-07-20:

- Ese corte parcial ya fue superado en parte:
  - `POST /api/form/leads` ya no persiste negocio publico en D1; hoy delega a `supabase/functions/form-leads`
- `POST /api/private/form-lead-file` ya no sirve el adjunto desde R2 local; hoy delega a `supabase/functions/form-lead-file`
- `GET /api/public/availability` ya delega a `supabase/functions/form-public-availability` y el worker branded queda reducido a transporte
- `POST /api/form/leads/abandoned` ya delega a `supabase/functions/form-lead-abandoned`
- MENSAJES ya vuelve a leer el adjunto directo desde la frontera Supabase `form-lead-file`
- El dominio formulario ya no tiene la logica principal ejecutandose en Cloudflare:
  - `POST /api/form/leads` delega a `supabase/functions/form-leads`
  - `GET /api/public/availability` delega a `supabase/functions/form-public-availability`
  - `POST /api/form/leads/abandoned` delega a `supabase/functions/form-lead-abandoned`
  - MENSAJES consume adjuntos desde `supabase/functions/form-lead-file`
- Cierre real del corte:
  - Cloudflare queda como borde branded/transporte del trafico publico actual
  - tambien conserva superficies legacy separadas del flujo principal, como hosting estatico y piezas administrativas historicas aun no retiradas
  - el pendiente grande fuera de Supabase ya no es la captura publica, sino la decision sobre blog/noticias y la poda posterior de endpoints legacy
- Este corte respeta la prioridad pedida por negocio:
  - primero que los leads caigan en la extension
  - despues migrar disponibilidad y agenda sin romper la operacion
- El flujo de detalle del lead dentro de `MENSAJES` ya fue endurecido para:
  - no perder `metadata` al editar empresa, rut o estado
  - formatear y validar RUT desde el sidebar
  - separar visualmente adjunto y comentario
  - ocultar `updated_at` cuando no representa un cambio real de negocio
- Ya existe y fue desplegada la Edge Function `form-lead-file` para servir adjuntos PDF autenticados en inline a la extension.
- Verificacion remota del 2026-07-17:
  - `form-leads` responde `OPTIONS 200` con CORS correcto para `https://planespro.cl`
  - `form-lead-file` responde `401` ante JWT invalido, confirmando despliegue y proteccion activa
- El renombrado de adjuntos nuevos ya queda controlado desde `form-leads` con estructura trazable por fecha, nombre e identificador.
- Sigue pendiente validar en UI real:
  - apertura efectiva del PDF desde la extension autenticada
  - alerta visual de nuevo lead en la bandeja
  - no regresion al editar leads publicos ya capturados

#### 4.3 Modelo de captura publica objetivo

Supabase debe reflejar tres dominios distintos y coordinados:

1. Entrada general `planespro.cl`
- lead originado desde el formulario principal
- ownership por cuenta central o regla comercial definida
- sin depender obligatoriamente de un `ref`
- preserva origen/CTA de la pagina para analitica operativa sin convertirse en attribution de asesor

2. Entrada `pb` por asesor
- lead originado desde `/pb/?ref=...`
- ownership determinado por `capture_links`
- preservacion de `capture_ref` y `first_touch_ref` como trazabilidad comercial
- soporte para multiples links por usuario segun su perfil o plan
- nombre y campana por link como metadato operativo nativo

3. Agenda por asesor
- reglas semanales base por usuario
- bloqueos manuales por usuario
- citas tomadas y reprogramadas
- sincronizacion opcional con Google Calendar
- contrato publico de disponibilidad compatible con el frontend actual

#### 4.4 Modelo de analitica por link

El modelo de `capture_links` no debe servir solo para asignacion comercial. Debe convertirse en una dimension analitica estable.

Cada lead captado debe preservar de forma consultable:

- `capture_link_id`
- `capture_link_slug`
- `capture_link_name`
- `capture_campaign`
- `first_touch_ref`

El sistema debe poder calcular por link:

1. volumen
- leads totales
- leads activos
- leads cerrados

2. conversion
- porcentaje de cierre por link
- comparacion entre links del mismo usuario

3. composicion del trafico
- distribucion por edad
- distribucion por renta
- distribucion por region
- distribucion por sistema de salud
- distribucion por isapre especifica

4. extensibilidad
- panel donde luego se pueda marcar que atributos evaluar por link o por usuario sin remodelar toda la base

Recomendacion estructural:

- mantener una tabla canonica de `capture_links`
- mantener el lead como fuente de verdad del dato crudo
- construir vistas, RPCs o consultas agregadas para metricas por link
- no duplicar contadores manuales si pueden derivarse de datos canonicos
- excluir por defecto de la analitica por link a leads manuales o importados que no tengan origen comercial explicito

#### 4.5 Modelo de duplicados comerciales y alertas cruzadas

Se requiere un dominio separado para distinguir tres cosas:

1. ownership actual
- lo define el ultimo formulario completado
- queda asociado al `capture_ref` o al canal general correspondiente

2. historial de capturas del mismo cliente
- cada nueva captura del mismo cliente debe registrar evento historico
- la coincidencia se evalua por `telefono`, `email` y luego `rut` cuando exista
- esta logica aplica tambien a leads manuales e importados, porque el objetivo es informar cruce comercial entre ejecutivos

3. alertas operativas
- al abrir la vista de leads, un lead con cruce reciente debe subir al primer lugar o al bloque superior de prioridad
- al abrir el lead debe verse un aviso discreto:
  - `Lead captado previamente por otro ejecutivo el <fecha>`
  - o `Este cliente contacto a otro ejecutivo el <fecha>`
- no se debe revelar la identidad del otro ejecutivo en esa alerta

Requisitos tecnicos minimos:

- preferencia por usuario para activar o desactivar alertas cruzadas
- registro de eventos de cruce entre capturas del mismo cliente
- marcador visible en listado de leads
- marcador visible dentro del detalle del lead
- reevaluacion de coincidencias al actualizar manualmente `rut`, `telefono` o `email`
- separacion estricta entre:
  - coincidencia comercial entre ejecutivos
  - atribucion de campaña o `capture_link`
### Modulo 2: Integracion CRM y agenda nativa

Estado actual:

- aun no iniciado en implementacion real de agenda sobre Supabase
- bloqueado intencionalmente hasta terminar el saneamiento estructural minimo y la separacion del dominio publico

#### 4.5 Conexion Google OAuth

- Crear interfaz de conexion de Google Calendar.
- Guardar `refresh_token` en una tabla segura dedicada.
- Validar credenciales OAuth alineadas con Supabase.

#### 4.6 Agenda UI

- Construir primero una agenda compacta para sidebar y movil.
- Permitir crecimiento progresivo a vistas semanal o mensual sin duplicar componentes base.
- Mostrar `appointments` en tiempo real.
- Soportar reagendamiento sin abrir una segunda fuente de verdad.

Nota de auditoria:
La referencia anterior a `src/pages/AgendaPage.tsx` debe tratarse como objetivo tentativo, no como archivo existente confirmado, hasta validar su ubicacion real en el repo.

#### 4.7 Panel de disponibilidad, links de publicacion y evaluacion

- Interfaz donde cada vendedor define horas base y bloqueos excepcionales.
- Debe convivir con sidebar y movil sin desbordes ni layouts de escritorio fijo.
- Debe incluir gestion de links de publicacion por asesor:
  - link general dirigido
  - links `pb` adicionales por campana o canal
  - activacion y desactivacion sin perder trazabilidad
- Debe reflejar restricciones por perfil o plan:
  - 1 link incluido por defecto
  - ampliacion hasta 5 links si el perfil lo permite
- Debe permitir nombrar cada link y asignarle campana.
- Debe exponer estadisticas por link sin sacar al usuario a otra herramienta.
- Debe contemplar un panel futuro para definir que parametros evaluar en los leads captados por cada link.
- Debe contemplar tambien preferencias del ejecutivo para alertas cruzadas de leads multi-captura.

#### 4.8 UX operativa de alertas de duplicado comercial

- Si entra una nueva captura que coincide con un lead previo, el lead nuevo debe quedar visualmente priorizado en la bandeja.
- La alerta debe ser compacta y util dentro del ancho sidebar y movil.
- El copy no debe abrir disputa ni revelar identidad del otro ejecutivo.
- El sistema debe informar, no bloquear:
  - el segundo ejecutivo puede trabajar el lead
  - el primero puede seguir cerrandolo si corresponde fuera del sistema de ownership automatico
- La logica de cierre comercial por link debe seguir atribuyendo el cierre al lead y link con los que finalmente se trabaje en el CRM.

#### 4.9 Blog y noticias dentro del nuevo orden

Blog y noticias no deben crecer como bloque aislado por fuera de la arquitectura saneada.

Decision recomendada:

- mantener temporalmente el dashboard editorial actual de `landing-gerow` mientras se ejecuta la refactorizacion estructural
- definir despues si blog y noticias:
  - quedan federados con ese dashboard
  - o migran a un modulo admin dentro de `MENSAJES`

No conviene absorber ahora ese dominio en `MENSAJES` antes de resolver:

- modularidad
- capa de datos
- frontera branded
- agenda por asesor

### Modulo 3: Switch de trafico

Cuando el backend y la agenda esten validados:

1. actualizar `landing-gerow/frontend/lead-capture/js/app.js`
2. cambiar `workerUrl` hacia Supabase
3. desplegar la landing
4. confirmar que nuevos leads nazcan y se operen desde Supabase

Ajuste transitorio vigente:

- No se cambio aun el `workerUrl` completo porque eso romperia `availability` y `abandoned`.
- La estrategia activa ahora es separar:
  - base de submit de leads hacia Supabase
  - base de disponibilidad y abandono todavia en Cloudflare
- El cambio total del `workerUrl` queda diferido hasta que `availability` y agenda existan de forma estable en Supabase.

## 7. Siguiente bloque recomendado por CONTROL

Orden recomendado realista:

1. Auditoria cruzada de cierre de Fase 5 por IA-B
- validar ausencia de mojibake
- validar ausencia de `any` en el alcance critico
- validar que `LeadsPage`, `LoginPage`, `usePresence` y `useChat` no reintroduzcan acceso directo a Supabase
- validar build y lazy loading por rutas

2. Consolidar SQL y modelo de `capture_links`
- formulario general ya separado del flujo `pb` para ownership y payload publico
- flujo `pb`
- `pb` como frontdoor independiente para ejecutivos externos
- ownership comercial
- multi-captura y alertas
- estado actual: backend/RPC de links creado y aplicado en Supabase; panel compacto inicial creado en MENSAJES

3. Entrar a agenda Supabase
- disponibilidad
- bloqueos
- citas
- resolucion por `ref`

4. Recien despues abrir paneles mas grandes
- blog
- noticias
- superficies editoriales

#### 4.10 Impacto esperado del dominio `planespro` en carga y realtime

Usar dominio branded `planespro.cl` o un subdominio propio no deberia ralentizar de forma material la carga de datos ni el tiempo real si se mantiene esta separacion:

- HTTP publico y archivos: branded
- base de datos y realtime autenticado: Supabase nativo

El costo normal de un proxy branded bien implementado es marginal frente al tiempo total de red.

Los riesgos reales de degradacion no vienen del dominio en si, sino de decisiones malas de arquitectura:

- meter proxys innecesarios en cada consulta autenticada del CRM
- intentar tunelar realtime a traves de otra capa
- duplicar backend entre Cloudflare y Supabase
- agregar transformaciones de payload en rutas que hoy deberian ser directas

Por eso, la recomendacion es:

- branding en frontera publica
- acceso directo a Supabase para el plano interno autenticado del CRM y su realtime
- solo proxyear lo que realmente deba ocultarse o estabilizarse a nivel de contrato externo
- y tratar toda pieza Cloudflare restante como transitoria hasta su salida progresiva

### 4.11 Cierre parcial Fase 6-8: capture links backend

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/024_capture_links_management_rpcs.sql`.
- La tabla `capture_links` queda con `deleted_at` para desactivacion historica sin perder analitica.
- Se agregaron policies para que un usuario pueda operar sus propios links sin depender del superadmin.
- Se agregaron RPCs autenticadas:
  - `list_my_capture_links()`
  - `create_my_capture_link(...)`
  - `update_my_capture_link(...)`
  - `deactivate_my_capture_link(...)`
  - `get_my_capture_link_stats(...)`
- Se mantiene el limite por `profiles.capture_links_limit`, con rango operativo 1 a 6.
- Se creo backfill idempotente: todo perfil sin link recibe `Link principal`.
- Validacion remota:
  - 7 funciones verificadas en `public`
  - 3 perfiles remotos
  - 3 perfiles con link default
  - 0 perfiles sin link

Pendiente:

- Mantener agenda para el siguiente bloque, porque requiere disponibilidad, bloqueos y citas.

### 4.12 Panel compacto de links en MENSAJES

Estado al 2026-07-18:

- Se agrego `CaptureLinksSettings` dentro de Ajustes.
- El panel consume solo RPCs mediante `captureLinksService` y `captureLinksRepository`.
- El usuario puede:
  - listar sus links
  - crear links con nombre y campana
  - editar nombre y campana
  - marcar un link como principal
  - desactivar links no principales
  - copiar la URL publica corta `https://planespro.cl/pb/<short_code>`
  - ver leads, cierres, tasa de cierre y cortes analiticos basicos
- No se agregaron mutaciones directas desde UI sobre `capture_links`.
- Corte 2026-07-28:
  - `capture_links.ref_code` queda normalizado a codigos cortos de 6 caracteres desde Supabase.
  - los refs largos anteriores se conservan solo como auditoria en `metadata.legacy_ref_code`.
  - la extension construye y copia `https://planespro.cl/pb/<short_code>`.
  - `landing-gerow` mantiene rewrites estaticos para que `/pb/<short_code>` cargue el formulario PB y preserve el codigo como `ref` interno.
- Validacion ejecutada:
  - `npm run build`: OK
  - busqueda de `any`, mojibake y caracteres no ASCII nuevos en el bloque tocado: sin coincidencias

Pendiente:

- Validacion manual en extension con usuario real.
- Panel configurable avanzado para decidir que parametros evaluar.

### 4.13 Panel compacto de agenda en MENSAJES

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/027_planespro_agenda_management_rpcs.sql`.
- Se agregaron RPCs autenticadas para que MENSAJES gestione agenda sin tocar tablas directo desde UI:
  - `get_my_calendar_settings()`
  - `update_my_calendar_settings(...)`
  - `list_my_availability_rules()`
  - `save_my_availability_rules(...)`
  - `list_my_availability_blocks(...)`
  - `create_my_availability_block(...)`
  - `delete_my_availability_block(...)`
  - `list_my_appointments(...)`
- Se agrego `AgendaSettings` dentro de Ajustes.
- La UI permite:
  - ajustar duracion de cita, buffer, zona horaria y booking publico
  - editar horario semanal por dia
  - crear bloqueos manuales por fecha/hora
  - eliminar bloqueos manuales
  - ver citas proximas vinculadas a leads
- La UI usa `agendaService` y `agendaRepository`; no hay llamadas directas a Supabase desde el componente.
- Se agrego suscripcion Realtime filtrada por `user_id` para refrescar citas, disponibilidad y bloqueos.
- Validacion ejecutada:
  - migracion 027 aplicada en Supabase remoto
  - verificacion remota de 8 RPCs en `pg_proc`
  - `npm run build`: OK
  - busqueda de `!important`, mojibake y emojis en archivos tocados: sin coincidencias
  - `git diff --check`: OK, solo avisos LF/CRLF de Windows

Pendiente:

- Auditoria IA-B aplicando CONTROL.
- Validacion manual en extension con usuario real.
- Integracion segura de Google Calendar desde Supabase.
- Reprogramar/cancelar citas desde MENSAJES.

### 4.14 Conexion segura Google Calendar en Supabase

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/028_google_calendar_connection_foundation.sql`.
- Se agrego `get_my_calendar_connection_status()` para que MENSAJES lea solo metadata no sensible.
- Se agrego Edge Function `google-calendar-connect`.
- La funcion:
  - valida el JWT Supabase del usuario
  - valida el token Google contra `https://www.googleapis.com/oauth2/v3/userinfo`
  - guarda access token y refresh token con service role en `user_calendar_connections`
  - no devuelve tokens a la UI
- Se ajusto login Google para solicitar `access_type=offline` y `prompt=consent`.
- Se ajusto `AuthContext` para intentar persistir provider tokens cuando Supabase los entregue.
- Se agrego indicador compacto de conexion Google Calendar en `AgendaSettings`.
- Validacion ejecutada:
  - migracion 028 aplicada en Supabase remoto
  - deploy de `google-calendar-connect`: OK
  - `get_my_calendar_connection_status` verificada en `pg_proc`
  - POST sin Authorization a la funcion devuelve 401 controlado
  - `npm run build`: OK
  - busqueda de mojibake, emojis y `!important` en archivos tocados: sin coincidencias
  - `git diff --check`: OK, solo avisos LF/CRLF de Windows

Pendiente:

- Probar login real para confirmar que Google devuelve provider refresh token.
- Funcion de sincronizacion de busy events hacia bloqueos `google` completada en el bloque 4.15.
- Crear eventos Google Calendar desde citas nuevas o reprogramadas.
- Definir manejo de refresh token vencido, revocado o ausente.

### 4.15 Sincronizacion FreeBusy de Google Calendar

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/029_google_calendar_busy_sync.sql`.
- Se extendio `user_availability_blocks` con:
  - `google_event_id`
  - `google_calendar_id`
  - `metadata`
- Se agregaron indices para sincronizacion de bloqueos `google`.
- Se agrego Edge Function `google-calendar-sync`.
- La funcion:
  - valida JWT Supabase del usuario
  - lee tokens Google solo desde `user_calendar_connections` con service role
  - refresca access token si existe refresh token y secretos OAuth configurados
  - llama a Google FreeBusy para los proximos dias
  - elimina y reemplaza solo bloqueos `google` dentro del rango sincronizado
  - no lee titulos, descripcion, invitados ni detalles privados de eventos
  - actualiza `last_sync_status`, `last_sync_started_at`, `last_sync_finished_at` y `last_sync_error`
- Se configuraron secretos OAuth de Google en Supabase Functions sin escribirlos al repositorio.
- Se agrego accion compacta `Sincronizar` en `AgendaSettings`.
- La UI recibe solo conteo de bloqueos detectados, no datos privados del calendario.
- Validacion ejecutada:
  - migracion 029 aplicada en Supabase remoto
  - deploy de `google-calendar-sync`: OK
  - POST sin Authorization a la funcion devuelve 401 controlado
  - columnas `google_event_id`, `google_calendar_id` y `metadata` verificadas remotamente
  - `npm run build`: OK
  - busqueda de mojibake, emojis y `!important` en archivos tocados: sin coincidencias

Pendiente:

- Prueba manual con usuario real y Google Calendar conectado.
- Crear eventos Google Calendar desde citas nuevas completado en el bloque 4.16; queda pendiente reprogramacion.
- Crear link de Meet completado cuando Google lo entregue en el bloque 4.16.
- Definir comportamiento si Google rechaza refresh token.

### 4.16 Replica de citas Supabase hacia Google Calendar

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/030_google_calendar_event_status.sql`.
- Se extendio `appointments` con:
  - `google_sync_status`
  - `google_sync_error`
  - `google_synced_at`
- Se agrego Edge Function `google-calendar-create-event`.
- La funcion:
  - valida Authorization obligatorio
  - acepta JWT de usuario para citas propias
  - acepta service role para invocacion interna desde `form-leads`
  - valida `appointment_id`
  - verifica ownership si la llamada viene desde usuario autenticado
  - lee tokens Google solo desde backend con service role
  - refresca access token si corresponde
  - crea evento usando Google Calendar Events Insert
  - solicita conferencia Meet con `conferenceDataVersion=1`
  - actualiza `appointments.google_event_id`, `meet_link`, `google_sync_status` y `google_synced_at`
  - marca `google_sync_status = error` si Google falla
- Se actualizo `form-leads`:
  - despues de crear lead+cita, intenta crear evento Google
  - si Google falla, no revierte lead ni cita
  - devuelve el resultado en `google_calendar` cuando existe `appointment_id`
- Validacion ejecutada:
  - migracion 030 aplicada en Supabase remoto
  - deploy de `google-calendar-create-event`: OK
  - deploy de `form-leads`: OK
  - POST sin Authorization a `google-calendar-create-event`: 401 controlado
  - columnas `google_event_id`, `meet_link`, `google_sync_status`, `google_sync_error`, `google_synced_at` verificadas remotamente
  - `npm run build`: OK
  - busqueda de mojibake, emojis y `!important` en archivos tocados: sin coincidencias
  - busqueda de secretos literales en archivos: sin coincidencias

Pendiente:

- Prueba manual con usuario real y Google Calendar conectado.
- Reprogramar cita desde MENSAJES y actualizar el evento Google.
- Cancelar cita desde MENSAJES y cancelar/eliminar el evento Google.
- Definir si se debe invitar al email del lead o mantener evento solo en calendario del asesor.

### 4.17 Correccion de alcance Fase 6: base operativa vs ciclo completo

Estado al 2026-07-18:

- IA-B audito y aprobo el bloque `google-calendar-create-event`.
- La lectura correcta es: la base operativa de Agenda y Disponibilidad esta lista, pero el ciclo completo de gestion de citas no esta cerrado.
- Supabase queda como fuente de verdad inmediata para:
  - leads capturados desde formulario general
  - leads capturados desde links `pb`
  - citas publicas creadas desde formulario
  - disponibilidad publica y bloqueo de horas
  - ajustes internos de agenda por usuario
- Google Calendar queda como replica externa:
  - FreeBusy trae ocupacion externa solo cuando se sincroniza
  - Events Insert replica citas Supabase hacia Google Calendar
  - Google Meet se guarda cuando Google lo devuelve
  - fallas de Google no bloquean captura ni reserva en Supabase
- MENSAJES debe mostrar el acceso a Meet y alertas proximas cuando existan esos datos.

Validaciones tecnicas ya registradas:

- migraciones 025 a 030 aplicadas en Supabase remoto
- Edge Functions de agenda desplegadas
- build frontend OK en el ultimo bloque funcional
- endpoints protegidos devuelven 401 sin Authorization
- IA-B aprobo los tres cortes: foundation, FreeBusy y Events Insert

Validaciones manuales pendientes:

- probar login real y confirmar refresh token Google en usuario conectado
- crear cita publica con usuario Google conectado y verificar evento + Meet
- probar `pb` con `ref` real y agenda Supabase end-to-end
- revisar layout de agenda en sidebar de extension y movil

Ciclo completo pendiente antes de pasar a Blog/Noticias:

- reprogramar cita desde MENSAJES:
  - actualizar primero Supabase
  - validar conflicto contra citas activas y bloqueos
  - actualizar Google Calendar si existe `google_event_id`
  - si Google falla, mantener Supabase como verdad y dejar `google_sync_status = error`
- cancelar cita desde MENSAJES:
  - pasar estado a `cancelada` o `rechazada`
  - liberar slot porque la disponibilidad publica ignora estados cancelados/rechazados
  - cancelar o eliminar evento Google si existe `google_event_id`
  - si Google falla, mantener estado Supabase y dejar error visible
- alertas internas:
  - aviso compacto para citas dentro de las proximas 2 horas
  - priorizar aviso al abrir MENSAJES cuando falte poco
  - definir si debe existir notificacion persistente o solo alerta visual en Agenda
- Meet:
  - mostrar boton directo si existe `meet_link`
  - mostrar estado `Google pendiente` si el evento no pudo replicarse
  - no exponer tokens ni payload privado de Google Calendar
- participantes del Meet:
  - modelo `appointment_participants` en Supabase completado en el bloque 4.19
  - agregar/quitar participantes desde MENSAJES completado en el bloque 4.19
  - si existe `google_event_id`, actualizar el evento Google con `attendees` completado en el bloque 4.19
  - si no existe `google_event_id`, guardar participantes en Supabase y replicarlos cuando el evento se cree completado en el bloque 4.19
  - el lead capturado con email valido se agrega automaticamente como participante `lead`
  - los participantes terceros siguen siendo accion manual explicita del asesor desde MENSAJES
- auditoria:
  - registrar historial de reprogramacion/cancelacion
  - registrar alta/baja/cambio de participantes
  - separar eventos originados en Supabase de eventos originados en Google
  - decidir si cambios hechos directamente en Google deben modificar Supabase o solo generar alerta

### 4.18 Visibilidad inmediata de Meet y alertas proximas

Estado al 2026-07-18:

- Se agrego `sql/migrations/031_appointment_visibility_meet_alerts.sql`.
- Se amplio `list_my_appointments(...)` para devolver:
  - `meet_link`
  - `google_event_id`
  - `google_sync_status`
  - `google_sync_error`
  - `google_synced_at`
- Se actualizo `agendaRepository`, `agendaService` y tipos `AgendaAppointment`.
- Se actualizo `AgendaSettings` para:
  - mostrar boton `Abrir Meet` cuando exista `meet_link`
  - mostrar aviso compacto si la cita inicia dentro de 2 horas
  - mostrar estado `Google pendiente` si la replica externa quedo en error
- Seguridad:
  - no se exponen tokens
  - el RPC mantiene filtro por `auth.uid()`
  - solo se muestra metadata no sensible de la cita

### 4.19 Participantes de Meet desde MENSAJES

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/032_appointment_participants.sql`.
- Se creo tabla `appointment_participants` con:
  - `appointment_id`
  - `user_id`
  - `email`
  - `name`
  - `participant_role`
  - `invitation_status`
  - `google_sync_error`
  - `google_synced_at`
  - `deleted_at`
- Se agregaron RPCs autenticadas:
  - `list_my_appointment_participants(...)`
  - `add_my_appointment_participant(...)`
  - `delete_my_appointment_participant(...)`
- Se agrego Realtime sobre `appointment_participants`.
- Se agrego Edge Function `google-calendar-sync-attendees`.
- La funcion:
  - valida JWT Supabase
  - valida ownership de la cita
  - lee participantes activos desde Supabase
  - refresca access token Google si corresponde
  - actualiza `attendees` del evento con Google Calendar Events Patch
  - usa `sendUpdates=all` cuando existen participantes, incluido el lead agregado automaticamente
  - no expone tokens al frontend
- Se actualizo `google-calendar-create-event`:
  - si la cita ya tenia participantes antes de crear evento Google, el evento nace con esos invitados
  - si no hay participantes, mantiene `sendUpdates=none`
- Se agrego `sql/migrations/035_auto_invite_lead_participant.sql`:
  - crea `ensure_lead_appointment_participant(...)`
  - inserta automaticamente al lead con email valido como participante `lead`
  - aplica tanto al formulario publico PlanesPro como a citas creadas desde detalle del lead
  - permite que Google Calendar envie invitacion y recordatorios nativos al cliente cuando el usuario tenga Calendar conectado
- Se actualizo `AgendaSettings`:
  - muestra participantes por cita
  - permite agregar nombre/email
  - permite quitar participante
  - sincroniza asistentes con Google cuando hay evento
  - si aun no hay evento Google, conserva el participante en Supabase para replica posterior

Pendiente:

- Prueba manual con usuario real conectado a Google Calendar.
- Extender la auditoria formal para altas y bajas de participantes, hoy visible sobre todo para creacion, reprogramacion y cancelacion.

### 4.20 Reprogramacion y cancelacion de citas desde MENSAJES

Estado al 2026-07-18:

- Se agrego y aplico en Supabase `sql/migrations/033_appointment_reschedule_cancel.sql`.
- Se creo tabla `appointment_audit_events` para auditoria tecnica inicial.
- Se agregaron RPCs autenticadas:
  - `reschedule_my_appointment(...)`
  - `cancel_my_appointment(...)`
- `reschedule_my_appointment(...)`:
  - valida ownership con `auth.uid()`
  - solo permite reprogramar citas activas
  - rechaza horarios pasados
  - valida conflicto contra otras citas activas del usuario
  - valida conflicto contra bloqueos manuales, Google o sistema
  - actualiza `appointments` y `leads.scheduled_at`
  - marca `google_sync_status = pending` si existe evento Google
- `cancel_my_appointment(...)`:
  - valida ownership con `auth.uid()`
  - cambia estado a `cancelada`
  - agrega razon a notas cuando existe
  - actualiza metadata del lead
  - libera el slot porque la disponibilidad publica no considera estados `cancelada` o `rechazada`
  - marca `google_sync_status = pending` si existe evento Google
- Se agrego Edge Function `google-calendar-update-event`.
- La funcion:
  - valida JWT Supabase
  - valida ownership de cita
  - en reprogramacion usa Google Calendar Events Patch con `conferenceDataVersion=1`
  - en cancelacion usa Google Calendar Events Delete con `sendUpdates=all`
  - mantiene Supabase como fuente de verdad aunque Google falle
  - no expone tokens al frontend
- Se actualizo `AgendaSettings`:
  - permite elegir nueva fecha/hora por cita
  - permite reprogramar
  - permite cancelar
  - mantiene UI compacta dentro de cada cita

Pendiente:

- Prueba manual con usuario real y Google Calendar conectado.
- Validar que una cita cancelada desaparece de disponibilidad publica como slot ocupado.
- Validar en uso real la UI visible de historial/auditoria para el usuario final.

### 4.21 Crear cita desde el detalle del cliente

Estado al 2026-07-18:

- Se agrego `sql/migrations/034_create_appointment_from_lead.sql`.
- Se creo RPC autenticada `create_my_appointment_from_lead(...)`.
- La funcion:
  - valida sesion con `auth.uid()`
  - valida que el lead pertenezca al usuario autenticado
  - rechaza leads eliminados
  - usa la configuracion de agenda del usuario para duracion, buffer y zona horaria
  - rechaza horarios pasados
  - rechaza conflictos contra citas activas y bloqueos de disponibilidad
  - impide crear otra cita activa para el mismo lead
  - inserta la cita en Supabase como fuente de verdad
  - actualiza `leads.scheduled_at` y metadata de cita sin perder metadata existente
  - registra auditoria tecnica como `created_from_lead`
- Se agrego `createAppointmentFromLead(...)` en `agendaService`.
- El service crea primero la cita en Supabase y luego intenta llamar a `google-calendar-create-event`.
- Si Google Calendar no esta conectado o falla, la cita queda creada en Supabase y la UI informa que Google quedo pendiente.
- Se agrego un formulario compacto en `LeadDetail` para elegir fecha, hora y nota de cita.

Pendiente:

- Aplicar migracion 034 en Supabase remoto.
- Probar con usuario real que la cita creada desde detalle bloquea el slot publico.
- Probar con usuario real Google conectado que la cita creada desde detalle genera evento y Meet.
- Definir si el detalle del lead debe permitir reprogramar/cancelar ahi mismo o mantener esas acciones solo en Ajustes, Agenda.

### 4.22 Separacion entre configuracion de agenda y agenda operativa

Estado al 2026-07-18:

- Se agrego `AgendaPage` como seccion propia del producto.
- El menu principal ahora incluye `Agenda`.
- Ajustes cambio el tab a `Config agenda`.
- `AgendaSettings` queda enfocado en:
  - duracion de cita
  - buffer
  - zona horaria
  - booking publico
  - horario semanal
  - bloqueos manuales
  - conexion y sincronizacion Google Calendar
- `AgendaPage` queda enfocado en operacion diaria:
  - citas activas
  - alertas por proximidad
  - acceso a Meet
  - reprogramacion
  - cancelacion
  - participantes bajo boton compacto
  - citas canceladas separadas en una vista colapsada
- `LeadDetail` ya puede abrir `Agenda` enfocando la cita especifica del lead mediante `#agenda?appointment=<id>`.
- `AgendaPage` ahora muestra un bloque `Historial (n)` por cita activa usando RPC autenticada y eventos de auditoria visibles.
- Las citas canceladas ya no muestran campos para participantes ni acciones de reprogramacion/cancelacion.
- Las canceladas muestran:
  - nombre del cliente
  - fecha de creacion de la cita
  - fecha/hora de cancelacion
  - accion para ir a la ficha del lead y agendar nuevamente si corresponde
- `LeadDetail` ahora:
  - oculta metadata tecnica como `source_cta` y `appointment_id` del bloque de informacion adicional
  - muestra `Abrir Meet` si la cita activa tiene link
  - muestra `Gestionar cita` para ir a la seccion Agenda
  - muestra copy operativo cuando Google falla pero la cita ya quedo aplicada en MENSAJES
  - conserva creacion de cita nueva cuando el lead no tiene cita activa
- `AgendaPage` ahora normaliza el copy de exito para crear/reprogramar/cancelar:
  - no presenta el caso `Google pendiente` como si la cita hubiera fallado
  - explica que la hora ya quedo aplicada en MENSAJES y que Google queda como replica externa pendiente
- `LeadsPage` ahora detecta cita activa al eliminar un lead, muestra confirmacion explicita y cancela primero la cita para liberar el slot antes de moverlo a papelera o borrarlo definitivamente.

Pendiente:

- Validar visualmente la nueva seccion Agenda en sidebar de extension y movil.
- Validar visualmente el bloque de historial dentro de Agenda en sidebar real para confirmar densidad y legibilidad.
- Definir si se requiere notificacion persistente global cuando una cita esta por iniciar o finalizar.

Actualizacion de aislamiento publico y supervision admin al lunes 20 de julio de 2026, 13:10 CLT:

- Se detecto una regresion post-migracion: la supervision admin ya observaba agenda por RPC, pero la base observada seguia leyendo `leads` y `templates` por `select` directo desde cliente, lo que la dejaba expuesta a RLS y devolvia paneles vacios para usuarios ajenos.
- Se detecto una segunda regresion en `landing-gerow/frontend/lead-capture/js/sidebar-runtime.js`: el runtime lateral seguia enviando `source_channel = general` y, peor aun, eliminaba `capture_ref`, `first_touch_ref` y `advisor_id` justo antes del submit.
- Decisiones tomadas:
  - mover la base observada del superadmin a RPC admin-only igual que la agenda observada
  - corregir `list_admin_user_lead_alerts()` para que la primera observacion no nazca con contador cero falso
  - publicar de nuevo el runtime lateral para que la version productiva deje de borrar ownership PB
- Corte implementado:
  - migracion `044_admin_observed_workspace_queries.sql`
  - RPC nueva `public.list_admin_user_leads(uuid, integer)`
  - RPC nueva `public.list_admin_user_templates(uuid)`
  - `public.list_admin_user_lead_alerts()` ahora cuenta todos los leads si el admin aun no tiene estado previo para ese usuario observado
  - `src/repositories/adminRepository.ts` ahora consume RPCs admin-only para leads, templates y recent leads observados
  - `frontend/lead-capture/js/sidebar-runtime.js` ya no borra ownership PB antes del submit y ya deriva `source_channel` desde contexto resuelto
- Estado tecnico confirmado:
  - `general` no tiene citas activas en `appointments`; solo canceladas
  - `pb` si tiene citas activas por owner correcto:
    - `isapresoluciones@gmail.com` -> `2` confirmadas
    - `hentimes@gmail.com` -> `1` confirmada
  - `user_availability_blocks` esta vacia, por lo que la regresion actual no proviene de bloqueos manuales huérfanos
- Validaciones ejecutadas:
  - `npm run build` en MENSAJES -> OK
  - `npm run build:lead-capture` en `landing-gerow` -> OK
  - `node tests/run-lead-capture-smoke-suite.mjs` -> OK
  - `supabase db query --linked --file "sql/migrations/044_admin_observed_workspace_queries.sql"` -> OK
  - `npx wrangler pages deploy . --project-name planespro --branch master` -> OK
- Pendiente inmediato de producto:
  - recargar extension y validar manualmente que `Admin SaaS > Usuarios y mensajes > Base` ya muestre los leads observados
  - validar manualmente que el formulario principal de `planespro.cl` no herede ownership PB en navegador normal
  - validar manualmente que el formulario lateral `/pb` siga asignando lead y cita al owner del link

Preparacion Fase 7 Blog/Noticias:

- Se audito `landing-gerow` de forma acotada para no contaminar la migracion con archivos generados.
- Blog actual:
  - frontend publico: `blog.html`, `blog-post.html`, `blog/index.html`, `js/blog.js`
  - Worker: `cloudflare/ppblog/src/index.js`
  - datos: D1 `ppblog_db`
  - media: R2 `ppblog-uploads`
  - dominio API/media: `https://blog.planespro.cl`
  - tablas D1: `posts`, `categories`, `tags`, `post_tags`
  - admin protegido por `ppusers` / `admin.planespro.cl`
- Noticias actual:
  - frontend publico/home: `noticias.html`, `js/index-news-blog.js`
  - Worker: `cloudflare/ppnews/src/index.js`
  - datos: D1 `ppnews_db`
  - media: R2 `ppnews-thumbnails`
  - dominio API/media: `https://news.planespro.cl`
  - cron Cloudflare: `0 2,14,18,22 * * *`
  - tablas D1: `news_items`, `news_sources`, `news_runs`, `cache_snapshots`
  - admin protegido por `ppusers` / `admin.planespro.cl`
- Contratos publicos a preservar:
  - `GET /api/posts?published=true&limit=100&page=1`
  - `GET /api/posts/:slug`
  - `GET /api/categories`
  - `GET /api/tags`
  - `GET /api/news?limit=12&days=60`
  - rutas SEO `/blog/`, `/blog/:slug/` y `/noticias`
- Restriccion principal:
  - no mover blog/noticias a MENSAJES como UI monolitica ni dashboard pesado
  - crear primero modelo Supabase y frontera API compatible
  - luego migrar admin editorial compacto
  - solo retirar Cloudflare cuando haya paridad publica, admin y SEO

## 5. Plan de verificacion

- Flujo de disponibilidad: comparar respuesta Supabase contra contrato Cloudflare.
- Validacion tecnica ejecutada el 2026-07-19:
  - `https://form.planespro.cl/api/public/availability?date=2026-07-20` responde `source=supabase` para canal `general`.
  - el slot local `12:00` del `2026-07-20` no aparece libre en `general`, consistente con una cita activa guardada a las `16:00:00+00` en Supabase.
  - `https://form.planespro.cl/api/public/availability?date=2026-07-20&ref=pp-03b16aa227a94183849f182762678892` responde `source=supabase`, `source_channel=pb` y `capture_link_id=1`.
  - la URL publica generada por MENSAJES para `pb` sigue siendo `https://planespro.cl/pb/?ref=...` porque `https://form.planespro.cl/pb/...` aun no existe en produccion.
  - la ruptura visual observada en `pb` no venia del backend Supabase sino de la publicacion de `landing-gerow`; el 2026-07-19 se corrigio con reglas estaticas explicitas y purge de cache en Cloudflare.
- Asignacion por URL: probar distintos `ref` y verificar `user_id`.
- Validacion real ejecutada el 2026-07-19:
  - `capture_links` remotos existen y usan el esquema real `owner_user_id`, `label`, `campaign_name`, `ref_code`.
  - `https://planespro.cl/pb/styles.css` responde `text/css` y `https://planespro.cl/pb/app.js` responde `application/javascript` en el dominio real.
  - `https://form.planespro.cl/api/form/leads` quedo corregido para delegar la captura publica a Supabase y no persistir `pb` en `FORM_DB` local.
  - una captura real por `pb` devolvio `lead_id=47fc28fe-826a-40a3-ae35-cc02ae957f6e`, `appointment_id=5d34f131-aac5-4a9d-9e2c-a690370440f0`, `source_channel=pb`, `capture_link_id=3` y `assigned_user_id=e6efca41-f404-49c0-adde-9f65b3219f02`.
  - la fila real en Supabase confirma `user_id=e6efca41-f404-49c0-adde-9f65b3219f02`, `metadata.source_channel='pb'`, `metadata.capture_ref='pp-e6efca41f40449c0adde9f65b3219f02'` y `google_sync_status='error'` por falta de conexion Google del owner de prueba.
  - la disponibilidad publica `pb` ya dejo de ofrecer el slot local `09:00` del `2026-07-20` despues de la captura real.
  - se detecto y corrigio un bug de frontend en `pb`: `sanitizeCaptureRef` truncaba el `ref` a 32 caracteres aunque los `ref_code` reales usan formato largo `pp-<uuid32>`.
  - el efecto del bug era fallback silencioso al owner general de `planespro.cl@gmail.com`, dando la impresion de que `pb` compartia agenda con el formulario principal.
  - tras ampliar el sanitizer a 64 caracteres y desplegar Pages, la comparacion directa para `2026-07-20` confirma agendas distintas:
    - `general`: slots ocupados en `12:00` y `13:00`
    - `pb` del owner `hentimes@gmail.com`: slot ocupado en `09:00`
  - validacion productiva adicional del domingo 19 de julio de 2026:
    - `POST https://form.planespro.cl/api/form/leads` con `capture_ref=pp-03b16aa227a94183849f182762678892` devolvio:
      - `lead_id=d84950a1-922d-4866-969f-b286c8e4ddd7`
      - `appointment_id=f96d77cc-66c1-4f34-bf09-539755540671`
      - `capture_link_id=1`
      - `assigned_user_id=03b16aa2-27a9-4183-849f-182762678892`
      - `google_calendar.status='synced'`
    - la cita creada quedo en `public.appointments` con:
      - `user_id=03b16aa2-27a9-4183-849f-182762678892`
      - `source_channel='pb'`
      - `capture_ref='pp-03b16aa227a94183849f182762678892'`
      - `capture_link_id=1`
      - `google_sync_status='synced'`
    - la disponibilidad `pb` posterior ya marca `10:00` como `busy` para ese owner.
  - conclusion tecnica actual:
    - el backend branded `pb -> ppforms -> form-leads -> Supabase` ya asigna correctamente leads y citas nuevas al owner del link
    - los registros que siguen apareciendo bajo superadmin corresponden a capturas previas al fix del `ref` truncado
    - el problema visible restante en MENSAJES venia de la bandeja principal, que estaba cargando todos los leads visibles por policy en vez de solo `user_id = auth.uid()`
- Validacion manual reportada por usuario el 2026-07-19:
  - un lead creado desde la pagina principal de `planespro.cl` ya vuelve a entrar correctamente en MENSAJES.
- OAuth: probar multiples cuentas sin colision de tokens.
- Limites de archivo: rechazar 5MB y aceptar 1MB.
- UI compacta: validar agenda y componentes clave en ancho de sidebar y en movil.
- Consistencia visual: rechazar implementaciones que dependan del patron dominante de tarjetas blancas redondeadas.

## 6. Hallazgos abiertos al 2026-07-17

- El plan previo sobredeclaraba una agenda a pantalla completa y no reflejaba la prioridad de sidebar y movil.
- El roadmap previo usaba emojis y no representaba el nuevo criterio visual obligatorio.
- La ubicacion exacta de la futura pagina o modulo de agenda debe verificarse en el arbol real antes de implementarse.
- El primer corte Supabase ya recibe leads publicos y ya separa el formulario general de `planespro.cl` del flujo `pb` por asesor para ownership y payload de leads.
- El modelo actual de `capture_links` en Supabase ya contempla limites por perfil, nombre de campana y analitica comercial inicial por link; sigue pendiente el panel configurable avanzado de parametros.
- El esquema remoto real de `capture_links` usa `owner_user_id` y `label`; cualquier auditoria futura debe basarse en esos nombres y no en aliases verbales como `user_id` o `name`.
- Existe una anomalia historica que debe auditarse antes de cerrar totalmente la fase: hay citas antiguas con `source_channel='general'` pero `capture_ref` poblado.
- La deuda de publicacion publica de `pb` en `landing-gerow` ya fue corregida el 2026-07-19; cualquier regresion futura debe auditar primero `_redirects`, cache Cloudflare y el smoke `tests/pb-public-routing-smoke.mjs`.
- El worker `ppforms` ya no debe tratar `POST /api/form/leads` como persistencia D1 local para trafico publico; esa frontera branded ahora debe seguir delegando a `form-leads` en Supabase.
- La separacion de agenda entre `general` y `pb` no depende solo de la RPC; tambien depende de preservar completo el `ref_code` en frontend. Cualquier regresion futura debe auditar `frontend/lead-capture/js/app.js`, `pb/app.js` y el smoke `tests/pb-capture-ref-length-smoke.mjs`.
- El 2026-07-19 se cerro el incidente de clientes `pb` cacheados en dos capas:
  - `ppforms` ya recupera el `ref` completo desde `referer` para la disponibilidad publica aunque la query venga truncada.
  - Supabase ya recupera el `ref` completo desde `source_url` dentro de `submit_planespro_public_lead` y `create_planespro_appointment_for_lead`, por lo que lead y cita quedan asignados al owner correcto aun si el body trae `capture_ref` truncado.
- Validacion de cierre ejecutada el 2026-07-19:
  - submit de regresion previo al parche SQL: `lead_id=c29745f5-6448-4d2f-99e1-a275077b54b3` quedo mal en superadmin.
  - submit de regresion posterior al parche SQL: `lead_id=f5f4eafa-c989-44c4-aed7-f74307146995`, `appointment_id=55eb11fa-0014-47c0-82fa-4408ecafb6db`, `capture_link_id=1`, `assigned_user_id=03b16aa2-27a9-4183-849f-182762678892`.
  - la fila final en `public.leads` ya persiste `metadata.capture_ref` y `metadata.raw_payload.capture_ref` con el `ref` largo correcto.
- Limpieza historica ejecutada el 2026-07-19:
  - migracion/version operativa: `sql/migrations/037_repair_historical_pb_owner_assignments.sql`
  - resultado remoto:
    - `repaired_leads = 5`
    - `repaired_appointments = 5`
  - se corrigieron owners y metadatos de leads `pb` historicos que habian quedado en superadmin por el bug previo.
  - las 5 citas historicas ya `cancelada` quedaron con owner correcto, `capture_ref` correcto y referencias Google neutralizadas:
    - `google_event_id = null`
    - `meet_link = null`
    - `google_sync_status = 'skipped'`
    - `google_sync_error = 'historical_pb_owner_repair'`
- La bandeja principal de MENSAJES no debe usar lecturas globales de `leads` aunque el usuario sea admin. El criterio correcto es:
  - inbox principal: solo leads propios
  - auditoria admin/helper: leads de terceros solo desde vistas admin por perfil
- Aun no existe modelo tecnico en Supabase para deteccion de multi-captura, alertas cruzadas reciprocas y reevaluacion de coincidencias al completar `rut` manualmente.
- `MENSAJES` aun necesita una fase de refactorizacion estructural antes de absorber con seguridad agenda, blog y noticias bajo una sola arquitectura.

## 7. Infraestructura de correo segura - 2026-07-21

Aplicando CONTROL, el frente de correo quedo reencaminado para que no nazca una nueva dependencia insegura mientras migramos fuera de Cloudflare.

- Corte arquitectonico aplicado:
  - la extension ya no debe hablar con `api.resend.com` desde el navegador
  - la credencial de Resend deja de vivir en `profiles`
  - el backend canonico de correo pasa a ser `supabase/functions/send-email`
  - `form-leads` tambien queda alineado al mismo criterio: API key global en secreto de Supabase y remitente visible por perfil o fallback global
- Cambios estructurales:
  - nueva Edge Function `send-email`
  - `src/utils/emailSender.ts` ahora delega a `supabase.functions.invoke('send-email')` cuando el proveedor es `resend`
  - `manifest.json` ya no solicita permiso directo a `https://api.resend.com/*`
  - `sql/migrations/049_secure_resend_delivery.sql`:
    - mueve el default de `profiles.email_provider` a `resend`
    - limpia y elimina `profiles.resend_api_key`
- Resultado esperado:
  - el cambio futuro de DNS desde Cloudflare a Hostinger no exige reescribir la capa de correo
  - el dominio remitente sigue siendo una configuracion externa de Resend, no una dependencia estructural del frontend ni del CRM
- Pendiente de cierre funcional:
  - validar manualmente envio real desde la extension con un usuario `resend`
  - validar manualmente entrega de correos de cita desde `planespro.cl` y desde `/pb`
  - decidir si `emailjs` se mantiene solo como legacy visible o si se elimina en la siguiente limpieza

## Actualizacion 2026-07-21 - Correo multi-tenant por usuario

Aplicando CONTROL, la capa de correo entra a su fase correcta de multi-tenancy:

- `send-email` deja de depender de una API key central compartida para los envios de la extension.
- Se introduce `user_email_channels` como almacenamiento server-side cifrado de credenciales por usuario.
- `form-leads` ahora intenta resolver el canal Resend del owner real del lead o de la cita.
- Se mantiene fallback de sistema solo para no romper formularios publicos mientras los usuarios aun no cargan su propio canal.
- `EmailSettings` pasa a gestionar uno o varios canales Resend por usuario desde MENSAJES.
- `emailjs` sigue como carril legacy temporal y no como arquitectura objetivo.

### Cierre de esta subfase

Queda resuelto a nivel de arquitectura y deploy:

- ingreso de multiples API keys de Resend por usuario
- cifrado backend de credenciales con `EMAIL_CHANNELS_MASTER_KEY`
- CRUD autenticado de canales via edge function
- resolucion por owner en `send-email` y `form-leads`

### Pendiente inmediato

- validacion manual en UI de alta de canal por usuario
- validacion manual de envio real desde extension usando canal propio del usuario
- validacion manual de cita publica usando canal propio del owner en vez del fallback de sistema

## Actualizacion 2026-07-21 - Entitlements SaaS y planes

Aplicando CONTROL, queda formalizado que la capa SaaS no puede depender de nombres visuales de features ni de refrescos manuales de sesion.

- Contrato canonico:
  - las funcionalidades activas deben resolverse por `feature_id`
  - el frontend de navegacion y gating debe consumir esos mismos `feature_id`
  - el estado visual de `Licencias` debe distinguir:
    - funcionalidades heredadas por plan
    - overrides manuales permanentes
    - overrides temporales por trial
- Corte aplicado:
  - `get_my_features()` ahora devuelve `feature_id`
  - `routes.ts` queda alineado a `module:*`
  - `AuthContext` refresca entitlements en realtime si cambian:
    - `profiles.plan_id`
    - `user_feature_overrides`
    - `plan_features`
- Implicacion arquitectonica:
  - el helper sigue siendo una bandera de perfil
  - los modulos ya no pueden depender de `features.name` ni de relogin para reflejar cambios
- Pendiente posterior, no incluido en este corte:
  - asignacion masiva de modulos por seleccion multiple
  - asignacion por ventanas temporales parametrizables desde UI admin
  - asignacion por listas de usuarios
  - edicion completa de catalogo comercial de planes y funcionalidades

## Actualizacion 2026-07-21 - Modelo de correo multiusuario

Aplicando CONTROL, queda definido el criterio correcto para proveedores de correo en MENSAJES:

- `planespro.cl`
  - se usa para notificaciones oficiales del sistema, formularios del dominio principal y flujos centralizados de la marca
  - no debe asumirse como remitente de todos los vendedores
- `Resend`
  - aplica cuando el usuario tiene dominio propio o controla un subdominio propio
  - ejemplo valido:
    - `notificaciones@asesoresisapre.cl`
    - `contacto@agencia-ejemplo.com`
  - si el usuario usa Google Workspace en su propio dominio, tambien puede usar Resend mientras verifique ese dominio en Resend
  - no aplica para correos publicos que el usuario no controla como dominio, por ejemplo `@gmail.com`, `@hotmail.com`, `@outlook.com`
- `Gmail / Outlook`
  - aplica cuando el usuario solo tiene correo personal o corporativo hospedado en proveedor externo sin dominio propio verificado en Resend
  - este flujo debe resolverse con integracion nativa del proveedor:
    - Gmail API / OAuth
    - Microsoft Graph / Outlook OAuth

### Decision de arquitectura

- MENSAJES debe soportar varios canales por usuario
- el usuario debe poder elegir entre:
  - `Resend` si controla dominio propio
  - `Gmail` si solo tiene Gmail
  - `Outlook` si solo tiene Hotmail/Outlook/Microsoft 365
- no se debe intentar forzar `Resend` para cuentas personales `gmail.com` o `hotmail.com`

### Regla adicional sobre login con Google

- el hecho de que un usuario inicie sesion con Google permite:
  - prellenar su correo en configuracion
  - sugerir ese correo como canal preferido
- pero NO permite enviar por Gmail automaticamente
- para enviar con Gmail se debe pedir consentimiento adicional con scope de envio de Gmail
- ese canal serviria para enviar desde la cuenta Google autenticada del usuario
- no resuelve envio desde cuentas externas no Google como Hotmail, Outlook o Yahoo

## Actualizacion 2026-07-21 - Regla operativa de canales de correo

Aplicando CONTROL, se fija la decision funcional para no contaminar el modelo de plantillas con infraestructura de envio.

### Regla de producto

- `Gmail` queda como proveedor por defecto del usuario comun.
- `Resend` queda como opcion avanzada para usuarios con dominio propio verificado.
- un usuario puede registrar:
  - multiples cuentas `Gmail`
  - multiples canales `Resend`
- el correo del login Google se debe prellenar como primer remitente sugerido, pero sigue requiriendo autorizacion de envio Gmail aparte.
- si el usuario cambia de `a@gmail.com` a `b@gmail.com`, el sistema debe marcar ese canal como `requiere reconexion` hasta que `b@gmail.com` autorice envio con Google.

### Regla de arquitectura

- las `plantillas` no guardan proveedor ni cuenta remitente.
- las `plantillas` son solo contenido reutilizable:
  - asunto
  - cuerpo
  - variables
  - categoria
- la eleccion de proveedor/canal ocurre solo al:
  - `Enviar ahora`
  - `Programar envio`
  - `crear campana` si el flujo futuro lo requiere

### Regla de UI

- si el usuario tiene un solo canal activo, MENSAJES lo selecciona automaticamente al enviar.
- si tiene varios canales activos, MENSAJES debe obligar a elegir:
  - proveedor
  - cuenta/canal concreto
- si el usuario tiene Gmail conectado y ademas uno o mas canales Resend, ambos deben convivir en la misma capa de seleccion.
- puede existir un `canal principal` por defecto para precargar la eleccion en envios nuevos, pero sin amarrar la plantilla a ese canal.
- `Enviar Mensajes` debe exponer un selector `Canal remitente` para override por envio sin obligar a cambiar el canal activo global.

### Implicacion para la siguiente implementacion

- `EmailSettings` debe evolucionar de "canales Resend por usuario" a "canales de correo por usuario".
- la siguiente fase de correo debe introducir:
  - canales `gmail`
  - canales `resend`
  - selector de canal en `Enviar Mensajes`
  - selector de canal en `Programar envio`
- no se debe persistir `sender_channel_id` dentro de la plantilla como regla canonica del modelo.

## Actualizacion 2026-07-21 - EmailSettings compacto y limite comercial

Aplicando CONTROL, `Ajustes > Email` ya no debe seguir creciendo como formulario largo vertical porque rompe la densidad del sidebar y vuelve torpe la configuracion diaria.

### Corte aplicado

- la UI de `EmailSettings` pasa a un patron compacto de filas:
  - Gmail y APIs aparecen en la misma tabla corta
  - cada fila muestra solo `canal`, `remitente`, `estado` y menu
  - el menu de 3 puntos resuelve `activar`, `conectar/reconectar`, `editar` y `eliminar` segun corresponda
  - el estado visual se apoya en tag compacto y punto verde/rojo
- se elimina el bloque grande de `Proveedor activo`; la activacion ahora vive en la fila del canal
- el alta de canal deja de ocupar toda la pantalla y pasa a apertura bajo demanda
- la edicion deja de ser una tarjeta grande permanente y pasa a inline expandible

### Regla comercial aplicada

- sin feature adicional, el usuario puede registrar `1` canal de correo
- con feature `pro:multiple_email_channels`, el usuario puede registrar hasta `6`
- esta regla queda aplicada en:
  - frontend
  - edge function `email-channels`
- se siembra el feature canonico:
  - `pro:multiple_email_channels`

### Alcance real de esta pasada

- el modelo sigue soportando multiples canales `Resend` hoy
- la UI ya opera como bandeja unificada `gmail + resend`
- Gmail ya tiene conexion OAuth compacta desde `Ajustes > Email` usando el flujo Google existente y persistiendo scope `gmail.send` en Supabase
- `Enviar Mensajes` ya permite override de `Canal remitente` por envio usando el canal activo o uno puntual
- la compactacion visual sigue afinandose con una tabla plana:
  - sin bloque global de proveedor arriba
  - sin tarjetas altas blancas como contenedor principal
  - el alta de canales vive en `Agregar`
  - la activacion vive en el menu de cada fila
  - `Canal remitente` en `Enviar Mensajes` pasa a ser un control secundario compacto
- queda pendiente solo seguir endureciendo la ergonomia y sumar proveedores futuros sin romper este contrato compacto

## Actualizacion consolidada al miercoles 22 de julio de 2026

Aplicando CONTROL, este es el estado consolidado real al cierre de la sesion actual. Este bloque existe para que una nueva sesion no tenga que reconstruir el contexto desde todo el historial previo.

### 1. Formulario principal `planespro.cl`

- ya usa Supabase como backend real de captura
- los leads organicos/directos siguen cayendo en la cuenta central `planespro.cl@gmail.com`
- la metadata de origen ya se conserva en el lead:
  - `source_system`
  - `source_channel`
  - `source_path`
  - `source_url`
  - `source_hostname`
  - `source_form_variant`
  - `source_cta`
- el formulario general ya no debe heredar ownership `pb`
- la disponibilidad publica del formulario general ya consulta Supabase detras de la frontera branded

### 2. Formulario `pb` por asesor

- `pb` ya opera como formulario separado del principal
- el owner del lead y de la cita ya se resuelve por `capture_ref`
- ya se corrigio el bug historico donde el `ref` largo se truncaba y hacia fallback silencioso al owner general
- la limpieza historica de leads/citas `pb` mal asignados ya se ejecuto en remoto
- el backend actual de `pb` ya no debe depender de logica de negocio en Cloudflare

### 3. Agenda y ownership

- Supabase ya es la fuente de verdad de:
  - leads
  - citas
  - disponibilidad publica
  - ownership por owner general vs owner `pb`
- la agenda de superadmin y la de cada owner `pb` ya no deben mezclarse por modelo
- `Admin SaaS > Base` ya puede ver la base de otros usuarios y recibir leads en tiempo real por feed admin-dedicado
- `Admin SaaS > Agenda` ya puede observar la agenda del usuario seleccionado sin volverla agenda propia del superadmin
- el estado del frente agenda sigue siendo `parcial` hasta cerrar la validacion E2E real de Google Calendar / Meet

### 4. Google Calendar / Meet

- el backend E2E ya existe en Supabase:
  - `google-calendar-create-event`
  - `google-calendar-update-event`
  - `google-calendar-sync-attendees`
- ya existe evidencia real en base de `appointment_participants` sincronizados
- MENSAJES ya muestra mejor los estados:
  - `pending`
  - `error`
  - `skipped`
  - `synced`
- sigue pendiente el cierre funcional completo sobre:
  - create
  - reschedule
  - cancel
  - attendees
  - validado tanto en `planespro.cl` como en `/pb` y MENSAJES

### 5. Correo multi-canal

- la arquitectura ya soporta canales por usuario
- el almacenamiento sensible ya va por backend y no por navegador
- `Resend` ya se puede registrar como canal API por usuario
- `Gmail` ya tiene conexion OAuth compacta desde `Ajustes > Email`
- `Ajustes > Email` ya fue compactado a una tabla de filas cortas con menu de 3 puntos
- `Enviar Mensajes` ya muestra `Canal remitente` como override compacto por envio
- el contrato correcto hoy es:
  - plantillas no guardan proveedor
  - el proveedor/canal se elige al enviar o programar

### 6. Estado real del envio por proveedor

- `Resend`
  - el canal ya puede quedar conectado
  - `send-email` ya se reescribio para resolver canal/owner desde Supabase
  - se acepto el escenario `sending_only` como valido para Resend
- `Gmail`
  - ya existe conexion OAuth y se logro completar consentimiento con `gmail.send`
  - pero el envio efectivo por Gmail desde `Enviar Mensajes` sigue en validacion final
  - sigue siendo un frente abierto porque:
    - el usuario reporto error funcional al enviar con Gmail
    - el selector de canal por envio requiere validacion final para garantizar que no se use el canal activo global por error

### 7. UI de correo: estado actual correcto

- la UI ya no debe crecer con grandes bloques altos
- la tabla de canales ya es la superficie principal
- cada canal debe quedar identificado por:
  - nombre
  - remitente
  - estado
  - menu
- el menu por fila concentra:
  - activar
  - conectar / reconectar
  - editar
  - eliminar
- el criterio visual vigente es:
  - un solo tag util por fila cuando corresponda
  - sin cajas blancas gigantes como patron
  - todo compacto para sidebar

### 8. Estado del retiro de Cloudflare

- Cloudflare ya no debe ejecutar backend del formulario
- el backend real del formulario ya quedo en Supabase
- Cloudflare queda acotado a:
  - hosting estatico
  - blog
  - noticias
  - superficies legacy/editoriales aun no migradas
- el siguiente paso de salida de Cloudflare ya no es reescritura funcional del formulario, sino migracion separada de hosting/editorial cuando corresponda

### 9. Pendientes reales para proxima sesion

- cerrar el envio efectivo por Gmail desde `Enviar Mensajes`
- validar que `Canal remitente` fuerce realmente el canal elegido y no el canal activo global
- cerrar validacion E2E completa de Google Calendar / Meet
- decidir si `emailjs` se retira o queda solo como compatibilidad temporal documentada
- retomar, despues de eso, los frentes todavia no funcionales:
  - tareas
  - plantillas funcionales completas
  - grupos / listas de usuarios
  - blog / noticias

## Checkpoint para rediseño de la extension

Aplicando CONTROL, este checkpoint existe para permitir un rediseño visual del sidebar sin contaminar ni romper el trabajo de arquitectura, backend y realtime ya consolidado.

### Rama checkpoint actual

- rama actual de trabajo: `feature/ui-refactor-compact`
- esta rama debe tratarse como checkpoint funcional previo al rediseño profundo
- la IA que rediseñe debe partir desde este estado y no desde una rama vieja

### Objetivo correcto del rediseño

- rediseñar UI, layout, densidad visual, jerarquía, navegación y consistencia del sidebar
- compactar y mejorar experiencia de uso
- preparar una base visual más fuerte para:
  - leads
  - agenda
  - mensajes
  - settings
  - admin

### Lo que SI puede tocar la IA de rediseño

- componentes visuales y composición de layout
- CSS/Tailwind/clases de presentación
- jerarquía de bloques y navegación interna
- copy visual corto, labels y microcopy no contractual
- estados vacíos, placeholders, skeletons y feedback visual
- orden visual de controles si no cambia su contrato funcional

### Lo que NO debe tocar la IA de rediseño

#### 1. Backend Supabase

- no modificar SQL ni migraciones existentes salvo requerimiento explícito de backend
- no alterar funciones edge existentes por razones puramente visuales
- no cambiar contratos de payload entre frontend y backend

#### 2. Realtime

- no eliminar ni rehacer suscripciones realtime ya cerradas
- no tocar la lógica de:
  - `admin_lead_events`
  - refresco de entitlements
  - refresco de `Admin SaaS > Base`
  - realtime de bandeja sin entender primero el contrato actual

#### 3. Ownership y agenda

- no tocar la resolución de owner entre:
  - formulario general `planespro.cl`
  - links `pb`
  - agenda general
  - agenda por asesor
- no tocar `capture_ref`, `capture_link_id`, `assigned_user_id`, `source_channel` ni derivados
- no rehacer la lógica de disponibilidad pública solo para rediseñar el calendario

#### 4. Correo multi-canal

- no simplificar el modelo de canales a una sola cuenta
- no volver a guardar secrets en frontend
- no quitar el soporte unificado `gmail + resend`
- no amarrar plantillas a un proveedor fijo
- no romper el selector `Canal remitente`

#### 5. Arquitectura frontend

- no volver a poner lógica Supabase directa dentro de pantallas por comodidad
- no saltarse la capa:
  - UI -> service -> repository -> Supabase/RPC
- no reintroducir componentes gigantes monolíticos si el cambio es solo visual

### Archivos/capas sensibles que deben tratarse como frontera protegida

La IA de rediseño puede leerlos para entender contratos, pero no debería editarlos salvo que detecte un bug funcional real y lo documente aparte.

- `src/services/*`
- `src/repositories/*`
- `src/hooks/useLeads.ts`
- `src/hooks/useLeadFilters.ts`
- `src/hooks/useSendCounts.ts`
- `src/contexts/AuthContext.tsx`
- `src/utils/emailSender.ts`
- `src/services/sendService.ts`
- `src/services/adminService.ts`
- `src/services/leadsService.ts`
- `src/utils/appointmentStatusCopy.ts`
- `supabase/functions/*`
- `sql/migrations/*`

### Superficies visuales candidatas al rediseño

- `src/App.tsx`
- `src/pages/LeadsPage.tsx`
- `src/pages/AgendaPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/admin/AdminUsersPage.tsx`
- `src/components/leads/*`
- `src/components/send/*`
- `src/components/settings/*`
- `src/components/admin/*`

### Reglas obligatorias del rediseño

- mantener diseño compacto para sidebar
- considerar también móvil futuro
- prohibido crecer con cajas blancas genéricas gigantes
- prohibido introducir emojis
- no usar `!important` como parche de diseño
- no mezclar decisiones visuales con cambios de dominio de datos

### Estrategia recomendada para la otra IA

1. Auditar primero estructura visual actual sin tocar backend.
2. Reservar en `AI_SYNC.md` exactamente qué pantallas va a rediseñar.
3. Trabajar por superficie, no por todo el producto a la vez:
   - shell
   - leads
   - agenda
   - email/settings
   - admin
4. Validar siempre:
   - que compile
   - que no se rompa el flujo de leads
   - que no se rompa agenda
   - que no se rompa `Admin SaaS > Base`
   - que no se rompa `Enviar Mensajes`

### Definicion de exito del rediseño

El rediseño estará bien hecho solo si:

- mejora claridad y densidad visual
- no rompe contratos backend
- no toca ownership ni agenda por accidente
- no degrada performance de arranque
- no reintroduce acoplamientos frontend -> Supabase directos
