-- Diagnostico: leads que perdieron atribucion de asesor por la regresion del ref
--
-- Clasificacion CONTROL 15.1: Query de un solo uso.
--
-- Tipo: diagnostico, solo lectura.
-- Proposito: identificar y cuantificar los leads que entraron sin atribucion de
--   asesor mientras las Pages Functions de /pb y /form devolvian un 301 que
--   borraba el ref de la URL. Ver capitulo 13.4.d del roadmap.
-- Impacto: ninguno. No escribe, no bloquea, no modifica.
-- Reversibilidad: no aplica.
--
-- Como reconocer un lead afectado. El runtime publico decide el canal asi:
-- `source_channel = 'pb'` si hay ref, `'general'` si no lo hay
-- (forms/pb/js/app.js). Con el 301, un visitante que venia de un link de asesor
-- llegaba sin ref, asi que su lead entraba como `general` y sin
-- `capture_link_id`, pero conservando en `source_url` o `source_path` la huella
-- de que venia de /pb o /form.
--
-- Esa combinacion (viene de /pb pero quedo como general y sin link) es la
-- firma del problema. Un lead general legitimo entra desde la home o una
-- landing, nunca desde /pb.

-- ---------------------------------------------------------------------------
-- 1. Distribucion por dia. Sirve para ver cuando empezo y cuando termino la
--    regresion sin tener que adivinar la ventana a partir de fechas de deploy.
-- ---------------------------------------------------------------------------
select
  date_trunc('day', l.created_at)                              as dia,
  count(*)                                                     as leads_sospechosos,
  count(*) filter (where l.metadata ->> 'source_channel' = 'general') as como_general,
  count(distinct l.user_id)                                    as owners_distintos
from public.leads l
where l.deleted_at is null
  and (
    coalesce(l.metadata ->> 'source_url', '')  ~ '/(pb|form)(/|$|\?)'
    or coalesce(l.metadata ->> 'source_path', '') ~ '^/(pb|form)(/|$)'
  )
  and coalesce(l.metadata ->> 'capture_link_id', '') = ''
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------------
-- 2. Detalle de los leads afectados, para decidir reasignacion uno por uno.
--    Ajusta el rango de fechas con lo que revele la consulta anterior.
-- ---------------------------------------------------------------------------
select
  l.id,
  l.created_at,
  l.name,
  l.email,
  l.phone,
  l.user_id                                as owner_actual,
  p.email                                  as owner_actual_email,
  l.metadata ->> 'source_channel'          as canal,
  l.metadata ->> 'source_url'              as url_origen,
  l.metadata ->> 'capture_ref'             as capture_ref,
  l.metadata ->> 'first_touch_ref'         as first_touch_ref,
  l.status
from public.leads l
left join public.profiles p on p.id = l.user_id
where l.deleted_at is null
  and (
    coalesce(l.metadata ->> 'source_url', '')  ~ '/(pb|form)(/|$|\?)'
    or coalesce(l.metadata ->> 'source_path', '') ~ '^/(pb|form)(/|$)'
  )
  and coalesce(l.metadata ->> 'capture_link_id', '') = ''
  -- and l.created_at >= '2026-08-XX'::timestamptz   -- acotar con el punto 1
order by l.created_at desc;

-- ---------------------------------------------------------------------------
-- 3. Linea base de contraste. Cuantos leads de /pb SI conservaron su link en el
--    mismo periodo. Si este numero es alto mientras el de arriba tambien lo es,
--    entonces la regresion fue intermitente y no total, que cambia la lectura.
-- ---------------------------------------------------------------------------
select
  date_trunc('day', l.created_at) as dia,
  count(*)                        as leads_con_atribucion_ok
from public.leads l
where l.deleted_at is null
  and coalesce(l.metadata ->> 'capture_link_id', '') <> ''
group by 1
order by 1 desc
limit 30;

-- ---------------------------------------------------------------------------
-- Nota sobre la reasignacion
--
-- Esta consulta NO reasigna nada, y conviene que siga siendo asi. El ref se
-- perdio en el navegador antes de llegar al backend, asi que **no hay forma
-- automatica y fiable de saber a que asesor pertenecia cada lead**: el dato no
-- llego nunca. Cualquier reasignacion tendra que apoyarse en informacion
-- externa, por ejemplo que el asesor reconozca al contacto o que exista un
-- registro de la campana por la que se repartio ese link.
--
-- Si se decide reasignar, hacerlo con una migracion aparte, idempotente y
-- acotada por lista explicita de ids, nunca por un criterio automatico.
-- ---------------------------------------------------------------------------
