# Contrato de Integracion: planespro.cl -> MENSAJES

Fecha de actualizacion: 2026-07-17
Estado: vigente

## 1. Objetivo

Este documento fija el contrato minimo para que los formularios publicos de `planespro.cl` dejen de depender de Cloudflare `ppforms` para captura de leads y comiencen a escribir directamente en Supabase/MENSAJES.

No cubre aun agenda completa ni abandono de lead.

El objetivo inmediato es:

- que el formulario general de `planespro.cl` haga caer los leads en la cuenta central `planespro.cl@gmail.com`
- que los formularios `pb` hagan caer los leads en el usuario owner del `capture_link`
- que ambos queden visibles en la extension/CRM actual

## 2. Endpoint activo

Endpoint Supabase:

```text
https://pfoikdneixbvpozbtqcx.supabase.co/functions/v1/form-leads
```

Metodo:

```text
POST
```

Origins permitidos actualmente:

- `https://planespro.cl`
- `https://www.planespro.cl`
- `https://form.planespro.cl`
- `http://localhost:3000`
- `http://localhost:4173`
- `http://localhost:5173`

## 3. Tipos de formulario soportados

Existen dos canales publicos distintos:

### 3.1 Formulario general

Canal:

```text
general
```

Regla de ownership:

- si no viene por `pb/ref`, el lead cae en la cuenta central `planespro.cl@gmail.com`
- aunque exista `first_touch_ref` historico, el formulario general no debe heredar ownership de otro ejecutivo

### 3.2 Formulario `pb`

Canal:

```text
pb
```

Regla de ownership:

- si viene por link propio de ejecutivo, el lead cae en el owner del `capture_link`
- la resolucion se hace por `capture_ref`
- si `capture_ref` falta, puede caer por `first_touch_ref` solo dentro del flujo `pb`

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
- `pb` manda al owner del link
- ownership por ultimo toque real
- `first_touch_ref` se conserva para trazabilidad, no para reasignar el formulario general
- manual/importado no entra a campaña por defecto
- alertas de cruce entre ejecutivos si aplican a cualquier lead por coincidencia

## 10. Gestion de links en MENSAJES

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

Para cerrar el ciclo visual dentro de MENSAJES falta:

1. crear panel compacto de links de publicacion
2. conectar el panel a las RPCs
3. mostrar URL final de publicacion por link
4. mostrar contadores y cortes analiticos por link
5. validar `general` y `/pb/?ref=...` desde UI real
