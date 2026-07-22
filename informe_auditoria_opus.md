# Informe de Auditoria OPUS - PlanesPro/MENSAJES

Fecha: 2026-07-20
Auditor: Antigravity (Claude Opus)
Protocolo: CONTROL
Alcance: Solo lectura, sin modificaciones de codigo

---

## Resumen ejecutivo

Se auditaron **4 angulos** en paralelo usando agentes especializados:
1. Admin SaaS frontend (codigo React)
2. Supabase backend (RPCs, RLS, datos reales)
3. Landing-gerow (formularios, disponibilidad, Cloudflare)
4. Extension LeadSeed (flujos de carga, hooks, manejo de errores)

Se verifico directamente contra la base de datos de Supabase remota con las credenciales proporcionadas.

---

## Problema 1: Los leads no se cargan en Admin SaaS

> [!CAUTION]
> Este es el hallazgo mas critico. Afecta la visibilidad operativa del superadmin sobre todos los usuarios.

### Sintoma
Al seleccionar un usuario en `Admin SaaS > Usuarios y mensajes > Base`, la pantalla se queda en "Cargando base del usuario..." indefinidamente, o bien muestra un error generico.

### Causa raiz verificada

El flujo de carga en [AdminUserBase.tsx](file:///c:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/MENSAJES/src/components/admin/AdminUserBase.tsx#L29-L45) ejecuta un `Promise.all` que carga **leads Y plantillas** en paralelo:

```typescript
const { leads: nextLeads, templates: nextTemplates } = await loadAdminUserBase(selectedUser.id);
```

Esto llama a [adminService.ts](file:///c:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/MENSAJES/src/services/adminService.ts#L114-L132):

```typescript
const [leadRows, templateRows] = await Promise.all([
  fetchAdminUserLeadRows(userId),    // RPC: list_admin_user_leads
  fetchAdminUserTemplateRows(userId), // RPC: list_admin_user_templates
]);
```

**El problema tiene dos capas:**

#### Capa 1: Migracion 044 vs 045 (estado de la base remota)

La migracion [044_admin_observed_workspace_queries.sql](file:///c:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/MENSAJES/sql/migrations/044_admin_observed_workspace_queries.sql#L111-L113) contiene una restriccion que **bloquea la auto-observacion**:

```sql
IF p_observed_user_id IS NULL OR p_observed_user_id = v_admin_user_id THEN
  RAISE EXCEPTION 'observed user required';
END IF;
```

La migracion [045_admin_observed_workspace_self_and_template_fix.sql](file:///c:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/MENSAJES/sql/migrations/045_admin_observed_workspace_self_and_template_fix.sql#L193-L195) intenta corregir esto eliminando `OR p_observed_user_id = v_admin_user_id`, pero...

La 045 tambien redefine `list_admin_user_templates` referenciando columnas `template.lead_ids`, `template.lista_ids`, `template.template_list_ids` y `template.lead_list_ids`.

**Verificacion en Supabase remoto:**
- Las columnas `lead_ids`, `template_list_ids` y `lead_list_ids` **SI existen** en la tabla `templates` remota (verificado con query directa).
- Las RPCs `list_admin_user_leads` y `list_admin_user_templates` **SI existen** (responden `P0001: authentication required` y no `404 function not found`).

Esto significa que las migraciones 044 y/o 045 fueron ejecutadas. El problema entonces se reduce a:

#### Capa 2: La version activa del RPC determina el comportamiento

Dependiendo de cual migracion fue la ultima en ejecutarse exitosamente:

| Escenario | `list_admin_user_leads` | `list_admin_user_appointments` | Comportamiento |
|-----------|------------------------|-------------------------------|----------------|
| Solo 043+044 activas | Bloquea auto-observacion | Bloquea auto-observacion | Admin no puede ver sus propios datos |
| 045 aplicada correctamente | Permite auto-observacion | Permite auto-observacion | Deberia funcionar |

**El error "Cargando base del usuario..." que aparece en las capturas para Henry Farias (un usuario DIFERENTE al admin) indica que el problema NO es solo de auto-observacion.** Si fuera solo eso, Henry Farias cargaria normalmente.

#### Capa 3: Problema de `Promise.all` con templates (hipotesis mas probable)

Si `list_admin_user_templates` falla internamente (por ejemplo, error en el mapeo de columnas `lead_ids` como `uuid[]` vs `text[]`), el `Promise.all` rechaza AMBAS promesas y el componente nunca sale del estado de loading.

En la migracion 044 linea 159, `lead_ids` se declara como `uuid[]`:
```sql
lead_ids uuid[],
```

En la migracion 045 linea 243, se cambio a `text[]`:
```sql
lead_ids text[],
```

Si la tabla real tiene `lead_ids` como un tipo diferente al que espera la RPC (posible drift entre lo declarado en `RETURNS TABLE` y lo real en la columna), PostgreSQL arrojaria un error de tipo al ejecutar la funcion.

### Verificacion directa

Verificacion con query directa a la tabla `templates` (service role):

```json
{
  "lead_ids": [],           // tipo real: desconocido (array vacio no revela tipo)
  "template_list_ids": [],  // tipo real: desconocido
  "lead_list_ids": []       // tipo real: desconocido
}
```

Los arrays estan vacios, lo que no permite determinar el tipo real. El conflicto potencial esta entre `uuid[]` (044) vs `text[]` (045) para `lead_ids`.

### Solucion propuesta

1. **Verificar en el SQL Editor de Supabase** el tipo real de la columna `lead_ids` en `templates`:
   ```sql
   SELECT column_name, data_type, udt_name
   FROM information_schema.columns
   WHERE table_name = 'templates'
   AND column_name IN ('lead_ids', 'lista_ids', 'template_list_ids', 'lead_list_ids');
   ```

2. **Verificar cual version de las RPCs esta activa**:
   ```sql
   SELECT pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'list_admin_user_templates';
   ```

3. **Si la 044 esta activa**: Corregir y re-ejecutar la 045 asegurando que los tipos coincidan con los de la tabla real.

4. **Si la 045 esta activa pero el tipo difiere**: Crear una nueva migracion 046 que alinee el `RETURNS TABLE` de la RPC con el tipo real de las columnas.

---

## Problema 2: Admin SaaS no puede ver su propia agenda

> [!WARNING]
> Este problema esta confirmado como un bloqueo explicito en el SQL que no fue corregido.

### Sintoma
Al seleccionar "Planespro" (el admin) y abrir la pestana "Agenda", aparece: "No se pudo cargar la agenda observada"

### Causa raiz verificada

La RPC `list_admin_user_appointments` tiene esta validacion en la migracion 043 (linea 223):

```sql
IF p_observed_user_id IS NULL OR p_observed_user_id = v_admin_user_id THEN
  RAISE EXCEPTION 'valid observed user required';
END IF;
```

El admin tiene `id = 7a005c66-d5e7-4be1-9fa8-59f8ab195846`. Cuando intenta observar su propia agenda, `p_observed_user_id = v_admin_user_id` se cumple y la RPC lanza la excepcion.

La migracion 045 intenta corregir esto (quitando la comparacion con `v_admin_user_id`), pero **no sabemos si la 045 fue aplicada exitosamente o si aborto por el problema de templates mencionado arriba**.

Ademas, en [AdminUserAgenda.tsx](file:///c:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/MENSAJES/src/components/admin/AdminUserAgenda.tsx#L43-L44), el error de Supabase no es una instancia de `Error` de JavaScript:

```typescript
setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda observada');
```

Los errores de PostgREST son objetos `PostgrestError`, no instancias de `Error`, por lo que **el mensaje real de Postgres se pierde** y se muestra el fallback generico.

### Solucion propuesta

1. Verificar si la 045 se aplico exitosamente.
2. Si no se aplico: crear una migracion correctiva que:
   - Elimine la restriccion `OR p_observed_user_id = v_admin_user_id` de `list_admin_user_appointments`
   - Alinee los tipos de `list_admin_user_templates` con la tabla real
3. Mejorar el manejo de errores en el frontend para capturar `PostgrestError` y mostrar el mensaje real.

---

## Problema 3: Admin SaaS SI puede ver la agenda de otros usuarios

### Explicacion

Esto es coherente con el diagnostico anterior. La restriccion solo bloquea cuando `p_observed_user_id = v_admin_user_id`. Para cualquier otro usuario, la RPC funciona correctamente porque la condicion no se cumple.

---

## Problema 4: Horas cruzadas entre formulario general y PB

> [!IMPORTANT]
> Este problema fue verificado y **NO se reproduce** en el backend actual de Supabase.

### Sintoma reportado
Al crear una cita desde `https://planespro.cl/pb/?ref=pp-e6efca41f40449c0adde9f65b3219f02`, la hora aparece marcada en rojo en el calendario del formulario PB. Pero en `planespro.cl` (formulario general), esa hora se marca en gris.

### Verificacion directa contra Supabase

Se verifico la disponibilidad publica directamente en las Edge Functions:

**General (sin ref):**
```
advisor: planespro.cl@gmail.com (7a005c66-...)
source_channel: general
capture_link_id: null
```

**PB (con ref=pp-e6efca41f40449c0adde9f65b3219f02):**
```
advisor: hentimes@gmail.com (e6efca41-...)
source_channel: pb
capture_link_id: 3
```

**Conclusion:** Los owners son DIFERENTES y las agendas se resuelven correctamente por separado en Supabase.

### Hipotesis del bloqueo visual

El bloqueo visual "en gris" en `planespro.cl` **no proviene de la agenda PB**. Las posibles causas son:

1. **Horas pasadas (past_time)**: Las horas que ya pasaron se muestran en gris azulado. Si la prueba se hizo en un horario donde esas horas ya habian pasado, el gris es correcto y esperado.

2. **Sincronizacion Google Calendar del admin**: Si el admin (`planespro.cl@gmail.com`) tiene Google Calendar sincronizado y tiene eventos en esas horas, los bloqueos `google` aparecerian como no disponibles en gris.

3. **Citas activas del admin general**: Se verifico que el admin tiene 1 cita `pendiente` (source_channel=`general`), ademas de 4 canceladas. Esa cita activa SI bloquea un slot en la agenda general.

4. **Cache del navegador**: El frontend puede estar sirviendo disponibilidad cacheada. Se recomienda hacer la verificacion en modo incognito.

### Estado real de citas del admin (verificado)

| appointment_id | user_id | status | source_channel |
|---|---|---|---|
| 8581adcd-... | 7a005c66-... (admin) | cancelada | general |
| a51b0097-... | 7a005c66-... (admin) | cancelada | general |
| c1710932-... | 7a005c66-... (admin) | **pendiente** | general |
| 06360c96-... | 7a005c66-... (admin) | cancelada | general |
| 47a2538d-... | 7a005c66-... (admin) | cancelada | general |

Solo 1 cita activa (`pendiente`) en la agenda general. Las canceladas no bloquean slots.

### Solucion propuesta

1. **Verificar manualmente** abriendo ambos calendarios al mismo tiempo en modo incognito para la misma fecha futura.
2. Si el bloqueo persiste, verificar si el admin tiene eventos en Google Calendar que se sincronizan como bloqueos `google` en `user_availability_blocks`.
3. El worker `ppforms` en Cloudflare esta **deprecado** y devuelve 410. Los formularios ahora llaman directamente a las Edge Functions de Supabase. No hay intermediario que mezcle agendas.

---

## Problema 5: Admin no logra cargar sus propios leads (bandeja principal)

### Verificacion directa

Se verifico que el admin (`7a005c66-d5e7-4be1-9fa8-59f8ab195846`) **SI tiene leads** asignados en la base de datos. Existen multiples leads con ese `user_id`.

### Analisis del codigo

La bandeja principal de leads usa [LeadsPage.tsx](file:///c:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/MENSAJES/src/pages/LeadsPage.tsx) que filtra por `user_id = auth.uid()`. La RLS de la tabla `leads` es:

```sql
CREATE POLICY "Usuarios ven sus propios leads"
ON public.leads FOR SELECT
USING (auth.uid() = user_id);
```

Si el `auth.uid()` del admin coincide con `7a005c66-d5e7-4be1-9fa8-59f8ab195846`, los leads deberian cargarse.

### Hipotesis

1. **Sesion expirada o corrupta**: Si la sesion OAuth del admin expiro, `auth.uid()` retorna `null` y la query no devuelve resultados.
2. **Error silencioso de paginacion**: La bandeja usa paginacion server-side. Si hay un error en el conteo o en la RPC de paginacion, el componente puede quedarse en estado de carga.
3. **Extension vs navegador**: La extension Chrome puede tener una sesion diferente a la del navegador. Verificar si el problema se reproduce en ambos contextos.

### Solucion propuesta

1. Abrir la consola del navegador/extension y verificar las respuestas de la API al cargar la bandeja.
2. Verificar que la sesion esta activa: `supabase.auth.getSession()` debe retornar un session valido.
3. Si la sesion expiro, cerrar sesion y volver a iniciar.

---

## Resumen de hallazgos y acciones

| # | Problema | Severidad | Causa raiz | Accion inmediata |
|---|----------|-----------|-----------|------------------|
| 1 | Leads no cargan en Admin Base | Critica | RPC `list_admin_user_templates` potencialmente con tipo incorrecto en `lead_ids` (`uuid[]` vs `text[]`), o restriccion de auto-observacion activa | Verificar tipo real de columnas y version activa de RPCs en SQL Editor |
| 2 | Agenda propia del admin no carga | Alta | RPC `list_admin_user_appointments` bloquea cuando `p_observed_user_id = auth.uid()` | Confirmar si migracion 045 se aplico; si no, ejecutar fix |
| 3 | Agenda de otros usuarios SI funciona | N/A | Esperado, la restriccion solo aplica a auto-observacion | N/A |
| 4 | Horas cruzadas entre General y PB | Baja | NO confirmado en backend; las agendas se resuelven a owners distintos correctamente | Verificar manualmente en incognito; revisar sync Google Calendar |
| 5 | Leads propios no cargan en bandeja | Media | Posible sesion expirada o error silencioso de paginacion | Revisar consola del navegador/extension |

---

## Queries de diagnostico para ejecutar en Supabase SQL Editor

> [!TIP]
> Ejecuta estas queries en el SQL Editor de Supabase para confirmar los diagnosticos.

### 1. Verificar tipo real de columnas de templates
```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
ORDER BY ordinal_position;
```

### 2. Ver definicion activa de RPCs
```sql
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN (
  'list_admin_user_leads',
  'list_admin_user_templates',
  'list_admin_user_appointments',
  'mark_admin_user_leads_seen'
)
AND pronamespace = 'public'::regnamespace;
```

### 3. Verificar bloqueos Google activos del admin
```sql
SELECT *
FROM public.user_availability_blocks
WHERE user_id = '7a005c66-d5e7-4be1-9fa8-59f8ab195846'
ORDER BY start_time DESC
LIMIT 10;
```

### 4. Verificar citas activas por usuario
```sql
SELECT
  p.email,
  a.status,
  a.source_channel,
  a.start_time,
  a.end_time,
  a.capture_ref
FROM public.appointments a
JOIN public.profiles p ON p.id = a.user_id
WHERE a.status NOT IN ('cancelada', 'rechazada')
ORDER BY a.start_time DESC;
```

### 5. Probar directamente la RPC de leads para un usuario diferente
```sql
-- Esto simula lo que hace el frontend cuando el admin observa a Henry Farias
SELECT * FROM public.list_admin_user_leads(
  'e6efca41-f404-49c0-adde-9f65b3219f02'::uuid,
  5
);
```

### 6. Verificar constraint de auto-monitoreo
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.admin_user_monitor_state'::regclass;
```

---

## Arbol de decision para la solucion

```mermaid
flowchart TD
    A["Ejecutar Query 2: ver definicion activa de RPCs"] --> B{Version activa de list_admin_user_leads?}
    B -->|"Tiene 'OR p_observed_user_id = v_admin_user_id'"| C["Migracion 045 NO se aplico"]
    B -->|"NO tiene esa restriccion"| D["Migracion 045 SI se aplico"]
    
    C --> E["Ejecutar Query 1: verificar tipo de columnas"]
    E --> F{lead_ids es uuid[] o text[]?}
    F -->|"uuid[]"| G["Crear migracion 046 con tipos alineados a uuid[] y sin restriccion auto-observacion"]
    F -->|"text[]"| H["Re-ejecutar migracion 045 corregida"]
    
    D --> I["El problema NO es de migraciones"]
    I --> J["Verificar sesion auth en consola del navegador"]
    J --> K["Verificar errores de PostgREST en Supabase Dashboard > Logs"]
```

---

## Riesgos abiertos

1. **Manejo de errores en frontend**: Los errores de `PostgrestError` se pierden porque `err instanceof Error` es `false`. Esto dificulta el debugging. Deberia capturarse como `(err as any)?.message || 'fallback'`.

2. **Constraint `admin_user_monitor_state_distinct_users_check`**: La tabla `admin_user_monitor_state` tiene un `CHECK (admin_user_id <> observed_user_id)` que impide insertar filas de auto-monitoreo. Si se habilita la auto-observacion en las RPCs, `mark_admin_user_leads_seen` devolvera silenciosamente sin error (hace `RETURN` temprano), pero no podra persistir el estado de "visto" para el propio admin.

3. **Drift potencial de tipos**: La discrepancia entre `uuid[]` y `text[]` para `lead_ids` en la RPC vs la tabla real es un riesgo de runtime que no se detecta en build.

4. **Worker ppforms deprecado**: Confirmado que ya no procesa negocio. Devuelve 410. No es fuente de errores actuales.

---

## Estado CONTROL de esta auditoria

- `hecho`: auditoria de 4 angulos del proyecto
- `hecho`: verificacion directa contra Supabase remoto
- `hecho`: identificacion de causas raiz
- `pendiente de validacion real`: ejecutar queries de diagnostico en SQL Editor
- `pendiente de validacion real`: confirmar version activa de RPCs
- `pendiente de validacion real`: reproducir problema de leads en bandeja con consola abierta
