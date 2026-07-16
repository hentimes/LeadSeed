# Auditoria y Plan Arquitectonico: Migracion a Supabase

Fecha de actualizacion: 2026-07-16
Estado: vigente, con ajustes por CONTROL

Este documento define la migracion de leads, agenda, archivos e integracion publica desde Cloudflare hacia Supabase. Desde esta fecha incorpora un requerimiento transversal obligatorio: cualquier UI nueva debe priorizar sidebar de extension y movil antes de asumir vistas amplias o patrones visuales pesados.

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

## 3. Ajustes obligatorios introducidos por CONTROL

- No se puede planificar una agenda solo como vista a pantalla completa.
- La agenda debe nacer con patron compacto, responsive y escalable a sidebar y movil.
- La integracion con `planespro.cl` debe aterrizar en una UX coherente con `MENSAJES`, no en modales o tarjetas blancas genericas sin control de densidad.
- No usar emoticones o emojis en documentacion operativa ni microcopy del flujo.

## 4. Plan de implementacion estrategico

El plan se divide en tres modulos.

### Modulo 1: Infraestructura y Edge Functions en Supabase

#### 4.1 Endpoint de disponibilidad

- Reemplazara `GET /api/public/availability`.
- Leera `from` y `to`.
- Consultara la funcion SQL equivalente en Supabase.
- Si el vendedor tiene Google Calendar conectado, cruzara disponibilidad real.
- Debe devolver el contrato JSON esperado por el frontend actual.

#### 4.2 Endpoint de recepcion de leads

- Reemplazara `POST /api/form/leads`.
- Parseara `FormData`.
- Validara limite de 3MB.
- Subira adjuntos a Supabase Storage.
- Insertara el lead asignando vendedor segun `ref`.
- Si existe `cita_fecha_hora`, insertara `appointments` y disparara integracion de agenda.
- Enviara confirmacion transaccional por el proveedor definido.

### Modulo 2: Integracion CRM y agenda nativa

#### 4.3 Conexion Google OAuth

- Crear interfaz de conexion de Google Calendar.
- Guardar `refresh_token` en una tabla segura dedicada.
- Validar credenciales OAuth alineadas con Supabase.

#### 4.4 Agenda UI

- Construir primero una agenda compacta para sidebar y movil.
- Permitir crecimiento progresivo a vistas semanal o mensual sin duplicar componentes base.
- Mostrar `appointments` en tiempo real.
- Soportar reagendamiento sin abrir una segunda fuente de verdad.

Nota de auditoria:
La referencia anterior a `src/pages/AgendaPage.tsx` debe tratarse como objetivo tentativo, no como archivo existente confirmado, hasta validar su ubicacion real en el repo.

#### 4.5 Panel de disponibilidad

- Interfaz donde cada vendedor define horas base y bloqueos excepcionales.
- Debe convivir con sidebar y movil sin desbordes ni layouts de escritorio fijo.

### Modulo 3: Switch de trafico

Cuando el backend y la agenda esten validados:

1. actualizar `landing-gerow/frontend/lead-capture/js/app.js`
2. cambiar `workerUrl` hacia Supabase
3. desplegar la landing
4. confirmar que nuevos leads nazcan y se operen desde Supabase

## 5. Plan de verificacion

- Flujo de disponibilidad: comparar respuesta Supabase contra contrato Cloudflare.
- Asignacion por URL: probar distintos `ref` y verificar `user_id`.
- OAuth: probar multiples cuentas sin colision de tokens.
- Limites de archivo: rechazar 5MB y aceptar 1MB.
- UI compacta: validar agenda y componentes clave en ancho de sidebar y en movil.
- Consistencia visual: rechazar implementaciones que dependan del patron dominante de tarjetas blancas redondeadas.

## 6. Hallazgos abiertos al 2026-07-16

- El plan previo sobredeclaraba una agenda a pantalla completa y no reflejaba la prioridad de sidebar y movil.
- El roadmap previo usaba emojis y no representaba el nuevo criterio visual obligatorio.
- La ubicacion exacta de la futura pagina o modulo de agenda debe verificarse en el arbol real antes de implementarse.
