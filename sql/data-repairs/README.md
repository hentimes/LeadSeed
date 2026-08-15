# Reparaciones de datos

Scripts que **corrigen filas existentes** sin cambiar el esquema: reasignar dueños, rellenar un campo
que se guardo mal, deshacer el efecto de un bug ya corregido.

## Por que estan separados de `migrations/`

Una migracion de esquema y una reparacion de datos se parecen (las dos son SQL que se aplica una vez)
pero se comportan al reves en lo que importa:

| | Migracion de esquema | Reparacion de datos |
|---|---|---|
| Sobre una base vacia | debe aplicarse | no hace nada, o falla |
| Al reconstruir el entorno | obligatoria | hay que saltarla |
| Si se aplica dos veces | idempotente por diseño | puede duplicar el daño |
| Que la justifica | el modelo cambio | un incidente concreto |

Mezcladas, el historial de migraciones deja de ser reproducible: quien levante el proyecto desde cero
arrastra correcciones de incidentes que en su base nunca ocurrieron.

## Las dos historicas se quedan donde estan

`036_planespro_capture_ref_recovery.sql` y `037_repair_historical_pb_owner_assignments.sql` son
reparaciones de datos que viven en `migrations/`. **No se mueven, a proposito.**

Ya estan aplicadas en produccion y espejadas en `supabase/migrations/` como `20260601000037` y
`20260601000038`, que es el libro de registro que lee el CLI. Renombrarlas o sacarlas de ahi
desincroniza ese registro con el remoto, y el precio de ordenar dos archivos historicos no compensa
tocar el unico sitio donde consta que se aplicaron.

La regla, por tanto, es **hacia adelante**: la proxima reparacion entra aqui.

Matiz sobre la 036: define la funcion `resolve_planespro_capture_ref_from_payload`, que es esquema de
verdad y sigue en uso. Es mitad y mitad, y hoy se separarian en dos archivos.

## Convencion

`NNN_descripcion.sql`, numeracion propia e independiente de `migrations/`.

Cada archivo abre con el mismo encabezado que exige el protocolo 15.1 para una query de un solo uso:
tipo, proposito, impacto, reversibilidad, y **como saber si ya se aplico**.

## Reglas

- Acotar por lista explicita de ids siempre que se pueda, no por criterio automatico.
- Dejar escrito que se hizo con las filas que el criterio no alcanza.
- Si la reparacion no es reversible, decirlo en el encabezado antes de la primera linea de SQL.
- Un diagnostico que solo lee no es una reparacion: va en `sql/diagnostics/`.
