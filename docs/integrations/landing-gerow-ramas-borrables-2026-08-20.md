# Ramas de landing-gerow: cuales puede borrar sin afectar a LeadSeed

**Fecha:** 2026-08-20
**Para:** la IA que hace la limpieza de worktrees en `landing-gerow`.
**Alcance:** esto responde **solo** desde LeadSeed. Que una rama sea inofensiva para LeadSeed no
significa que landing-gerow no la necesite; eso lo sabe usted, no yo.

## Lo primero, porque cambia como hay que leer todo lo demas

**Borrar una rama de landing-gerow no puede romper el codigo de LeadSeed.** Son repositorios
distintos y LeadSeed no importa nada de aqui.

El riesgo es otro y es real: **produccion no coincide con `origin/master`**. Si una rama es el unico
sitio donde vive codigo que hoy esta desplegado y sirve la captura de leads, borrarla convierte un
problema recuperable en uno irreversible.

Verificado hoy, archivo por archivo:

| Rama | `cloudflare/ppforms/src/index.js` |
|---|---|
| `origin/master` | **stub que devuelve `410`** |
| `master` (local) | **proxy activo** |
| `wip/rescate-arbol-sucio-2026-08-14` | **proxy activo** |
| `codex/seo-clicmed-aeo` | **proxy activo** |
| `sync-block-h-work` | **proxy activo** |
| `work` | stub `410` |
| `fix/reconcile-ppforms-retirement-with-tracking` | stub `410` |

Produccion sirve el proxy activo. `origin/master` no lo tiene. **Las cuatro ramas con el proxy son la
unica copia de lo que esta funcionando.**

## NO BORRAR

| Rama | Motivo |
|---|---|
| `master` (local) | Proxy activo y **6 commits sin publicar**. Esta `ahead 6, behind 65` de `origin/master`. |
| `wip/rescate-arbol-sucio-2026-08-14` | Proxy activo y **97 archivos** de superficie compartida. Es el rescate del arbol sucio; probablemente la copia mas completa. |
| `codex/seo-clicmed-aeo` | Proxy activo, 21 commits unicos, y es la rama **actualmente montada** en el worktree principal. |
| `sync-block-h-work` | Proxy activo, 7 commits unicos, 35 archivos de superficie compartida. |
| `fix/retiro-faq-oferta-badge-placement` | Toca el formulario de retiro, que ya se rompio una vez (ver `incidente-formulario-retiro-2026-08-16.md`). Sin commits unicos, pero **no la borre hasta que el formulario correcto este desplegado y verificado**. |

## SE PUEDEN BORRAR

Sin commits unicos fuera de `origin/master` y `origin/crm`, y sin tocar superficie compartida. Sus
worktrees se pueden retirar primero con `git worktree remove`.

```
sync-block-d-crm
sync-block-e-crm
sync-block-e2-crm
sync-block-e4-crm-hotfix
sync-block-e4-master-hotfix
sync-block-e5-crm
sync-block-e6-master
sync-block-h-master
hotfix/blog-slug-redirect
codex/seo-biblioteca-consolidacion
```

Y estas cuatro, que tienen un commit unico cada una pero **cero archivos de superficie compartida**.
Son de CRM interno, que LeadSeed no consume:

```
reintro/role-ui
reintro/profile-preferences
reintro/google-auth-same-origin
reintro/blog-session-author
```

`backup/pre-align-master-20260630` tambien da cero superficie compartida, pero es una rama de
respaldo: borrar respaldos es decision del usuario, no mia.

## REVISAR ANTES DE BORRAR

Tienen commits unicos **y** tocan superficie compartida. No digo que haya que conservarlas: digo que
antes hay que comprobar si su contenido ya esta en alguna de las cuatro que conservan el proxy.

| Rama | Commits unicos | Archivos compartidos |
|---|---:|---:|
| `sync-block-f-master` | 4 | 35 |
| `sync-block-e6-work` | 7 | 35 |
| `sync-block-e4-work-hotfix` | 6 | 35 |
| `sync-block-e2-work` | 4 | 35 |
| `sync-block-d-work` | 3 | 34 |
| `sync-block-e3-crm` | 1 | 32 |
| `fix/reconcile-ppforms-retirement-with-tracking` | 3 | 25 |
| `fix/agenda-url-bug` | 4 | 24 |
| `work` | 8 | 13 |
| `fix/form-whatsapp-context-message` | 4 | 4 |
| `feat/pb-visit-tracking` | 1 | 1 |
| `fix/unificar-form-api-client` | 1 | 1 |
| `checkpoint/2026-07-02-worktree-cleanup` | 1 | 1 |

Ojo con `fix/reconcile-ppforms-retirement-with-tracking`: **lleva el stub `410`**. Si algo de esa rama
llega a `master`, la captura de leads se cae.

## Que cuenta como superficie compartida

Lo que LeadSeed consume, y por eso lo mido:

```
cloudflare/ppforms/          proxy del borde publico hacia las Edge Functions
functions/                   Pages Functions de enrutado
_routes.json                 que rutas van a Functions
_redirects                   reglas de los formularios
_headers                     politica de seguridad
frontend/lead-capture/       fuente de los formularios
public/assets/lead-capture/  copia generada
pb/, form/, retiro*/         formularios publicados
```

Detalle completo en `landing-gerow-superficie-compartida.md`.

## Recomendacion de orden

1. **Antes de borrar nada**, publicar el proxy activo a `origin/master`. Mientras produccion viva solo
   en ramas locales, cualquier limpieza es una apuesta.
2. Retirar los worktrees de las 14 ramas seguras y borrarlas.
3. Revisar la tabla del medio una por una, comparando contra la rama que ya tenga el proxy.
4. Dejar `master`, `wip/rescate-*`, `codex/seo-clicmed-aeo` y `sync-block-h-work` para el final.

## Lo que no puedo responderle

No verifique el estado desplegado real, solo el contenido de las ramas en disco. Si desplego algo
desde que se escribio esto, las tablas cambian. La comprobacion es
`GET form.planespro.cl/health`: si dice `"status":"retired"` esta el stub; si dice
`"backend":"supabase"` esta el proxy.
