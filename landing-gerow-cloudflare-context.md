# Contexto Operativo: landing-gerow + Cloudflare ppforms

Fecha de auditoria: 2026-07-16
Metodo: Protocolo CONTROL
Estado: documento operativo para preparar la migracion progresiva a Supabase/MENSAJES

## 1. Objetivo de este documento

Este archivo deja trazabilidad clara de como funciona hoy el dominio de captura de leads de `planespro.cl`, tanto en frontend como en backend Cloudflare, para integrarlo despues con `MENSAJES` y con la futura app movil.

La meta arquitectonica confirmada es:

- `planespro.cl` sigue siendo el origen del trafico y del formulario publico.
- `MENSAJES` sera el CRM/app destino para operar esos leads.
- La migracion del backend sera progresiva desde Cloudflare a Supabase.
- El primer corte correcto es el dominio `formulario + disponibilidad + agenda + archivos + calendar`, no todo el backend de una sola vez.

## 2. Resumen ejecutivo

Hoy el flujo de captura de `planespro.cl` depende principalmente del Worker `ppforms` en Cloudflare.

Ese worker resuelve:

- disponibilidad publica de agenda
- recepcion de leads del formulario
- almacenamiento de archivos PDF
- creacion y sincronizacion de citas con Google Calendar
- correos automaticos al cliente y al equipo
- panel admin interno para leads, agenda, perfil de asesor y capture links

La frontera publica real hoy es:

- `GET /api/public/availability`
- `POST /api/form/leads`
- `POST /api/form/leads/abandoned`

La integracion futura con `MENSAJES` debe respetar ese contrato primero, y luego reemplazar internamente su implementacion en Supabase.

## 3. Estado Cloudflare validado

Se verifico el token de Cloudflare entregado.

- Resultado: token valido y activo
- Estado confirmado: `active`

Nota CONTROL:
Solo se valido el token. No se ejecuto ninguna mutacion de infraestructura ni despliegue.

## 4. Frontend actual de landing-gerow

### 4.1 Entradas principales de captura

Existen dos experiencias principales de formulario:

- `pb/` o landing dedicada de captura larga
- formulario lateral/sidebar reutilizable dentro del sitio principal

Ambas hablan con el mismo backend:

- `https://form.planespro.cl`

### 4.2 Flujo `pb`

El frontend de `pb`:

- carga disponibilidad desde `GET /api/public/availability`
- envia el lead a `POST /api/form/leads`
- soporta atribucion por `ref`
- soporta agenda si el usuario elige `agendar_reunion`
- soporta adjunto PDF
- persiste atribucion en `localStorage`

Campos funcionales relevantes enviados:

- datos personales del lead
- `capture_ref`
- `first_touch_ref`
- `advisor_id`
- `contacto_preferencia`
- `cita_fecha_hora`
- `cita_estado`
- metadatos de origen, campaña y anti-spam

### 4.3 Flujo sidebar

El sidebar hace lo mismo, pero:

- agrega persistencia local de progreso del formulario
- guarda drafts
- envia abandono via `navigator.sendBeacon` a `POST /api/form/leads/abandoned`
- usa disponibilidad del mismo worker
- soporta PDF adjunto
- incorpora UI modal de agenda y modal de privacidad

### 4.4 Logica de atribucion comercial

La atribucion comercial ya existe en frontend y backend.

Modelo actual:

- `ref` en URL
- persistencia local del `ref`
- `first_touch_ref`
- posibilidad de resolver un `advisor_id`

Esto es importante porque el reparto del lead en Supabase debe mantener exactamente esta frontera para no romper trazabilidad comercial.

## 5. Backend actual: Worker `ppforms`

### 5.1 Rol del worker

`ppforms` es hoy el dominio aislado de:

- captura de leads
- agenda
- disponibilidad
- Google Calendar
- archivos del formulario
- notificaciones de correo
- panel admin minimo para operar este dominio

No es solo un endpoint de formulario. Es un backend completo especializado.

### 5.2 Rutas publicas principales

Rutas publicas confirmadas:

- `GET /health`
- `GET /api/public/availability`
- `POST /api/form/leads`
- `POST /api/form/leads/abandoned`
- `POST /api/form/appointments`

### 5.3 Rutas admin

Rutas admin confirmadas:

- sesion admin
- perfil de asesor
- disponibilidad del asesor
- capture links
- listado de leads
- cambios incrementales de leads
- detalle de lead
- notas
- cambio de estado
- RUT
- archivar
- borrar
- cita
- test de attendance
- envio manual de recordatorios

Conclusion CONTROL:
La futura migracion no debe reducir este dominio a “guardar un lead”. Ya existe una superficie operacional que el CRM consumira.

## 6. Componentes internos del worker

El runtime de `ppforms` esta compuesto por modulos separados:

- `advisor-domain`
- `availability-domain`
- `calendar-domain`
- `capture-links-domain`
- `leads-domain`
- `notifications-domain`
- `admin-manual-leads`

Esto es positivo: el dominio ya esta dividido por responsabilidad. La migracion a Supabase debe respetar esta separacion y no recombinarlo en un monolito nuevo.

## 7. Persistencia actual en Cloudflare

### 7.1 D1

Binding confirmado:

- `FORM_DB`
- database name: `ppforms_db`

### 7.2 R2

Binding confirmado:

- `FORM_UPLOADS`
- bucket: `ppforms-uploads`

### 7.3 Cron

Cron confirmado:

- cada 15 minutos

Uso funcional:

- procesamiento de recordatorios de citas

## 8. Modelo de datos funcional actual

El worker usa al menos estas entidades lógicas:

- `advisors`
- `advisor_calendar_connections`
- `advisor_availability_rules`
- `advisor_availability_blocks`
- `advisor_capture_links`
- `oauth_states`
- `form_leads`
- `lead_notes`
- `lead_events`

### 8.1 `form_leads`

Es la fuente principal de verdad del dominio actual.

Contiene, entre otros:

- identidad y contacto del lead
- sistema de salud
- datos comerciales
- comentarios
- `advisor_id`
- preferencia de contacto
- estado de cita
- fecha/hora de cita
- ids y urls de Google Calendar
- referencia a archivo PDF
- payload crudo sanitizado

### 8.2 `lead_events`

Es el historial operativo del lead.

Ejemplos de eventos:

- creacion
- cambio de estado
- agendamiento
- reagendamiento
- notas
- recordatorios
- sync con calendar
- borrado

Este historial es importante para `MENSAJES`, porque el CRM futuro no deberia perder trazabilidad operacional al migrar.

### 8.3 `advisor_calendar_connections`

Guarda conexion OAuth por asesor, no un calendario global.

Campos funcionales:

- `advisor_id`
- `provider`
- `google_email`
- `calendar_id`
- `refresh_token`
- `access_token`
- `token_scope`
- `token_expires_at`

### 8.4 `advisor_availability_rules` y `advisor_availability_blocks`

Separan:

- horario base semanal
- bloqueos o excepciones manuales

Esto es una buena base conceptual para portar a Supabase.

### 8.5 `advisor_capture_links`

Resuelve links comerciales por asesor.

Uso funcional:

- generar URLs `pb/?ref=...`
- resolver atribucion del lead
- mantener una frontera limpia entre trafico publico y ownership comercial

## 9. Integraciones externas actuales

### 9.1 Google Calendar

El worker soporta:

- OAuth por asesor
- lectura de disponibilidad cruzando Calendar
- creacion de eventos
- actualizacion de eventos
- borrado de eventos
- seguimiento de attendance
- interpretacion de cancelaciones o rechazos

No usa solo un calendario fijo. El camino actual ya esta alineado con la arquitectura correcta.

### 9.2 Resend

Se usa para:

- correo interno de nuevo lead sin agenda
- correo de confirmacion al cliente
- correo de cita agendada
- correo de cita reagendada

### 9.3 Cloudflare como capa de ejecucion

Cloudflare hoy resuelve:

- Worker serverless
- D1
- R2
- cron
- secretos de OAuth, Calendar y Resend

## 10. Comportamiento funcional actual del flujo publico

### 10.1 Disponibilidad

`GET /api/public/availability`

Hace:

- identifica asesor por `ref` o `advisorId`
- carga reglas del asesor
- carga bloqueos manuales
- consulta ocupacion por leads ya agendados
- cruza, si existe, con busy intervals de Google Calendar
- devuelve `slot_grid` y `slots`

### 10.2 Creacion de lead

`POST /api/form/leads`

Hace:

- valida origen permitido
- valida anti-spam y rate limits
- parsea `FormData` o JSON
- resuelve atribucion comercial
- crea o asegura asesor
- inserta en `form_leads`
- guarda PDF en R2 si existe
- agenda cita si corresponde
- crea evento en Google Calendar si corresponde
- envia notificaciones por correo segun preferencia de contacto

### 10.3 Abandono de lead

`POST /api/form/leads/abandoned`

Hace:

- valida guardas de envio
- registra lead como `Abandonado`
- mantiene atribucion

### 10.4 Admin

Permite:

- crear lead manualmente
- mover citas
- operar historial y estado del lead
- actualizar perfil del asesor
- configurar disponibilidad
- operar capture links

## 11. Variables y secretos conocidos

En `wrangler.toml` quedan visibles variables no secretas y bindings:

- correos de notificacion
- origenes permitidos
- client id de Google OAuth
- redirect URI
- D1 binding
- R2 binding
- cron

Secretos manejados fuera de git:

- `ADMIN_API_KEY`
- `GCAL_CALENDAR_ID`
- `GCAL_SA_EMAIL`
- `GCAL_SA_PRIVATE_KEY`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `RESEND_API_KEY`

Nota CONTROL:
La migracion a Supabase debe separar claramente:

- secretos tecnicos de backend
- credenciales OAuth por asesor
- configuracion publica de frontend

## 12. Frontera correcta para migrar a Supabase

### 12.1 Lo que debe migrarse primero

Primer dominio correcto:

- `public-availability`
- `lead-submit`
- `lead-abandoned`
- archivos PDF
- agenda / appointments
- Google Calendar por asesor
- correos transaccionales

### 12.2 Lo que no conviene mezclar en la primera etapa

No conviene mezclar de inmediato:

- resto del ecosistema Cloudflare
- blog
- news
- otros workers no relacionados
- CRM historico si todavia vive separado

### 12.3 Compatibilidad deseada

El frontend publico deberia poder seguir usando exactamente:

- `GET /api/public/availability`
- `POST /api/form/leads`

Aunque por detras ya apunte a Supabase Edge Functions o a un puente transitorio.

Ese contrato estable es la clave para migrar sin romper `planespro.cl`.

## 13. Relacion con `MENSAJES`

Flujo objetivo confirmado:

1. el usuario entra a `planespro.cl`
2. completa el formulario
3. el backend en Supabase crea el lead y, si aplica, la cita y el archivo
4. `MENSAJES` consume ese lead como sistema operativo de trabajo
5. luego la misma base alimenta extension y app movil

Eso implica que Supabase debe transformarse en la source of truth del dominio `lead capture + agenda`.

`MENSAJES` no deberia seguir dependiendo de Cloudflare para leer leads nuevos una vez hecho el corte.

## 14. Riesgos y observaciones bajo CONTROL

### 14.1 Riesgos reales

- si se migra solo “guardar lead” y no disponibilidad/citas, se crean dos fuentes de verdad
- si se rompe la atribucion por `ref`, se pierde ownership comercial
- si se migra agenda sin modelo de advisor/availability, se reintroduce logica paralela
- si se mezcla `public` de Supabase con tablas existentes sin frontera, se contamina el esquema
- si se mueve frontend antes del backend, se rompe captura de leads en produccion

### 14.2 Lo que ya esta bien del sistema actual

- dominio ya separado en modulos
- OAuth por asesor
- captura con atribucion comercial
- distincion entre lead con agenda y sin agenda
- manejo de adjuntos
- historial de eventos

### 14.3 Lo que debe preservarse

- contrato de rutas publicas
- semantica de `capture_ref` y `first_touch_ref`
- asignacion por asesor
- capacidad de reagendar y sincronizar con Google Calendar
- correos transaccionales

## 15. Recomendacion operativa para el siguiente paso

El siguiente paso correcto no es tocar aun el frontend de `planespro.cl`.

El siguiente paso correcto es:

1. modelar en Supabase el dominio equivalente a `ppforms`
2. definir funciones/Edge Functions compatibles con las rutas actuales
3. mover primero disponibilidad, submit, archivos y appointments
4. conectar `MENSAJES` a ese nuevo dominio como consumidor nativo
5. solo despues cambiar el `workerUrl` del frontend publico

## 16. Estado CONTROL

- `hecho`: auditoria de contexto frontend/backend de `landing-gerow`
- `hecho`: verificacion de token Cloudflare activo
- `hecho`: identificacion del contrato publico actual del formulario
- `hecho`: identificacion del modelo de datos funcional de `ppforms`
- `pendiente estructural`: definir el esquema equivalente en Supabase
- `pendiente estructural`: definir el contrato exacto de integracion con `MENSAJES`
- `pendiente de deploy`: reemplazo progresivo de rutas Cloudflare por Supabase
- `pendiente de validacion real`: smoke test del flujo publico una vez se haga el primer corte

## 17. Decision de arquitectura recomendada

Decision recomendada:

- mantener `planespro.cl` como frontend origen
- usar Supabase como nuevo backend source of truth del dominio formulario/agenda
- usar `MENSAJES` como CRM/app para operar ese dominio
- retirar `ppforms` por etapas, no por parche

Esta es la frontera mas limpia y coherente con el plan actual.
