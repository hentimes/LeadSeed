# Regresión en producción: el formulario de retiro volvió seis días atrás

Fecha: 2026-08-16
Para: quien esté trabajando en `landing-gerow`
Estado: **abierto**, producción sirve la versión equivocada ahora mismo
Método: todo lo de abajo está verificado contra `planespro.cl` en vivo y contra los objetos de git,
no contra recuerdos ni documentación.

---

## Antes de nada: no hay que reconstruir el formulario

El formulario correcto **existe, está completo y está intacto** en `origin/master`, en
`retiro-tecnico-extranjero/`. Es el que estuvo en producción hasta el despliegue de ayer, el que
respondía en <https://planespro.cl/retiro-tecnico-extranjero/3fn2er/>.

No hay que rehacerlo, ni recomponerlo, ni reescribir sus secciones. **Lo único que hace falta es que
producción vuelva a servir ese código.** Reconstruirlo sería tirar a la basura un formulario que ya
está bien y arriesgarse a que salga distinto.

---

## Resumen en tres líneas

`planespro.cl/retiro-tecnico-extranjero/` está sirviendo una versión del formulario **del 5 de agosto**,
sin oferta, sin precios, sin FAQ y sin reseñas. La correcta está en `origin/master` y llega hasta el
11 de agosto. La causa es un despliegue de la rama `codex/seo-clicmed-aeo`, que arrastra una copia
congelada del formulario dentro de `forms/retiro/`.

---

## 1. Qué está desplegado, comprobado byte a byte

```
GET https://planespro.cl/retiro-tecnico-extranjero/app.js?v=retiro-v5-progress-tracking
```

Ese archivo es **idéntico**, sin una sola línea de diferencia, a `forms/retiro/app.js` de la rama
`codex/seo-clicmed-aeo`. Comparado normalizando fin de línea:

| Candidato | Diferencia con lo que sirve producción |
|---|---|
| `codex/seo-clicmed-aeo : forms/retiro/app.js` | **0 líneas** |
| `origin/master : retiro-tecnico-extranjero/app.js` | 858 líneas |

Producción **no** está sirviendo `origin/master`.

## 2. No son dos variantes del mismo formulario. Son dos generaciones

No es que falte un bloque: es una versión anterior entera, con otra arquitectura de secciones.

**La correcta** (`origin/master : retiro-tecnico-extranjero/`, 568 líneas de HTML, 1.734 de CSS):

```html
<section class="rv2-panel rv2-panel--purchase"  id="purchase-stage">
<section class="rv2-panel rv2-panel--advisory"  id="advisory-stage">
<section class="rv2-panel rv2-panel--substage"  id="toc-stage">
<section class="rv2-panel rv2-panel--substage"  id="faq-stage">
```

**La desplegada** (`codex : forms/retiro/`, 229 líneas de HTML, 663 de CSS):

```html
<section class="form-panel retiro-panel"        id="profile-stage">
<section class="form-panel requisitos-panel"    id="requirements-stage">
<section class="form-panel form-panel--contact" id="contact-stage">
```

La desplegada arranca directamente en "Primero necesitamos entender tu situación" con Nacionalidad,
AFP y Promedio de renta. Ni compra, ni asesoría, ni índice, ni FAQ.

## 3. Qué se perdió, contado

| Elemento | `origin/master` | Desplegado |
|---|---|---|
| Precios de la oferta | **$9.990, $24.990, $29.990** | ninguno |
| Badge "Oferta" | 2 | 0 |
| FAQ | 10 menciones | 0 |
| Acordeón del FAQ | 82 | 0 |
| Reseñas | 7 | 0 |
| Avatares | 4 | 0 |
| Valoración con estrellas | 2 | 0 |
| Etapa de compra | sí | no |
| Etapa de asesoría | sí | no |

Los `$1.200`, `$2.000`, `$500.000` y `$800.000` que sí aparecen en la versión desplegada **no son
precios**: son los rangos de renta del desplegable.

## 4. Por qué pasó

`forms/retiro/index.html` viene del commit `31c0dd982`, del **5 de agosto**. La reorganización a
`forms/` copió el formulario tal como estaba ese día, y **nada de lo posterior entró en esa carpeta**:

| Commit | Fecha | Qué añadió |
|---|---|---|
| `e0a88b818` | 11 ago 18:57 | reseñas de asesoría, espaciado de avatares |
| `aa73333b7` | 11 ago 19:22 | respuestas del FAQ, badge "Oferta" |
| `c53df0ca1` | 11 ago 19:40 | mover el badge al botón de **$9.990** |

La rama `codex/seo-clicmed-aeo` está **74 commits por detrás de `origin/master`** (y 21 por delante).
Al desplegarla, el formulario retrocedió seis días.

**Esto no es culpa de un descuido puntual, es la trampa que tiende la carpeta `forms/`.** Existe desde
el 3 de agosto en ramas que nunca se mergearon, mientras el trabajo real siguió en
`retiro-tecnico-extranjero/`. Cualquiera que mire `forms/` cree estar viendo el formulario del sitio.

Ya estaba avisado por escrito en `landing-gerow-cloudflare-context.md`:

> "Lo que sigue siendo cierto de este apartado es dónde vive cada cosa: la fuente real es `pb/`,
> `form/` y `frontend/lead-capture/`, **no `forms/`**. Tomar `forms/` sería portar una versión que
> producción no usa."

## 5. Cómo comprobarlo en diez segundos

```bash
curl -s https://planespro.cl/retiro-tecnico-extranjero/ | grep -oE '\$[0-9]{1,3}\.[0-9]{3}' | sort -u
```

- Si salen **$9.990 / $24.990 / $29.990** → está la versión correcta.
- Si salen $500.000 / $800.000 y nada más → está la versión del 5 de agosto.

## 6. Las dos salidas

Las dos restituyen el **mismo código que ya existe**. Ninguna implica escribir formulario nuevo.

**A. Redesplegar `origin/master` (recomendada).** Es la rama desde la que Pages debe desplegar y su
formulario es exactamente el de ayer.

```bash
npm run build && npm run smoke:gate
npx wrangler pages deploy . --project-name planespro --branch master
```

El precio es que saca de producción los 21 commits de la rama `codex` (SEO de clicmed, sitemaps
segmentados, metadatos sociales, divulgaciones E-E-A-T, guardas de test) hasta que se mergeen a
`master` y se despliegue desde ahí.

**B. Sincronizar `forms/retiro/` y desplegar la rama.** Conserva ambas cosas. **Es una copia de
archivos, no una reescritura**: traer HTML, CSS y JS de `retiro-tecnico-extranjero/` de
`origin/master` a `forms/retiro/`, comprobar que las Pages Functions siguen resolviendo la ruta
pública, y verificar con el `curl` de la sección 5.

Ante la duda, la **A**: devuelve un estado conocido y bueno, y deja la reintegración para cuando haya
calma.

Sea cual sea la elegida: **`forms/retiro/` no debe volver a desplegarse mientras siga por detrás de
`retiro-tecnico-extranjero/` en `origin/master`.** O se sincroniza, o se borra.

## 7. Lo que NO causó esto

Se descarta explícitamente porque fue la primera hipótesis:

- **No fue el arreglo de los links duplicados de LeadSeed** (migración 105). Ese cambio es una
  consulta de solo lectura que agrupa visitas en la base de LeadSeed. No sirve archivos ni toca
  `planespro.cl`.
- **No fue un cambio de `origin/master`.** Su formulario está intacto y es el correcto; simplemente
  no es lo que se desplegó.

## 8. Contexto que conviene tener a mano

Hay una segunda divergencia de la misma familia, todavía sin resolver, documentada en
`docs/integrations/landing-gerow-superficie-compartida.md`: el Worker `ppforms` que corre en
`form.planespro.cl` **tampoco es el que está en `origin/master`** (producción tiene un proxy hacia
Supabase, `origin/master` tiene un stub que devuelve 410). Desplegarlo desde `origin/master` corta
toda la captura pública de leads.

Es el mismo patrón dos veces: **lo que está en git y lo que corre en producción no coinciden, y no hay
nada que avise.** Merece una comprobación antes de cualquier despliegue, no después.
