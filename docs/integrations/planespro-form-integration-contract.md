# Contrato de Integracion: planespro.cl -> LeadSeed

Version: 2.0
Fecha de verificacion: 2026-08-13
Estado: vigente

> **Que cambio en la 2.0.** La version anterior declaraba **dos** canales publicos cuando hay
> **cuatro**, publicaba el endpoint crudo de Supabase en vez del dominio branded que usan los
> formularios, y no documentaba el protocolo de dos fases que esta en produccion desde el 3 de agosto.
> Todo lo que sigue se verifico contra el codigo desplegado de `form-leads` y contra las migraciones
> 090 y 093, no contra la version previa.

## 1. Objetivo

Este documento fija el contrato minimo para que los formularios publicos de `planespro.cl` dejen de depender de Cloudflare `ppforms` para captura de leads y comiencen a escribir directamente en Supabase/LeadSeed.

No cubre aun agenda completa ni abandono de lead.

El objetivo inmediato es:

- que el formulario general de `planespro.cl` haga caer los leads en la cuenta central `planespro.cl@gmail.com`
- que los formularios `pb` hagan caer los leads en el usuario owner del `capture_link`
- que ambos queden visibles en la extension/CRM actual

## 2. Endpoint activo

Los formularios **no llaman a Supabase directamente**. Llaman al dominio branded, que hace de proxy:

```text
POST https://form.planespro.cl/api/form/leads
```

Y no es solo preferencia: la CSP de `_headers` en `landing-gerow` no incluye `*.supabase.co`, asi que
una llamada directa desde el navegador la bloquea el propio navegador.

La base se resuelve desde el HTML, no se escribe a mano en el JS:

```html
<meta name="planespro-form-api-base" content="https://form.planespro.cl/api">
```

Rutas publicas y a que Edge Function llega cada una:

| Ruta publica | Edge Function |
|---|---|
| `POST /api/form/leads` | `form-leads` |
| `POST /api/form/leads/abandoned` | `form-lead-abandoned` |
| `POST /api/form/progress` | `form-progress` |
| `GET /api/public/availability` | `form-public-availability` |

`form-lead-file` existe pero **no tiene ruta publica**: solo la consume la extension.

Origins permitidos actualmente:

- `https://planespro.cl`
- `https://www.planespro.cl`
- `https://form.planespro.cl`
- `http://localhost:3000`
- `http://localhost:4173`
- `http://localhost:5173`

## 3. Canales publicos

Son **cuatro**, no dos. Tres de ellos estan registrados en la tabla `form_types` (migracion 093);
`general` no esta ahi porque no es un tipo de link, es el caso sin link.

| Canal | De donde viene | Ownership |
|---|---|---|
| `general` | formulario del sitio, sin ref | cuenta central |
| `pb` | `/pb/<ref>` | owner del `capture_link` |
| `retiro` | `/retiro-tecnico-extranjero/<ref>/` | owner del link; sin ref, el primer perfil `admin` |
| `form` | `/form/<ref>` | owner del `capture_link` |

**Como se resuelve el canal, que no es obvio y conviene tenerlo escrito.** Hay dos capas y la segunda
puede corregir a la primera:

1. La Edge Function normaliza lo que declara el formulario. Si no declara nada, lo deduce: primero de
   la **ruta**, luego de si hay ref, y si nada aplica, `general`.
2. El RPC `resolve_planespro_booking_context` vuelve a mirarlo. Si hay un `capture_ref` que matchea un
   link real, **adopta el `link_type` de ese link y descarta lo que venia declarado**. La base manda
   sobre lo que diga el cliente, que es lo correcto: el canal declarado es dato no confiable.

Consecuencia practica: la normalizacion de la capa 1 **solo decide cuando no hay ref**. Con ref, el
tipo real del link gana siempre.

### Deuda corregida el 2026-08-13

Hasta esa fecha `normalizeSourceChannel` aceptaba unicamente `pb` y `general`, y como la funcion
**sobreescribe `source_channel` en el payload** antes de llamar al RPC, un `retiro` declarado se
convertia en `general` (sin ref) o en `pb` (con ref) y el RPC nunca veia el valor original.

Con ref el resultado final salia bien igual, porque la capa 2 adopta el `link_type` del link. Sin ref
no: el lead quedaba etiquetado `general`, y sobre todo **la rama "siempre admin" que la migracion 090
agrego a proposito para `retiro` era codigo inalcanzable**, porque su condicion es
`v_source_channel = 'retiro'` y ese valor no llegaba nunca. El respaldo volvia a depender del correo
`planespro.cl@gmail.com` hardcodeado, que es justo lo que esa migracion queria dejar de hacer.

Corregido en `form-leads` y en `form-lead-abandoned`, que tenian el mismo codigo: la lista de canales
aceptados ahora refleja `form_types`, y la deduccion mira la ruta antes que el ref, porque un ref
existe en los tres tipos y por si solo no dice de cual viene.

### Notas de ownership

- `general`: aunque exista un `first_touch_ref` historico, **no hereda ownership** de otro ejecutivo.
  El primer toque se guarda para trazabilidad, no para reasignar.
- `pb`, `retiro` y `form`: la resolucion es por `capture_ref` contra `capture_links`. Dentro del flujo
  `pb`, si falta `capture_ref` puede caer por `first_touch_ref`.
- `retiro` sin ref: cae en el **primer perfil con `role = 'admin'`** por fecha de creacion. Ese
  respaldo existe para no depender de que `planespro.cl@gmail.com` siga existiendo ni siga siendo
  admin.

## 3.b Protocolo de dos fases

Vigente desde el `2026-08-03` en `/form` y `/retiro-tecnico-extranjero`. No estaba documentado.

Existe porque esos formularios preguntan la preferencia de contacto **despues** de tener los datos de
la persona, y perder el lead si alguien abandona en ese punto seria perderlo entero. Asi que se guarda
antes y se completa despues.

`form-leads` despacha a **tres** RPC distintos segun lo que traiga el payload, en este orden:

| Condicion en el payload | RPC | Para que |
|---|---|---|
| `action_only = '1'` mas `lead_id`, `submission_id` y `update_token` | `update_planespro_public_lead_action` | fase 2: completa la accion sobre un lead ya creado |
| `submission_id` y `update_token` presentes | `submit_planespro_idempotent_public_lead` | fase 1: crea, o devuelve el que ya existe |
| ninguno de los anteriores | `submit_planespro_public_lead` | envio clasico de una sola fase |

Reglas de los dos identificadores:

- `submission_id` debe ser un **UUID v4**; el RPC lo valida con expresion regular y rechaza cualquier
  otra cosa.
- `update_token` debe medir entre **32 y 128 caracteres**.
- La idempotencia se apoya en el indice unico `leads_form_submission_id_uidx` sobre
  `metadata->>'form_submission_id'`, mas un `pg_advisory_xact_lock` sobre el `submission_id`: dos
  envios simultaneos del mismo formulario no pueden crear dos leads.
- En fase 2 el `update_token` tiene que **coincidir** con el guardado en la fase 1. Es lo que impide
  que un tercero modifique un lead ajeno conociendo solo su id.

Un envio de una sola fase sigue siendo valido: si el formulario no manda esos campos, se usa el RPC
clasico.

## 4. Payload minimo recomendado

Campos base soportados:

- `name` o `nombre`
- `phone` o `telefono`
- `email` o `correo`
- `company` o `empresa`
- `rut`
- `notes`, `comentarios`, `comentario`, `message` o `mensaje`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `contacto_preferencia` o `contact_preference`
- `cita_fecha_hora`
- `cita_estado`
- `advisor_id`
- `capture_ref` o `ref`
- `first_touch_ref`

Campos de contexto que el frontend debe mandar de forma explicita cuando sea posible:

- `source_channel`
- `source_form_variant`
- `source_hostname`
- `source_path`
- `source_url`

Nota:

- Si el frontend no manda esos campos, la Edge Function intenta inferirlos desde `ref`, `path` y `referer`
- Igual conviene mandarlos para no depender de heuristica

## 5. Payload recomendado: formulario general

```json
{
  "source_channel": "general",
  "source_form_variant": "main-site-form",
  "source_hostname": "planespro.cl",
  "source_path": "/",
  "source_url": "https://planespro.cl/",
  "name": "Juan Perez",
  "phone": "+56912345678",
  "email": "juan@email.com",
  "company": "Empresa Demo",
  "notes": "Necesita asesoria de plan",
  "contacto_preferencia": "hablar_ahora",
  "utm_source": "google",
  "utm_medium": "organic",
  "utm_campaign": "home-organico"
}
```

Resultado esperado:

- `metadata.source_channel = general`
- `metadata.capture_ref = ""` o nulo
- owner final = cuenta central `planespro.cl@gmail.com`

## 6. Payload recomendado: formulario `pb`

```json
{
  "source_channel": "pb",
  "source_form_variant": "pb-long-form",
  "source_hostname": "planespro.cl",
  "source_path": "/pb/",
  "source_url": "https://planespro.cl/pb/?ref=abc123",
  "capture_ref": "abc123",
  "first_touch_ref": "abc123",
  "name": "Maria Soto",
  "phone": "+56987654321",
  "email": "maria@email.com",
  "notes": "Quiere comparar Fonasa vs Isapre",
  "contacto_preferencia": "agendar_reunion",
  "cita_fecha_hora": "2026-07-20T10:00:00-04:00",
  "cita_estado": "Confirmada",
  "utm_source": "instagram",
  "utm_medium": "social",
  "utm_campaign": "pb-julio"
}
```

Resultado esperado:

- `metadata.source_channel = pb`
- `metadata.capture_ref = abc123`
- `metadata.capture_link_id` poblado si el `ref` existe
- owner final = owner del `capture_link`

## 7. Multipart con adjunto

La function tambien acepta `multipart/form-data`.

Campo esperado para archivo:

- cualquier `File` del form se toma como adjunto principal

Metadatos que se agregan automaticamente:

- `pdf_path`
- `pdf_filename`
- `pdf_content_type`
- `pdf_size`

Bucket usado:

```text
planespro-form-uploads
```

## 8. Respuesta esperada

Respuesta exitosa:

```json
{
  "lead_id": "uuid-del-lead",
  "assigned_user_id": "uuid-owner",
  "capture_link_id": 12,
  "source_channel": "pb",
  "status": "created"
}
```

En formulario general, `capture_link_id` puede venir `null`.

## 9. Reglas de negocio vigentes

- `general` manda a la cuenta central
- `pb` y `form` mandan al owner del link
- `retiro` manda al owner del link, y sin ref al primer perfil `admin`
- ante un `capture_ref` valido, el canal real lo decide el `link_type` del link, no lo que declare
  el formulario
- ownership por ultimo toque real
- `first_touch_ref` se conserva para trazabilidad, no para reasignar el formulario general
- manual/importado no entra a campaña por defecto
- alertas de cruce entre ejecutivos si aplican a cualquier lead por coincidencia

## 10. Gestion de links en LeadSeed

La gestion de links no debe hacerse con mutaciones directas desde UI sobre `capture_links`.

La frontera oficial son RPCs autenticadas:

- `list_my_capture_links()`
- `create_my_capture_link(...)`
- `update_my_capture_link(...)`
- `deactivate_my_capture_link(...)`
- `get_my_capture_link_stats(...)`

Reglas:

- cada perfil remoto debe tener un `Link principal`
- el limite por usuario vive en `profiles.capture_links_limit`
- el limite valido es 1 a 5
- un link default no puede quedar inactivo
- desactivar un link no borra su historial analitico
- las metricas salen de leads reales capturados por `capture_link_id` o `capture_ref`

## 11. Siguiente paso operativo

Para cerrar el ciclo visual dentro de LeadSeed falta:

1. crear panel compacto de links de publicacion
2. conectar el panel a las RPCs
3. mostrar URL final de publicacion por link
4. mostrar contadores y cortes analiticos por link
5. validar `general` y `/pb/?ref=...` desde UI real
