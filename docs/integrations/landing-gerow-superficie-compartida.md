# Superficie compartida con landing-gerow: que usa LeadSeed y que no se puede tocar

Version: 1.0
Fecha de verificacion: 2026-08-15
Destinatario: quien haga limpieza en el repositorio `landing-gerow`
Metodo: todo lo que sigue se verifico contra `origin/master` de `landing-gerow`, contra el proyecto
Supabase real y contra `planespro.cl` en produccion. Nada sale de memoria ni de documentacion previa.

---

## 0. Lo primero, porque puede tirar abajo la captura de leads hoy mismo

**El Worker `ppforms` que corre en produccion NO es el codigo que hay en `origin/master`.**

| | En `origin/master` | En produccion |
|---|---|---|
| `cloudflare/ppforms/src/index.js` | stub retirado, devuelve `410` en todo | proxy activo hacia Supabase |
| `GET form.planespro.cl/health` | diria `"status":"retired"` | `{"ok":true,"service":"ppforms","status":"ok","backend":"supabase-proxy"}` |
| Ultimo commit que lo toco | `742afa665`, **2026-07-26** | codigo de `31c0dd982`, **2026-08-05** |

Comprobado en vivo el `2026-08-15`:

```
GET https://form.planespro.cl/health
{"ok":true,"service":"ppforms","status":"ok","backend":"supabase-proxy",
 "message":"Borde publico activo. El worker solo proxya rutas del formulario hacia Supabase."}
```

`form.planespro.cl` es **el unico camino por el que entran los leads publicos**. Los formularios no
llaman a Supabase directamente: la CSP del propio sitio se lo impide.

### Que pasa si se despliega ppforms desde `origin/master`

```
cd cloudflare/ppforms && wrangler deploy      # <-- NO
```

Eso sustituye el proxy vivo por el stub `410` y **toda la captura publica de leads deja de
funcionar**: `/pb`, `/form`, `/retiro-tecnico-extranjero` y el formulario de la home. Sin error
visible en el sitio: el formulario parecera enviar y el lead no existira.

### Y hay una trampa adicional

`tests/ppforms-public-submit-supabase-boundary-smoke.mjs` **exige que ppforms sea el stub retirado**:

```js
assert.match(indexSource, /status:\s*"retired"/, "ppforms debe declararse como superficie legacy retirada");
assert.match(indexSource, /410,\s*cors\s*\)/, "ppforms debe devolver 410 fuera de health");
```

Ese test esta dentro de `tests/run-lead-capture-smoke-suite.mjs` → `npm run smoke:lead-capture` →
`npm run smoke:gate` → `predeploy:pages:prod`. Es decir: **la puerta de despliegue del sitio defiende
activamente un estado que contradice a produccion.** Quien intente arreglar el repo para que refleje
la realidad, rompera el gate; quien haga caso al gate y despliegue, rompera produccion.

No esta roto hoy por una sola razon: Pages despliega el **sitio**, y el Worker `ppforms` se despliega
aparte con `wrangler deploy`, cosa que nadie ha hecho desde el 5 de agosto.

### La fuente buena no esta perdida

El proxy vive en cuatro ramas, una de ellas en el remoto:

- `origin/wip/rescate-arbol-sucio-2026-08-14`
- `master` (local), `codex/seo-clicmed-aeo`, `fix/agenda-url-bug`

Archivos: `cloudflare/ppforms/src/index.js` y `cloudflare/ppforms/src/supabase-public-proxy.js`
en el commit `31c0dd982`.

### Donde esta cada version, para no perderse

| Sitio | Que tiene |
|---|---|
| `origin/master` | stub `410` |
| arbol de trabajo actual de `landing-gerow` | **el proxy** (borra los 14 modulos viejos, añade `supabase-public-proxy.js`) |
| produccion | el proxy |

Es decir: quien mire la carpeta en su copia local **vera el proxy y creera que el repo esta bien**.
La discrepancia solo aparece comparando contra `origin/master`, que es lo que se despliega.

Hay ademas un archivo sin trackear, `cloudflare/ppforms/src/supabase-availability-proxy.js`, que
**nadie importa**. Es seguro borrarlo; no forma parte del worker vivo (comprobado: el unico import de
`index.js` es `./supabase-public-proxy.js`).

**Recomendacion:** antes de tocar nada de `cloudflare/ppforms`, decidir cual de los dos estados es el
bueno y alinear repo, test y produccion en el mismo movimiento. No dejarlo a medias.

---

## 1. Mapa de propiedad

Acordado el `2026-08-12` tras dos incidentes por propiedad compartida. Ambos repos usan **el mismo
proyecto Supabase** (`pfoikdneixbvpozbtqcx`, `leadseed-crm`).

| Pieza | Dueño | Nota |
|---|---|---|
| Edge Functions (las 12) | **LeadSeed** | `landing-gerow` no debe tener carpeta `supabase/` |
| Migraciones SQL / esquema | **LeadSeed** | idem |
| Formularios publicos y sitio | **landing-gerow** | `pb/`, `form/`, `retiro-*`, `frontend/lead-capture/` |
| Worker `ppforms` (el borde `/api`) | **landing-gerow** | pero su contrato lo consume LeadSeed |
| Pages Functions de enrutado | **landing-gerow** | `functions/pb`, `functions/form`, `functions/retiro-*` |

Ya existe un guardarrail: `.github/workflows/no-supabase-functions.yml` falla si reaparece
`supabase/` en `landing-gerow`. **No eliminar ese workflow.**

---

## 2. Lo que NO se puede tocar sin coordinar con LeadSeed

### 2.1 El Worker del borde publico

```
cloudflare/ppforms/src/index.js
cloudflare/ppforms/src/supabase-public-proxy.js   (solo en las ramas con el proxy)
cloudflare/ppforms/wrangler.toml
```

Variables de entorno que el proxy necesita en Cloudflare. **Borrarlas rompe la captura aunque el
codigo este bien:**

- `SUPABASE_FUNCTIONS_BASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLIC_AVAILABILITY_ENABLED` (opcional, por defecto `true`)

Rutas que proxya, y a que Edge Function de LeadSeed llega cada una:

| Ruta publica | Edge Function | Metodo |
|---|---|---|
| `/api/form/leads` | `form-leads` | POST |
| `/api/form/leads/abandoned` | `form-lead-abandoned` | POST |
| `/api/form/progress` | `form-progress` | POST |
| `/api/public/availability` | `form-public-availability` | GET |

`form-lead-file` no tiene ruta publica: solo lo consume la extension LeadSeed.

### 2.2 Las tres Pages Functions de enrutado

```
functions/pb/[[slug]].js
functions/form/[[slug]].js
functions/retiro-tecnico-extranjero/[[slug]].js
```

Resuelven `planespro.cl/pb/<ref>` sin que exista ningun archivo con ese nombre. **Sin ellas, todos
los short links de asesor devuelven 404** y se pierde la atribucion comercial.

Detalle que ya costo una regresion de nueve dias (3 al 12 de agosto): la Function debe pedir **la
carpeta base**, no `index.html`.

```js
return serveAsset(context, pbBase);            // correcto
return serveAsset(context, `${pbBase}index.html`);  // rompe: dispara /pb/index.html -> /pb/ 301
```

Pedir `index.html` vuelve a pasar por `_redirects`, dispara la regla `301` y el redirect **borra el
ref de la URL**. No es teorico: paso, y esta documentado en el roadmap de LeadSeed 13.4.d.

### 2.3 `_routes.json`

```json
{ "version": 1, "include": ["/api/*", "/pb*", "/form*", "/retiro-tecnico-extranjero*"], "exclude": [] }
```

Si se quitan esas entradas, las Pages Functions dejan de invocarse y las rutas caen a estatico.

### 2.4 `_redirects`, las reglas de los formularios

```
/pb/styles.css /pb/styles.css 200
/pb/app.js /pb/app.js 200
/pb/partials/* /pb/partials/:splat 200
/pb /pb/ 301
/pb/index.html /pb/ 301
/retiro-tecnico-extranjero /retiro-tecnico-extranjero/ 301
/retiro-tecnico-extranjero/index.html /retiro-tecnico-extranjero/ 301
/retiro-tecnico-extranjero/* /retiro-tecnico-extranjero/index.html 200
```

Las tres primeras existen para que los assets no los capture el comodin del short link. Quitarlas
deja el formulario sin CSS ni JS.

### 2.5 `_headers`, la politica de seguridad

Dos directivas deben conservar `https://form.planespro.cl`:

```
connect-src 'self' ... https://form.planespro.cl;
form-action 'self' https://form.planespro.cl;
```

Sin `connect-src`, el navegador bloquea el envio del formulario. Sin `form-action`, bloquea el POST.

Nota para el futuro: **no hace falta añadir `*.supabase.co`.** Solo tendria sentido el dia que se
decida que los formularios llamen a Supabase sin pasar por el proxy, y esa decision no esta tomada.
Abrirlo antes amplia la superficie sin ganar nada.

### 2.6 Las rutas publicas, que estan escritas en la base de datos

La tabla `form_types` de Supabase guarda las URL como plantilla. Cambiar una ruta en el sitio rompe
los links que LeadSeed genera:

| slug | url_template | activo |
|---|---|---|
| `pb` | `https://planespro.cl/pb/{ref}` | si |
| `form` | `https://planespro.cl/form/{ref}` | si |
| `retiro` | `https://planespro.cl/retiro-tecnico-extranjero/{ref}/` | si |

Hay **7 capture links activos** repartidos en esos tres tipos. Si una ruta cambia, hay que cambiarla
tambien en `form_types`, y eso es un cambio en LeadSeed.

### 2.7 Los origenes permitidos

Las cinco Edge Functions publicas comparten esta lista, verificada en el codigo:

```
https://planespro.cl
https://www.planespro.cl
https://form.planespro.cl
```

Retirar el subdominio `www` o `form` de DNS rompe la captura desde ese origen.

---

## 3. Que se puede tocar con cuidado

### 3.1 Los formularios son codigo generado, no fuente

`frontend/lead-capture/build.js` genera:

| Salida | Desde |
|---|---|
| `pb/` (index.html, app.js, styles.css, partials/) | `frontend/lead-capture/{html,js,css}` |
| `public/assets/lead-capture/` | idem |
| `js/` y `css/` (copias legacy) | idem |

**Editar `pb/app.js` a mano se pierde en el siguiente `npm run build:lead-capture`.** La fuente es
`frontend/lead-capture/`.

`form/` y `retiro-tecnico-extranjero/` no salen de ese build y se mantienen a mano.

### 3.2 El payload que espera la Edge Function

Se pueden reordenar campos y cambiar el HTML libremente, pero **estos nombres son contrato**. La
funcion acepta alias en español e ingles:

- identidad: `name`/`nombre`, `phone`/`telefono`, `email`/`correo`, `company`/`empresa`, `rut`
- texto: `notes`/`comentarios`/`comentario`/`message`/`mensaje`
- atribucion: `capture_ref`/`ref`, `first_touch_ref`, `advisor_id`
- contexto: `source_channel`, `source_form_variant`, `source_hostname`, `source_path`, `source_url`
- agenda: `contacto_preferencia`/`contact_preference`, `cita_fecha_hora`, `cita_estado`
- campaña: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

**Protocolo de dos fases**, vigente en `/form` y `/retiro-tecnico-extranjero` desde el 3 de agosto.
Si se tocan estos campos se rompe la idempotencia y se duplican leads:

| Campo | Regla |
|---|---|
| `submission_id` | UUID v4, validado por expresion regular en el RPC |
| `update_token` | entre 32 y 128 caracteres; en fase 2 debe coincidir con el de fase 1 |
| `action_only` | `'1'` marca la fase 2 |

La idempotencia se apoya en un indice unico de la base (`leads_form_submission_id_uidx`) mas un
`advisory lock`. Dos envios simultaneos no pueden crear dos leads, **siempre que el formulario mande
el mismo `submission_id`**.

### 3.3 Los formularios suben archivos

`pb`, `form` y `retiro` envian `FormData`. Los adjuntos acaban en el bucket de Supabase
`planespro-form-uploads`, privado, que la extension lee via `form-lead-file`. Cambiar el nombre del
campo de archivo rompe esa cadena.

---

## 4. Que si es libre

Nada de esto lo consume LeadSeed. Verificado por busqueda directa:

- todo el sitio de contenido: `blog/`, `noticias/`, `biblioteca/`, `faq/`, `nosotros/`, `farmacias/`,
  `centros-salud/`, `ebook/`, `consultar-codigo-licencia-medica/`
- `functions/api/chat.js`, `functions/api/farmacias.js`, `functions/api/client-error.js`,
  `functions/api/health.js`
- los Workers `ppblog`, `ppnews`, `www-redirect`
- `cloudflare/ppcrm` y `cloudflare/ppusers`: **no tocan Supabase**. Su unica mencion es un mensaje de
  texto que dice que el backend se migro. Usan sus propias bases D1.

### Codigo muerto que se puede retirar, con una condicion

`cloudflare/ppforms/src/` tiene 14 modulos (`leads-domain.js`, `request-routing.js`,
`runtime-composition.js`, `capture-links-domain.js`, `notifications-domain.js`...) que **el
`index.js` de `origin/master` no importa**. Son el runtime viejo, anterior a la migracion a Supabase.

Condicion: resolver antes el punto 0. Si se decide que produccion debe correr el proxy, hay que
comprobar cuales de esos modulos usa `supabase-public-proxy.js` antes de borrarlos.

---

## 5. Checklist para el que limpia

Antes de tocar `cloudflare/ppforms`, `functions/`, `_redirects`, `_routes.json` o `_headers`:

- [ ] Leer el punto 0 entero
- [ ] `curl https://form.planespro.cl/health` — si dice `"backend":"supabase-proxy"`, produccion corre
      el proxy y **no** lo que hay en `origin/master`
- [ ] No ejecutar `wrangler deploy` dentro de `cloudflare/ppforms/` sin confirmar que version se sube
- [ ] No borrar `.github/workflows/no-supabase-functions.yml`
- [ ] No crear una carpeta `supabase/` en este repo

Despues de cualquier cambio en el sitio, comprobar que las siete rutas siguen en `200` **sin
redirect**:

```bash
for u in /pb/ /pb/58a2k6 /form/ /form/58a2k6 \
         /retiro-tecnico-extranjero/ /retiro-tecnico-extranjero/3fn2er /api/health; do
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $u\n" "https://planespro.cl$u"
done
```

Un `301` en cualquiera de las que llevan `ref` significa que la regresion de atribucion volvio.

Y que el borde publico responde:

```bash
curl -s https://form.planespro.cl/health
curl -s "https://form.planespro.cl/api/public/availability" | head -c 120   # debe decir "source":"supabase"
```

---

## 6. Deuda conocida, para que no se confunda con un error nuevo

- **El proxy no reenvia el header `Origin` al upstream.** La allowlist CORS de las Edge Functions ve
  la peticion sin origen y cae al valor por defecto. El Worker, ademas, refleja cualquier `Origin`
  que le manden. Esta anotado en el roadmap de LeadSeed como 13.4.b; no es urgente porque la
  autorizacion real no depende de CORS, pero conviene no "arreglarlo" a medias.
- **El canal `general` no atribuye a ningun asesor, y nunca lo ha hecho.** 78 leads, cero con link de
  captura, antes y despues de la regresion de agosto. `pb` atribuye el 84% y `retiro` el 100%. Puede
  que sea el diseño correcto, porque `/form` es el formulario general; esta pendiente de decidir en
  LeadSeed. **No es un bug del sitio ni hay que arreglarlo desde este lado.**
- **`cloudflare/ppforms` conserva rutas `/api/admin/*` en `request-routing.js`** que ya no sirve
  nadie. Son del CRM viejo, no de LeadSeed.

---

## 7. Resumen en una linea

De todo `landing-gerow`, LeadSeed depende de **cinco cosas**: el Worker `ppforms` que proxya
`/api` hacia Supabase, las tres Pages Functions que conservan el `ref` en la URL, `_routes.json`,
las reglas de `/pb` y `/retiro` en `_redirects`, y `form.planespro.cl` en `connect-src` y
`form-action` de `_headers`. Todo lo demas del repositorio es libre.

La primera de las cinco esta ahora mismo desincronizada entre git y produccion, y es lo unico de
este informe que hay que resolver antes de empezar a limpiar.
