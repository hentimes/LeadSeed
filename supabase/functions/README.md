# Edge Functions - donde vive el source de cada una

## Regla vigente desde el 2026-08-12

**Todas las Edge Functions se despliegan solo desde este repo (LeadSeed).**

`landing-gerow` no debe contener una carpeta `supabase/functions/`. Si reaparece, es un error:
significa que hay dos repos capaces de sobrescribir la misma funcion desplegada.

Esta regla reemplaza al modelo anterior de propiedad repartida, que causo un incidente real
documentado en `docs/auditorias/AUDITORIA_CONTROL_2026-08-11.md`. El detalle esta mas abajo porque explica por que la
regla es tan tajante.

## Por que la regla cambio

El modelo anterior decia que las funciones de los formularios publicos vivian en `landing-gerow` y las
de la extension en LeadSeed. Ese reparto fallo de la peor forma posible: **`form-leads` termino
existiendo en los dos repos, divergente**, sin que ninguna herramienta lo detectara.

- LeadSeed tenia 584 lineas, del 31 de julio.
- `landing-gerow` tenia 690 lineas, del 3 de agosto, y **era la desplegada en produccion**.

Confirmado por Nivel 1 (`npx supabase functions list`, 2026-08-12):

```
form-leads  v23  ACTIVE
entrypoint_path: .../landing-gerow/supabase/functions/form-leads/index.ts
```

La version de `landing-gerow` contiene un despacho de tres vias que la de LeadSeed desconocia por
completo:

- `action_only=1` invoca `update_planespro_public_lead_action`
- `submission_id` mas `update_token` invoca `submit_planespro_idempotent_public_lead`
- el resto invoca `submit_planespro_public_lead`

La copia de LeadSeed solo conocia la tercera. Un `supabase functions deploy form-leads` ejecutado desde
este repo habria roto `/form/` y `/retiro-tecnico-extranjero/` en produccion, creando **un lead
duplicado por cada envio** y perdiendo la creacion de cita.

El 2026-08-12 se adopto en este repo la version de produccion (690 lineas). Este directorio es desde
entonces la unica fuente de verdad.

## Estado actual por funcion

| Funcion | Source | Nota |
|---|---|---|
| `email-channels` | este repo | |
| `form-lead-abandoned` | este repo | |
| `form-lead-file` | este repo | CORS pendiente de alinear a la allowlist estandar |
| `form-leads` | este repo | adoptada desde `landing-gerow` el 2026-08-12 |
| `form-public-availability` | este repo | |
| `google-calendar-connect` | este repo | |
| `google-calendar-create-event` | este repo | |
| `google-calendar-sync` | este repo | |
| `google-calendar-sync-attendees` | este repo | |
| `google-calendar-update-event` | este repo | |
| `send-email` | este repo | |
| `form-progress` | este repo | adoptada desde el codigo desplegado el 2026-08-12 |

### form-progress

Recibe eventos de visita, paso 1 y paso 2 de los formularios publicos y escribe en
`public.form_progress_events` con la service role key.

Se adopto el `2026-08-12` con `supabase functions download`, es decir, desde el codigo que estaba
realmente corriendo, y no copiandolo de `landing-gerow`. La diferencia importaba:

| Fuente | Slugs aceptados |
|---|---|
| desplegado en produccion | `pb`, `form`, `retiro`, `retiro-v2` mas nueve tipos de evento |
| `landing-gerow`, HEAD commiteado | `pb`, `form`, `retiro` mas tres tipos de evento |
| `landing-gerow`, arbol sin commitear | igual que lo desplegado |

Alguien desplego sin commitear. Copiar del HEAD habria tomado la version vieja y, al redesplegar,
habria desactivado en silencio el tracking de `retiro-v2` y de seis tipos de evento.

**Leccion operativa: ante cualquier duda sobre que version es la buena, la respuesta es
`supabase functions download`, no el git de ninguno de los dos repos.**

Deuda conocida (roadmap 13.4): `KNOWN_FORM_SLUGS` es un allowlist escrito a mano mientras LeadSeed ya
tiene `public.form_types` como registro editable. Agregar un tipo de formulario desde la extension no
habilita su telemetria hasta editar y redesplegar esta funcion.

## Comprobacion de deriva

```
npm run check:functions
```

Consulta el proyecto real y falla si alguna funcion desplegada tiene su source fuera de este repo, o
si su `verify_jwt` no coincide con `supabase/config.toml`. Correrlo antes de cualquier deploy.

Si no hay CLI enlazado, se omite en vez de fallar: no tiene sentido romper una maquina que no puede
comprobarlo.

## _shared/emailChannels.ts

Existio divergente en ambos repos (381 lineas aca, 332 alla). La de este repo es superset. Verificado
el 2026-08-12 que `form-leads` solo importa `resolveUserEmailChannel`, presente aca, por lo que la
funcion adoptada opera correctamente contra esta version. No requiere merge.

## Antes de tocar cualquier funcion

Corre `npx supabase functions list` y revisa `entrypoint_path`. Si alguna funcion apunta a un path
fuera de este repo, es una violacion de la regla vigente y hay que corregirla antes de desplegar,
nunca despues.

No reconstruyas una funcion de memoria: eso crea una segunda fuente de verdad para la misma funcion
desplegada, que es exactamente el fallo que este documento existe para impedir.
