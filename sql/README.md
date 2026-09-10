# SQL Structure

Este directorio documenta el SQL del proyecto. Para `seeds/`, `data-repairs/` y
`diagnostics/` es ademas la fuente. Para `migrations/` **no lo es**: es un espejo.

## migrations/ es un espejo, no la fuente

Corregido el `2026-09-10`, tras la auditoria CONTROL de ese dia. Este README decia ser
"la fuente autorizada de SQL del proyecto" y no mencionaba que existiera una segunda
copia completa. Era falso para `migrations/`.

Cada migracion vive dos veces:

    supabase/migrations/20260909000300_tarea_diaria_de_envios.sql   <- fuente
    sql/migrations/176_tarea_diaria_de_envios.sql                   <- espejo

Manda la de marca temporal, por tres motivos que no son opinables:

- es la unica que el CLI ejecuta (`supabase db push`)
- es la unica que la base registra en `supabase_migrations.schema_migrations`
- es la unica capaz de expresar el orden real: la numeracion de aqui tiene **dos
  archivos `036`** y dos huecos (122 y 123, reservados por `no-aplicadas/`). Un
  identificador que se repite no es un orden.

Hay ademas testimonio escrito en el propio repo: las cabeceras de `090`, `091` y `137`
dicen que esas migraciones nacieron en la carpeta temporal, se aplicaron a produccion
desde ahi, y que el archivo numerado es una copia retroactiva.

Este espejo se conserva por lo que la fuente no tiene: las cabeceras en prosa que
explican por que cada cambio se hizo asi, y una numeracion corta con la que se puede
hablar ("la 137").

### Como agregar una migracion

1. `supabase migration new <dominio_accion>`
2. escribirla en `supabase/migrations/`
3. copiarla a `sql/migrations/` con el siguiente numero libre
4. `npm run check:migrations`

Nunca al reves. Un archivo que solo existe aqui no se aplica jamas.

### Cuando el espejo puede diferir

Solo en comentarios, y solo con su motivo anotado en `DIVERGENCIAS_ACEPTADAS` dentro de
`scripts/check-migrations-mirror.mjs`. Hoy hay cuatro casos: `090`, `091` y `137` llevan
una cabecera de trazabilidad que la fuente no tiene, y `118` tiene otro titulo. **El SQL
ejecutable coincide en las 183.**

### El orden numerico no es el orden de aplicacion

En dos puntos las dos carpetas se contradicen: `095` y `137` tienen marca temporal
anterior a la de su vecino numerico. El orden real es el de la fuente. Aplicar esta
carpeta en orden numerico no reproduce la base. Esos dos casos estan congelados en
`ORDEN_HISTORICO_ACEPTADO` dentro del script, porque renumerar una migracion ya aplicada
seria peor: la base la tiene anotada por su nombre temporal.

## Convencion

- `migrations/`: cambios permanentes de esquema, RLS, RPC, realtime o storage.
- `seeds/`: datos base del producto que pueden reaplicarse con seguridad.
- `data-repairs/`: correcciones de filas existentes tras un incidente. **No son migraciones**: sobre
  una base nueva no hay nada que reparar, asi que no forman parte del historial reproducible. Ver
  `data-repairs/README.md`, que explica ademas por que las dos historicas (`036`, `037`) se quedan en
  `migrations/`.
- `diagnostics/`: consultas de solo lectura para investigar un incidente. No escriben nunca.

## Nomenclatura

Formato:

`NNN_dominio_accion.sql`

Ejemplos:

- `000_platform_core_schema.sql`
- `009_lead_lists_and_user_lists.sql`
- `012_requirements_support_messaging.sql`
- `011_agenda_core.sql`

Reglas:

- `NNN` marca orden logico de aplicacion.
- `dominio` identifica la seccion funcional afectada.
- `accion` resume el objetivo tecnico principal.

## Orden recomendado

1. aplicar `migrations/` en orden numerico
2. aplicar `seeds/` en orden numerico

Los snippets guardados en el SQL Editor de Supabase ya no son la fuente de verdad.
Si existe divergencia entre un snippet del panel y un archivo de este directorio, manda este directorio.

## Dominios actuales

- `saas`: planes, features, RPC de permisos
- `profiles`: perfiles, sync desde auth, policies admin/helper, settings
- `lead`: leads, lead lists, lead notes, send logs
- `template`: templates y template lists
- `agenda`: disponibilidad, appointments y RPC de slots
- `capture_links`: links publicos por usuario, limites por perfil y analitica de campanas
- `planespro_agenda`: settings, bloqueos, disponibilidad publica por ref y appointments Supabase
- `requirements`: requerimientos, mensajeria de soporte y metadata de bumps
- `storage`: buckets y policies de objetos
- `realtime`: publicacion de tablas para WebSockets

## Notas de control

- Ningun archivo aqui debe depender de nombres ambiguos como `lists` para dos dominios distintos.
- `lead_lists`, `template_lists` y `user_lists` son dominios separados.
- Todo SQL nuevo debe ser idempotente cuando sea razonable.
- Toda funcion `SECURITY DEFINER` debe fijar `search_path`.
- `support_tickets` queda deprecada. El dominio activo de soporte vive en `requirements` e `internal_messages`.

## Migracion activa reciente

- `024_capture_links_management_rpcs.sql`: frontera oficial para que LeadSeed gestione links de publicacion mediante RPCs autenticadas.
- `025_planespro_agenda_supabase_foundation.sql`: primer corte de agenda Supabase; agrega settings, conexiones calendario, bloqueos, disponibilidad publica por `ref` y creacion de appointments desde el submit publico.
- `026_planespro_agenda_public_rpc_volatility_fix.sql`: corrige volatilidad de RPCs publicas de agenda para que PostgREST permita inicializar defaults al consultar disponibilidad.
- `027_planespro_agenda_management_rpcs.sql`: frontera oficial para que LeadSeed gestione ajustes de agenda, horario semanal, bloqueos y citas mediante RPCs autenticadas.
- `028_google_calendar_connection_foundation.sql`: estado no sensible de conexion Google Calendar y metadata de sincronizacion para LeadSeed.
- `029_google_calendar_busy_sync.sql`: columnas e indices para convertir FreeBusy de Google en bloqueos `google` dentro de Supabase.
- `030_google_calendar_event_status.sql`: estado de replica externa de citas Supabase hacia Google Calendar, incluyendo Meet cuando Google lo entregue.
- `031_appointment_visibility_meet_alerts.sql`: amplia el listado interno de citas para mostrar link Meet y estado Google no sensible en LeadSeed.
- `032_appointment_participants.sql`: modelo y RPCs autenticadas para participantes de citas.
- `033_appointment_reschedule_cancel.sql`: RPCs autenticadas para reprogramar/cancelar citas propias y auditoria basica de eventos.
- `034_create_appointment_from_lead.sql`: RPC autenticada para crear una cita desde el detalle de un lead propio, validando conflictos y conservando Supabase como fuente de verdad.
- `035_auto_invite_lead_participant.sql`: agrega automaticamente al lead con email valido como participante `lead` en citas creadas desde formulario PlanesPro o desde detalle del lead.
- `036_appointment_audit_history_rpc.sql`: expone historial visible de eventos de cita propios para la UI compacta de Agenda sin abrir acceso directo a la tabla de auditoria.
- La UI no debe mutar `capture_links` directo si puede usar:
  - `list_my_capture_links()`
  - `create_my_capture_link(...)`
  - `update_my_capture_link(...)`
  - `deactivate_my_capture_link(...)`
  - `get_my_capture_link_stats(...)`
- La UI no debe mutar agenda directo si puede usar:
  - `get_my_calendar_settings()`
  - `update_my_calendar_settings(...)`
  - `list_my_availability_rules()`
  - `save_my_availability_rules(...)`
  - `list_my_availability_blocks(...)`
  - `create_my_availability_block(...)`
  - `delete_my_availability_block(...)`
  - `list_my_appointments(...)`
  - `create_my_appointment_from_lead(...)`
- La UI solo puede leer estado de Google Calendar con:
  - `get_my_calendar_connection_status()`
- Los tokens de Google Calendar solo deben escribirse desde Edge Functions con service role, nunca desde componentes React ni RPCs publicas.
- La sincronizacion de ocupacion Google debe usar FreeBusy y guardar solo rangos ocupados, no detalles privados de eventos.
- La creacion de eventos Google Calendar debe ser no bloqueante para la captura publica: Supabase crea la cita primero y Google queda como replica externa.
- La UI puede mostrar `meet_link` y estado de replica Google, pero nunca tokens ni payload privado del calendario.
- Los participantes de citas viven en `appointment_participants`; el lead con email valido se registra automaticamente como participante `lead`, y Google Calendar solo recibe `attendees` desde Edge Functions autenticadas.
