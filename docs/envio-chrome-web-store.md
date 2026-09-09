# Envío a la Chrome Web Store

Los textos que pide el formulario, listos para copiar. Se mantienen aquí y no
en la consola de Google para que queden versionados junto al código que
describen: cuando cambie un permiso, este archivo tiene que cambiar en el mismo
commit.

Estado: **redactado, sin enviar**. Falta lo que no se puede escribir desde el
repositorio — las capturas, la URL pública de la política de privacidad y el
formulario de divulgación de datos.

---

## Propósito único

Google exige que la extensión tenga un propósito declarable en una frase, y que
todo lo que hace se lea como parte de ese propósito. Esta es la frase:

> LeadSeed es un gestor de contactos comerciales que permite escribirles por
> WhatsApp y correo electrónico desde el panel lateral del navegador.

Todo lo demás se justifica respecto de eso:

| Sección | Cómo se relaciona con el propósito |
|---|---|
| Leads, Listas, Pipeline | Los contactos y su estado. Es el objeto del producto. |
| Enviar, Plantillas, Flujos | El envío de mensajes a esos contactos. |
| Agenda, Tareas | El seguimiento de cada contacto después del mensaje. |
| Historial | Qué se le envió a cada contacto y cuándo. |
| Dashboard | Cuántos mensajes se enviaron y con qué resultado. |
| Chat, Comunidad | Soporte entre usuarios del producto sobre cómo usarlo. |
| Ajustes, Admin | Configuración de la cuenta y del plan contratado. |

**Riesgo conocido.** Chat y Comunidad son lo que un revisor puede leer como un
segundo producto metido dentro del primero. La defensa es que no son mensajería
general: solo conectan a usuarios de LeadSeed entre sí y su contenido es sobre
el uso de la herramienta. Si la revisión insiste, la respuesta no es discutir
sino mover esas dos secciones detrás de una opción desactivada por defecto.

---

## Descripción corta (132 caracteres máx.)

> Gestiona tus contactos comerciales y escríbeles por WhatsApp y correo desde
> el panel lateral, sin salir de la pestaña en la que estás.

## Descripción larga

> LeadSeed reúne en el panel lateral del navegador todo lo que necesitas para
> trabajar una cartera de contactos comerciales: quiénes son, en qué punto está
> cada conversación y qué le toca a cada uno hoy.
>
> **Contactos.** Importa tus contactos desde una planilla, organízalos en listas
> y muévelos por las etapas que tú definas. Cada ficha guarda el teléfono, el
> correo, la empresa y las notas que vayas tomando.
>
> **Mensajes.** Escribe plantillas con campos que se completan solos —el nombre
> de la persona, su empresa— y envíalas por WhatsApp o por correo. Puedes elegir
> si el nombre aparece completo, como nombre y apellido, o solo el primero.
>
> **Secuencias.** Arma una secuencia de mensajes con los días que quieras entre
> uno y otro, inscribe contactos y la extensión te dice cada día a quién le
> toca. Respeta el tope diario que configures, para que no envíes más de la
> cuenta.
>
> **Seguimiento.** Agenda reuniones, crea tareas y consulta el historial de lo
> que le enviaste a cada contacto.
>
> Tus datos se guardan en tu cuenta y solo tú los ves. LeadSeed no vende ni
> comparte información de tus contactos.

---

## Justificación de permisos

Cada uno se corresponde con código verificable. Entre paréntesis, en cuántos
lugares del código se usa.

### `sidePanel`
La extensión **es** un panel lateral: no tiene ventana emergente ni pestaña
propia. Sin este permiso no hay producto.

### `storage` (23 usos)
Guarda las preferencias de trabajo de la persona: qué columnas de la tabla ve,
si oculta los contactos sin nombre, en qué página del listado iba, el ancho del
panel. Nada de esto sale del navegador.

### `identity` (4 usos)
Inicio de sesión con Google y acceso a Google Calendar para agendar reuniones.
Se usa `chrome.identity.launchWebAuthFlow` con el flujo OAuth estándar; la
extensión nunca ve la contraseña de la persona.

### `alarms` (5 usos)
Los recordatorios de tareas y de reuniones agendadas tienen que dispararse
cuando corresponde aunque el panel esté cerrado. `setTimeout` no sobrevive a la
suspensión del *service worker*; `alarms` sí.

### `notifications` (3 usos)
Avisar de un recordatorio de tarea o de una reunión próxima. Solo se notifica lo
que la propia persona programó.

### `offscreen` (1 uso)
Reproducir el sonido de aviso de las notificaciones. Un *service worker* de
Manifest V3 no tiene acceso al DOM y por lo tanto no puede reproducir audio; el
documento fuera de pantalla es el mecanismo que Chrome ofrece para esto.

### `tabs` (15 usos)
Abrir la conversación de WhatsApp del contacto y volver al panel. Se usa para
localizar o crear la pestaña de WhatsApp y enfocarla. **No se lee el contenido
de las pestañas de la persona** ni se inyecta código en ellas: la extensión no
declara `scripting` ni ningún *content script*.

### `host_permissions`

| Origen | Para qué |
|---|---|
| `https://web.whatsapp.com/*` | Abrir la conversación del contacto al enviar por WhatsApp. |
| `https://wa.me/*` | El enlace corto de WhatsApp, para el mismo fin. |
| `https://api.emailjs.com/*` | Enviar los correos cuando la persona elige ese proveedor. |

---

## Divulgación de datos

Respuestas al formulario de la consola.

**¿Qué recoge la extensión?**

- *Información de identificación personal*: **sí**. Nombre, correo y teléfono de
  los contactos comerciales que la propia persona importa o crea, y su propio
  nombre y correo de la cuenta.
- *Información de salud, financiera, de autenticación, comunicaciones
  personales, ubicación, historial web, actividad del usuario, contenido de
  sitios web*: **no**.

**¿Se usa para el propósito único declarado?** Sí. Los datos de contacto existen
para poder escribirle a esos contactos; no hay otro uso.

**Declaraciones obligatorias** — las tres se pueden certificar:

- No se venden ni transfieren los datos a terceros, salvo para el caso de uso
  aprobado (enviar el mensaje que la persona redactó, por el canal que eligió).
- No se usan ni transfieren para fines ajenos al propósito único de la
  extensión.
- No se usan ni transfieren para determinar solvencia crediticia ni para
  concesión de préstamos.

**Dónde se guardan.** En Supabase, con aislamiento por fila (RLS): cada cuenta
solo puede leer y escribir sus propios contactos. Las 68 tablas tienen RLS
activo.

---

## Pendiente antes de enviar

Esto no se puede resolver desde el repositorio:

- [ ] **Política de privacidad en una URL pública.** El documento está escrito
      en `privacy.html`, en la raíz del repositorio. Hay que publicarlo (GitHub
      Pages sirve) y poner la URL en el formulario.
- [ ] **Capturas.** Mínimo una de 1280×800. Recomendado: cinco —el listado de
      contactos, la ficha de un contacto, el compositor de mensaje, una
      secuencia y el panel de hoy—. Más un mosaico promocional de 440×280.
- [ ] **Clave de firma nueva.** Ver la fase 0 del plan: la anterior quedó
      expuesta en el historial público del repositorio.
- [ ] **URL de retorno de OAuth.** Al cambiar la clave cambia el ID de la
      extensión, y hay que actualizar `https://<id-nuevo>.chromiumapp.org/` en
      la consola de Google Cloud, o el inicio de sesión con Google deja de
      funcionar.
