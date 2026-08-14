# Contexto operativo: landing-gerow y Cloudflare

Version: 2.0
Fecha de verificacion: 2026-08-12
Estado: vigente

> **Por que existe la version 2.0.** La version anterior (2026-07-16) describia un mundo que ya no
> existia: daba a `ppforms` como el motor del formulario, con D1, R2, cron, Google Calendar y panel
> admin dentro. La auditoria del `2026-08-11` la encontro **desactualizada en nueve puntos
> verificables**, y el protocolo seccion 7 declara este archivo de lectura obligatoria antes de tocar
> la integracion. Un documento obligatorio y falso es peor que no tenerlo: planificar una migracion
> desde un mapa equivocado es como se cometen errores caros.
>
> Todo lo que sigue se verifico contra `origin/master` de `landing-gerow` y contra los servicios
> desplegados, no contra la memoria ni contra la version previa.

---

## 1. Que es cada cosa hoy

| Pieza | Que hace | Estado |
|---|---|---|
| Cloudflare Pages, proyecto `planespro` | sirve todo `planespro.cl` | activo, conectado a GitHub |
| Worker `ppforms` | **solo responde `/health`** | vaciado, sin bindings |
| Worker `ppusers` | admin heredado, y **conserva la base de leads legacy** | activo, es el nudo pendiente |
| Worker `ppcrm` | CRM heredado en `admin.planespro.cl/crm` | activo, sin migrar |
| Workers `ppblog` y `ppnews` | blog y noticias, con su D1 y R2 | activos, fuera de alcance |
| Worker `pp-www-redirect` | redireccion de `www` | activo, trivial |
| Worker `ppcrm-staging` | **sin documentar** | inventariar antes de dar por cerrado el retiro |

Supabase es la fuente de verdad de leads, agenda, adjuntos y disponibilidad. Cloudflare quedo como
hosting estatico, CDN, DNS y WAF, que es el uso correcto y **no se va a retirar**.

---

## 2. Correcciones a la version anterior

Las nueve afirmaciones falsas que traia la 1.0, con lo verificado hoy:

| Decia | Realidad |
|---|---|
| `ppforms` resuelve disponibilidad, leads, PDF, Calendar, correos y panel admin | `cloudflare/ppforms/src/index.js` solo expone `/health`. Sin logica de negocio. |
| ruta publica `POST /api/form/appointments` | no existe |
| rutas admin dentro de `ppforms` | no existen |
| modulos internos `advisor-domain`, `calendar-domain`, `leads-domain` | no existen |
| binding D1 `FORM_DB` en `ppforms` | `ppforms/wrangler.toml` **no tiene ningun binding**. El real se llama `FORMS_DB` y esta en `ppusers`. |
| binding R2 `FORM_UPLOADS` en `ppforms` | el real es `FORMS_UPLOADS`, tambien en `ppusers` |
| cron cada 15 minutos en `ppforms` | no tiene `[triggers]`. El unico cron del proyecto es el de `ppnews`. |
| `wrangler.toml` con correos, origins, Google client id, D1, R2 y cron | tiene tres lineas y ningun `[vars]` |
| "el siguiente paso no es tocar el frontend" | los pasos 1 a 4 de esa secuencia ya se ejecutaron |

---

## 3. Donde viven realmente los formularios

**Este punto se corrigio el `2026-08-12` y contradice lo que se venia asumiendo, incluido en el
propio roadmap de LeadSeed.**

En `origin/master`, que es la rama desde la que Cloudflare Pages despliega produccion:

```
pb/index.html  pb/app.js  pb/styles.css  pb/partials/
form/index.html  form/app.js  form/styles.css
frontend/lead-capture/          <- fuente que construye el sidebar y pb
functions/pb/[[slug]].js        <- enrutado de /pb/<ref>
functions/form/[[slug]].js
functions/retiro-tecnico-extranjero/[[slug]].js
```

**La carpeta `forms/` NO existe en `origin/master`.** Existe solo en la rama de trabajo
`fix/agenda-url-bug`, sin mergear. `AI_SYNC.md` registro esa reorganizacion como hecha el
`2026-08-03`, y es cierto que se hizo, pero nunca llego a la rama desplegada.

Actualizacion del `2026-08-14`: **el bloque 4 se cerro y los formularios NO se mueven a LeadSeed.**
Un proyecto Pages se conecta a un repositorio, hay uno solo y esta conectado a `landing-gerow`, asi
que trasladar el codigo sin el deploy crearia otra doble fuente de verdad. El reparto de propiedad
queda: LeadSeed posee las Edge Functions y el SQL; este repo posee los formularios y el sitio. Ver
roadmap 13.5.

Lo que sigue siendo cierto de este apartado es donde vive cada cosa: la fuente real es `pb/`, `form/`
y `frontend/lead-capture/`, **no `forms/`.** Tomar `forms/` seria portar una version que produccion no
usa.

### El enrutado de los short links no es un archivo estatico

`planespro.cl/pb/<code>` no corresponde a ningun fichero. Lo resuelve la Pages Function
`functions/pb/[[slug]].js`, que sirve el contenido de la carpeta base conservando la URL. Esto
importa por dos motivos:

- migrar los formularios sin migrar las Functions deja **todos los short links en 404**
- la Function debe pedir la carpeta base y **no** `index.html`: pedir `index.html` vuelve a pasar por
  `_redirects`, dispara la regla `/pb/index.html -> /pb/ 301` y el redirect borra el ref de la URL

Ese segundo punto no es teorico: ocurrio en produccion y se corrigio el `2026-08-12` (ver capitulo
13.4.d del roadmap). Estuvo perdiendo atribucion de asesor.

---

## 4. Contrato publico vigente

Todos los formularios resuelven la base de API desde
`<meta name="planespro-form-api-base" content="https://form.planespro.cl/api">`. Ninguno llama a
Supabase directamente, porque la CSP de `_headers` no incluye `*.supabase.co`.

| Ruta publica | Destino real |
|---|---|
| `POST /api/form/leads` | Edge Function `form-leads` |
| `POST /api/form/leads/abandoned` | `form-lead-abandoned` |
| `GET /api/public/availability` | `form-public-availability` |
| `POST /api/form/progress` | `form-progress` |

`form-lead-file` existe pero **no tiene ruta publica**: solo la consume la extension.

### Canales

Son **cuatro**, no dos como decia la version anterior: `general`, `pb`, `retiro` y `form`.

Deuda conocida: `resolve_planespro_booking_context` solo acepta `pb`, `general` y `retiro`. Un lead
de `/form/` sin ref valido cae silenciosamente como `general`.

---

## 5. Edge Functions: dueño unico desde el 2026-08-12

Las doce Edge Functions tienen su source en **LeadSeed**, y `landing-gerow` ya no tiene carpeta
`supabase/`. Se le agrego un check de CI que falla si reaparece.

Antes del cierre hubo dos incidentes por propiedad compartida, y conviene recordarlos porque
explican la regla:

- `form-leads` llego a existir divergente en ambos repos, 584 lineas contra 690. Desplegar la de
  LeadSeed habria creado un lead duplicado por cada envio en `/form/` y `/retiro/`.
- `form-progress` estuvo desplegada desde un arbol de trabajo sin commitear, asi que el codigo en
  produccion era mas nuevo que el commiteado en su propio repo.

**Regla operativa:** ante cualquier duda sobre que version es la buena, la respuesta es
`supabase functions download`, no el git de ninguno de los dos repos. Comprobar siempre con
`npm run check:functions` antes de desplegar.

---

## 5.b El arbol de trabajo de landing-gerow, y que se rescato (`2026-08-14`)

Ese repositorio tiene **1368 archivos sin commitear**, 26 worktrees y esta parado en la rama
`fix/agenda-url-bug`, no en `master`. De esos 1368, **1167 son de `biblioteca/`** y no tienen nada
que ver con LeadSeed.

Lo que si nos toca estaba sin respaldo y se rescato.

### Que habia sin commitear, de lo nuestro

El arbol contenia **la reorganizacion de los formularios a `forms/`, a medio hacer**:

- `functions/pb/[[slug]].js` y `functions/form/[[slug]].js` reescritas para mapear `/pb/*` a
  `/forms/pb/*`
- `pb/index.html`, `pb/styles.css` y `pb/partials/*` **borrados** del arbol
- `forms/retiro-v2/`, 61 archivos sin trackear
- `frontend/lead-capture/js/app.js` con mas de mil lineas nuevas

En total **74 archivos y 6923 inserciones** que no estaban en ningun commit de ninguna rama. Un
`git checkout .` se habria llevado la parte trackeada sin dejar rastro.

### Donde esta ahora

Rama `wip/rescate-arbol-sucio-2026-08-14`, publicada en el remoto.

Se construyo con `git stash create` mas un indice temporal para los archivos sin trackear, **sin
tocar el arbol de trabajo**: sigue con sus 1368 archivos exactamente como estaba, y con cero
archivos en stage. El rescate es una copia, no una intervencion.

### Lo que NO se hizo, y por que

**No se limpio el arbol.** Con 1368 archivos sin commitear y trabajo ajeno en curso, borrar o
commitear ahi no es ordenar, es arriesgar. El rescate quita la urgencia: ya no hay nada que se pueda
perder por accidente.

**Esa rama no se despliega.** Las Functions rescatadas ya apuntan a `/forms/pb/`, pero esa carpeta
no esta completa ni desplegada: subir eso a `master` dejaria `/pb/` en 404.

### Un dato que cierra una duda vieja

La copia sin commitear de `supabase/functions/form-progress/index.ts` se comparo linea a linea contra
la de LeadSeed: **el codigo es identico**. La de LeadSeed tiene ademas 26 lineas de cabecera que
explican su procedencia. Es decir, el rescate confirma que no se perdio nada al adoptar la version
descargada de produccion, que era la duda que quedaba abierta desde el `2026-08-12`.

## 6. Lo que sigue pendiente, por orden de importancia

1. **`ppusers` conserva `FORMS_DB` (D1 `ppforms_db`) y `FORMS_UPLOADS` (R2 `ppforms-uploads`).**
   Mientras siga asi hay **dos fuentes de verdad de leads**, que es lo que la regla 16.2 del
   protocolo prohibe expresamente. Es el nudo real del retiro, no `ppforms`.
2. **La rama `fix/reconcile-ppforms-retirement-with-tracking` sigue sin mergear.** Contiene el
   formulario de retiro y el tracking. Ya provoco una regresion cuando un deploy desde `master` la
   ignoro.
3. **La CSP de `_headers` no incluye `*.supabase.co`**, asi que los formularios no pueden saltarse el
   proxy aunque se quiera.
4. **`ppcrm-staging` sin inventariar.**
5. `ppcrm` sin migrar.

---

## 7. Como se despliega cada cosa

| Que | Como | Cuidado |
|---|---|---|
| Sitio y formularios | push a `master` de `landing-gerow` | **dispara deploy automatico de todo planespro.cl** |
| Edge Functions | `supabase functions deploy <slug>` desde **LeadSeed** | comprobar `verify_jwt` en `supabase/config.toml` |
| Migraciones SQL | desde LeadSeed | ambos repos comparten `schema_migrations` |

Aviso practico, aprendido el `2026-08-12`: el arbol de trabajo de `landing-gerow` suele tener mas de
mil archivos sin commitear y varios worktrees activos. Para intervenir sin arriesgar trabajo ajeno,
crear un `git worktree` desde `origin/master`, hacer el cambio ahi y empujar. Se hizo asi dos veces
ese dia y funciono.

---

## 8. Lo que sigue vigente de la version 1.0

- La meta arquitectonica: Supabase como fuente de verdad, Cloudflare como capa de entrega.
- El riesgo principal identificado entonces, "dos fuentes de verdad", que efectivamente se
  materializo con `ppusers`.
- El contrato de rutas publicas a preservar mientras el frontend siga apuntando al dominio branded.
