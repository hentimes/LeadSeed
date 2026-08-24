# Alta y login con correo: lo que hay que tocar en el panel de Supabase

El código y las migraciones ya están. Esto es lo que **no** se puede hacer desde el
repositorio, porque la configuración de Auth vive en la plataforma y no en la base
de datos: el `service_role` key no da acceso a estos ajustes, sólo el panel o la
Management API con un token personal.

Hasta que estos pasos estén hechos, **el flujo no funciona de punta a punta**.

## 1. Plantillas de correo (bloqueante)

`Authentication → Emails`, plantillas **Confirm signup** y **Reset password**.

Ambas usan `{{ .ConfirmationURL }}` por defecto, es decir mandan un enlace. Hay que
cambiarlas para que manden `{{ .Token }}`, el código numérico (hoy de ocho
dígitos; ver más abajo).

No es una preferencia estética. En una extensión no existe URL que un correo pueda
enlazar: `chrome-extension://` no es clicable desde el buzón, y el dominio de
`chrome.identity` sólo intercepta un flujo que la propia extensión abrió. Además
[`src/lib/supabaseClient.ts`](../../src/lib/supabaseClient.ts) arranca con
`detectSessionInUrl: false`, así que un enlace no haría nada aunque llegase.

Sugerencia de cuerpo:

```
Tu código para entrar en LeadSeed es:

{{ .Token }}

Caduca en 5 minutos. Si no fuiste tu, ignora este correo.
```

## 2. Política de contraseñas

`Authentication → Policies`.

| Ajuste | Valor | Por qué |
|---|---|---|
| Minimum password length | **10** | Estaba en 6. El código valida 10 en `src/utils/authValidation.ts`; si el servidor acepta menos, el desajuste no abre un agujero pero produce el peor síntoma posible: un formulario que rechaza lo que el backend aceptaría. |
| Password requirements | **Lowercase, uppercase, digits** | Sin símbolos a propósito: sin medidor de fuerza a la vista, exigirlos empuja a la contraseña-post-it. |
| Leaked password protection | **Activado** | Comprueba contra Have I Been Pwned por k-anonimato. Sólo existe en el panel, no en `config.toml`. |

## 3. Caducidad del código y frecuencia de envío

`Authentication → Providers → Email`.

- **OTP expiry: 300 segundos.** Estaba en 3600. Una hora es demasiado para un
  código numérico corto: Supabase limita los intentos **por IP, no por cuenta**,
  así que la ventana era el único freno real contra un atacante que rote
  direcciones.
- **Minimum interval between emails: 60 segundos.** Estaba en 1s, que no frena
  nada y permite quemar la cuota de SMTP. Los 60s son los que ya asume el
  contador del botón "Reenviar" en la interfaz.

## 4. CAPTCHA

`Authentication → Settings → Bot and Abuse Protection`. Activar **Turnstile**
(gratuito, y menos molesto que hCaptcha) sobre el alta y la solicitud de código.

Sin esto, el envío de correos es un endpoint público sin autenticar: se puede
usar para spamear buzones ajenos a tu costa y manchar la reputación de tu dominio.

## 5. SMTP propio

`Project Settings → Authentication → SMTP Settings`.

El SMTP por defecto de Supabase entrega unos pocos correos por hora y no está
pensado para producción. Con Resend, Postmark o similar, configurar además SPF,
DKIM y DMARC en el DNS del dominio; sin eso los códigos acaban en spam, que es
indistinguible de que el flujo esté roto.

## 6. URLs

`Authentication → URL Configuration`. `Site URL` y `Redirect URLs` apuntaban a
`http://127.0.0.1:3000`. Poner los dominios reales antes de publicar.

---

## Comprobado contra el servidor real

Se recorrio el flujo entero de recuperacion sin enviar correo, usando
`admin/generate_link`, con un usuario desechable que se borro despues. Salio bien
de punta a punta: el trigger rellena `full_name` desde los metadatos, `plan_id`
nace nulo y cae al onboarding, el RPC `current_user_auth_providers` devuelve
`["email"]` con un JWT real y **rechaza a `anon` con 401**, el codigo se canjea,
la contrasena cambia, la nueva funciona y la vieja deja de servir.

Esa prueba destapo un fallo que ningun test unitario podia ver: **produccion
emite codigos de OCHO digitos**, no de seis como declaraba `config.toml`. El
campo del formulario los recortaba a seis y la verificacion habria fallado
siempre. El cliente acepta ahora de 6 a 10 digitos y `otp_length` se puso en 8
para que coincida con la realidad.

## Prueba de humo que queda pendiente

El flujo ya se probo entero, pero con la configuracion ACTUAL de produccion.
`supabase/config.toml` quedó con `secure_password_change = true`, que exige sesión
reciente para cambiar la contraseña. El razonamiento es que la sesión que emite
`verifyOtp` es nueva y por tanto pasa la comprobación, pero **eso no está
verificado contra el servidor**: es lógica interna de GoTrue y no se puede
comprobar leyendo código ni consultando la base de datos.

Como esa bandera todavia no esta aplicada en produccion, la prueba de humo no la
ejercito. Hay que repetirla DESPUES de aplicar la configuracion: pedir código →
verificarlo → cambiar contraseña. Si `updateUser` devuelve un error de
reautenticación, poner `secure_password_change = false`. Es una
bandera aislada; revertirla no afecta a ninguna otra protección.

**NO uses `supabase config push`.** El `config.toml` no declara ningún bloque
`[auth.external.google]`, así que un push enviaría Google como desactivado y
**tumbaría el login que ya funciona**. El comando no tiene modo simulación. Si
algún día quieres usarlo, primero hay que declarar en el archivo todos los
proveedores externos con su estado real y sus secretos.

**Ojo con `config.toml`:** ese archivo tenía `enable_confirmations = false` (la
plantilla por defecto). En producción la confirmación ya estaba activa, pero un
`supabase config push` la habría desactivado, dejando entrar correos sin verificar
al chat y a la comunidad. Ya está corregido a `true`; no volver a bajarlo.

## Lo que sí quedó hecho

- Migraciones 110 a 113, aplicadas en producción: `is_current_user_confirmed()` y
  diez políticas de escritura que ahora exigen correo confirmado, más el RPC
  `current_user_auth_providers()`.
- Toda la capa de código: repositorio, servicio, hook, componentes y la pantalla.
- `supabase/config.toml` alineado con lo que hay que poner en el panel.

## Deuda conocida

Supabase no limita los intentos de código **por cuenta**, sólo por IP. Un atacante
que rote direcciones no tiene techo real. Se mitigó bajando la caducidad a cinco
minutos y con Turnstile, y se decidió aplazar la solución completa: una Edge
Function que envuelva `verifyOtp` y cuente fallos por correo con bloqueo temporal.
Revisar si aparece abuso.
