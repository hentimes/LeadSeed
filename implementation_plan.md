# Auditoria y Plan Arquitectonico: Migracion a Supabase

Fecha de actualizacion: 2026-07-18
Estado: vigente, Fase 5 cerrada y lista para auditoria cruzada

Este documento define la migracion de leads, agenda, archivos e integracion publica desde Cloudflare hacia Supabase. Desde esta fecha incorpora un requerimiento transversal obligatorio: cualquier UI nueva debe priorizar sidebar de extension y movil antes de asumir vistas amplias o patrones visuales pesados.

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
El submit publico activo ya quedo alineado a la frontera branded `form.planespro.cl/api/form/leads`, sin exponer `functions/v1` de Supabase en el frontend publico corregido.
La visualizacion y descarga de PDF ya corre por la frontera branded `form.planespro.cl/api/private/form-lead-file`, sin exponer rutas crudas de Storage/Supabase al usuario final dentro de MENSAJES.

El proyecto ya tiene primer corte de fundacion de agenda en Supabase mediante `025_planespro_agenda_supabase_foundation.sql` y la correccion `026_planespro_agenda_public_rpc_volatility_fix.sql`.

La disponibilidad publica ya responde desde Supabase detras de `https://form.planespro.cl/api/public/availability`, con fallback Cloudflare si Supabase falla. Falta UI compacta de agenda, RPCs autenticadas de gestion y Google Calendar desde Supabase.

El proyecto hoy esta en:

- integracion publica base ya funcionando
- refactorizacion estructural en progreso avanzado
- base SQL/RPC inicial de agenda ya aplicada en Supabase
- availability publica ya conectada a Supabase detras del dominio branded
- preparacion para UI compacta de agenda sin seguir acumulando deuda

## 1. Parametros confirmados del negocio

- Limite de archivos: 3MB por PDF adjunto.
- Asignacion de vendedores: determinista por `ref` en la URL.
- Frontera actual: `planespro.cl` sigue apoyandose en `ppforms` y no se debe romper el contrato publico durante la migracion.

## 2. Estado actual auditado

### 2.1 Lo ya presente en MENSAJES

- CRM React con autenticacion, leads, plantillas, tareas y soporte interno.
- Backend Supabase con `leads`, `lead_notes` y SQL local nuevo para agenda (`appointments`, `user_availability`, `user_availability_overrides`) aun pendiente de consolidacion remota.

### 2.2 Lo que todavia resuelve Cloudflare

`planespro.cl` depende hoy de Cloudflare para:

1. disponibilidad publica cruzada con Google Calendar
2. recepcion del lead y archivos adjuntos
3. correos de confirmacion
4. creacion del evento y link de Google Meet

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
- La capacidad objetivo inicial es hasta 5 links de publicidad por usuario cuando su perfil lo permita.
- Cada link debe guardar al menos:
  - nombre visible
  - identificador o slug publico
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
  - `GET /api/public/availability` sigue temporalmente en Cloudflare
  - `POST /api/form/leads/abandoned` sigue temporalmente en Cloudflare
- Se enviaron ya desde frontend los campos explicitos:
  - `source_channel`
  - `source_form_variant`
  - `source_hostname`
  - `source_path`
  - `source_url`
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
- Se mantiene el limite por `profiles.capture_links_limit`, con rango 1 a 5.
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
  - copiar la URL publica `https://planespro.cl/pb/?ref=...`
  - ver leads, cierres, tasa de cierre y cortes analiticos basicos
- No se agregaron mutaciones directas desde UI sobre `capture_links`.
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
- La bandeja principal de MENSAJES no debe usar lecturas globales de `leads` aunque el usuario sea admin. El criterio correcto es:
  - inbox principal: solo leads propios
  - auditoria admin/helper: leads de terceros solo desde vistas admin por perfil
- Aun no existe modelo tecnico en Supabase para deteccion de multi-captura, alertas cruzadas reciprocas y reevaluacion de coincidencias al completar `rut` manualmente.
- `MENSAJES` aun necesita una fase de refactorizacion estructural antes de absorber con seguridad agenda, blog y noticias bajo una sola arquitectura.
