# Alta y login con correo: estado de la configuración de Auth

El código y las migraciones están hechos. Este documento dice qué quedó aplicado
en el proyecto de producción y qué falta, con el porqué de cada cosa.

La configuración de Auth **no vive en la base de datos**: ni el `service_role` key
ni la contraseña de Postgres llegan a ella. Se toca por el panel o por la
Management API con un token personal `sbp_...` de la cuenta.

---

## Lo que queda pendiente

### 1. Apuntar el SMTP del Auth a Resend

**No hay que contratar nada.** El proyecto ya envía por Resend, con el dominio
`planespro.cl` verificado: lo usan los avisos de citas y los canales de correo de
los usuarios (`supabase/functions/_shared/emailChannels.ts`). Sólo falta que el
Auth mire al mismo sitio.

`Project Settings → Authentication → SMTP Settings`:

| Campo | Valor |
|---|---|
| Sender email | `notificaciones@planespro.cl` |
| Sender name | `LeadSeed` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | una API key de Resend con permiso de envío |

Conviene una key nueva y de sólo envío para esto, en vez de reutilizar la del
resto del proyecto: si algo pasa se revoca sin tocar los correos de citas.

Esto importa por dos razones encadenadas. El correo por defecto de Supabase
entrega unos pocos mensajes por hora, y **mientras se use, Supabase no deja
modificar las plantillas**: la Management API responde *"Email template
modification is not available for free tier projects using the default email
provider"*. Es decir, este paso desbloquea el siguiente.

### 2. Plantillas de correo — después del SMTP

`Authentication → Emails`, plantillas **Confirm signup** y **Reset password**.

Hoy las dos usan `{{ .ConfirmationURL }}`, o sea mandan un enlace. Tienen que
mandar `{{ .Token }}`, el código numérico.

No es estética. En una extensión no existe URL que un correo pueda enlazar:
`chrome-extension://` no es clicable desde el buzón, y el dominio de
`chrome.identity` sólo intercepta un flujo que la propia extensión abrió. Además
[`src/lib/supabaseClient.ts`](../../src/lib/supabaseClient.ts) arranca con
`detectSessionInUrl: false`, así que un enlace no haría nada aunque llegase.

El contenido está listo para copiar y pegar:

- [`supabase/templates/confirmacion.html`](../../supabase/templates/confirmacion.html)
  — asunto sugerido: *Tu codigo para confirmar la cuenta*
- [`supabase/templates/recuperacion.html`](../../supabase/templates/recuperacion.html)
  — asunto sugerido: *Tu codigo para cambiar la contrasena*

### 3. Protección de contraseñas filtradas — requiere plan Pro

`password_hibp_enabled` comprueba contra Have I Been Pwned por k-anonimato.
La Management API lo rechaza en el plan actual: *"available on Pro Plans and up"*.
Queda pendiente de que el proyecto suba de plan.

### 4. CAPTCHA — requiere una clave de Cloudflare

`Authentication → Settings → Bot and Abuse Protection`, proveedor **Turnstile**.
Hace falta crear el widget en Cloudflare y traer su *secret key*; con eso se
activa en un minuto.

Sin CAPTCHA, el envío de códigos es un endpoint público sin autenticar: se puede
usar para spamear buzones ajenos a costa del proyecto y manchar la reputación del
dominio.

---

## Lo que quedó aplicado

Por la Management API, con PATCH quirúrgicos que sólo tocaron los campos
nombrados. Verificado leyendo la configuración después.

| Ajuste | Antes | Ahora | Por qué |
|---|---|---|---|
| `mailer_otp_exp` | 3600 | **300** | Una hora era demasiado. Supabase limita los intentos **por IP, no por cuenta**, así que la caducidad era el único freno real contra quien rote direcciones. |
| `password_min_length` | 6 | **10** | 6 es indefendible para una cuenta que da acceso a leads, chat y comunidad. |
| `password_required_characters` | ninguno | **minúscula + mayúscula + dígito** | Sin símbolos a propósito: sin medidor de fuerza a la vista, exigirlos empuja a la contraseña-post-it. |
| `security_update_password_require_reauthentication` | false | **true** | Exige sesión reciente para cambiar la contraseña. Corta el cambio desde una sesión robada y vieja. |

Migraciones 110 a 113, aplicadas: `is_current_user_confirmed()` y diez políticas
de escritura de contenido visible por terceros —chat, comunidad, mensajes
directos, adjuntos, reportes y edición de posts— que ahora exigen correo
confirmado. Más el RPC `current_user_auth_providers()`, que lee `auth.uid()` en
vez de aceptar un correo, para no ser un oráculo de enumeración.

## Lo que NO se tocó, y conviene que siga así

- **`site_url`** ya apuntaba a `https://blphejkibijeolonnebffpclhlghofnn.chromiumapp.org`,
  el redirect de la extensión. El `127.0.0.1:3000` que aparece en `config.toml` es
  la plantilla por defecto, no el estado real.
- **`mailer_otp_length` sigue en 8.** Ver más abajo.
- **`external_google_enabled` sigue en `true`.**

---

## Comprobado contra el servidor real

Se recorrió el flujo entero de recuperación sin enviar ningún correo, usando
`admin/generate_link` con un usuario desechable que se borró después. Diez pasos,
todos correctos: el trigger rellena `full_name` desde los metadatos, `plan_id`
nace nulo y cae al onboarding, el RPC devuelve `["email"]` con un JWT real y
**rechaza a `anon` con 401**, el código se canjea, la contraseña cambia, la nueva
funciona y la vieja deja de servir.

Se repitió **después** de activar `security_update_password_require_reauthentication`,
que era el riesgo que quedaba sin verificar: `updateUser` acepta el cambio con la
sesión que emite `verifyOtp`, porque es un login recién hecho. La bandera es
segura y se queda activada.

Esa prueba destapó además un fallo que ningún test unitario podía ver:
**el proyecto emite códigos de OCHO dígitos** (`mailer_otp_length: 8`), no de seis
como declaraba `config.toml`. El campo del formulario los recortaba a seis y la
verificación habría fallado siempre; los tests no lo notaban porque todos usaban
un `'123456'` inventado, que casaba con la suposición equivocada en vez de con el
servidor. El cliente acepta ahora de 6 a 10 dígitos, así que no se rompe si algún
día se cambia el ajuste.

---

## Avisos

**NO uses `supabase config push`.** El `config.toml` no declara ningún bloque
`[auth.external.google]`, así que un push enviaría Google como desactivado y
**tumbaría el login que ya funciona**. Tampoco tiene modo simulación. Si algún día
quieres usarlo, primero hay que declarar en el archivo todos los proveedores
externos con su estado real y sus secretos, y revisar `site_url`, que en el
archivo sigue apuntando a localhost.

**`enable_confirmations`** estaba en `false` en `config.toml` por ser la plantilla
por defecto. En producción la confirmación ya estaba activa (`mailer_autoconfirm:
false`), pero un push la habría desactivado, dejando entrar correos sin verificar
al chat y a la comunidad. Ya está corregido a `true` en el archivo; no volver a
bajarlo.

## Deuda conocida

Supabase no limita los intentos de código **por cuenta**, sólo por IP. Quien rote
direcciones no tiene techo real. Se mitigó bajando la caducidad a cinco minutos, y
se decidió aplazar la solución completa: una Edge Function que envuelva
`verifyOtp` y cuente fallos por correo con bloqueo temporal. Revisar si aparece
abuso. El CAPTCHA del punto 4 cubre la otra mitad del problema, el envío masivo.
