# Migraciones

Esta es la **fuente** del esquema. Lo que hay aqui es lo que corre en la base.

## Formato

`AAAAMMDDHHMMSS_dominio_accion.sql`

La marca temporal fija el orden de aplicacion y es lo que el CLI registra en
`supabase_migrations.schema_migrations`. **No se renombra un archivo ya aplicado**: la
base lo tiene anotado por ese nombre.

## Crear una migracion

    supabase migration new dominio_accion

Escribirla aqui. Despues copiarla a `sql/migrations/` con el siguiente numero libre, que
es el espejo legible del historial y donde vive la explicacion en prosa del cambio. Ver
`sql/README.md`.

    npm run check:migrations

comprueba que las dos carpetas no se hayan separado: que toda migracion tenga espejo y
al reves, que el contenido coincida, que el orden numerico respete el temporal, y que
nada de `sql/migrations/no-aplicadas/` este en realidad aplicado.

## Por que existe este README

Hasta el `2026-09-10` esta carpeta no tenia ninguno, y `sql/README.md` se declaraba "la
fuente autorizada de SQL del proyecto" sin mencionar que esta carpeta existiera. La
auditoria CONTROL de ese dia lo levanto contra el §5.3: dos copias completas del mismo
historial, sin frontera declarada ni herramienta que detectara la deriva.

No era teorico. Las migraciones `090`, `091` y `137` nacieron aqui y estuvieron aplicadas
en produccion sin equivalente numerado. Durante ese tiempo, leer `sql/migrations/` daba
una foto incompleta de la base.

## Reglas

- Idempotente siempre que sea razonable (`if not exists`, `drop policy if exists`).
- Todo `drop policy if exists` debe nombrar **exactamente** las politicas que el archivo
  crea despues. Si no, reaplicar la migracion falla. Ver el defecto conocido de la `148`
  mas abajo.
- Toda funcion `SECURITY DEFINER` fija `search_path`.
- `notify pgrst, 'reload schema';` al final cuando se toca una firma que PostgREST
  expone.

## Cuidado: el proyecto Supabase es compartido

`landing-gerow` apunta a la misma base. Un `supabase db push` desde el repo equivocado
aplica esquema ajeno. Ver `PROTOCOLO_CONTROL.md` §15.5 y `supabase/functions/README.md`.

## Defecto conocido, sin corregir

`148_playbooks.sql` hace `drop policy if exists playbook_runs_own` pero despues crea
`playbook_runs_select_own` y `playbook_runs_update_own`. El `drop` no cubre ninguna de
las dos. Lo mismo con `playbook_run_items_own` y `playbook_run_notes_own`.

Reaplicar la `148` sobre una base que ya la tiene falla con `policy ... already exists`.
Rompe la reproducibilidad desde cero sobre una base parcialmente migrada. Detectado en la
auditoria del `2026-09-10`; no se corrige en caliente porque tocar politicas es cambio de
alto riesgo (§15.4) y requiere decision explicita.

Nota relacionada, y esta **no** es un defecto: `playbook_runs` y `playbook_run_items`
tienen politicas de `select` y `update` pero ninguna de `insert` ni `delete`. Es
fail-closed -sin politica, denegado- y las inserciones pasan por
`start_my_playbook_run`. Se anota aqui porque a primera vista parece un olvido.
