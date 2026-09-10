-- analisis_completo
--
-- Tipo:           altas de catalogo + asignaciones
-- Objeto:         public.features, public.plan_features
-- Clase:          correccion de un fallo de siembra
-- Persistencia:   permanente
-- Reversibilidad: parcial (ver al final)
--
-- LA CATEGORIA ANALISIS SE QUEDO CORTA
--
-- La 180 le puso tres funcionalidades -Panel, Reportes e Historial- para todo
-- lo que el panel hace de verdad. Faltaban dos que son cosas distintas y
-- separables:
--
--   Las metas diarias. Se configuran en Ajustes (daily_goal_whatsapp,
--   daily_goal_email, daily_goal_calls) y se siguen en la tarjeta "Progreso de
--   metas". Es lo unico del panel que hay que RELLENAR para que sirva, y quien
--   no las usa no las echa de menos.
--
--   Las ventanas de tiempo. El selector de periodo -hoy, 7, 30, 90, 180, 365
--   dias- con su comparacion contra el periodo anterior, que la migracion 177
--   convirtio en la ventana que gobierna la pantalla. Antes de esa migracion
--   no habia nada que vender aqui: el selector movia seis flechas.
--
-- Y ADEMAS: EL PANEL NO SE ENCONTRABA BUSCANDOLO
--
-- La 180 renombro `module:dashboard` de "Modulo: Dashboard" a "Panel". Es
-- mejor nombre, pero dejo la funcionalidad inencontrable para quien busca
-- "dashboard", que es como se llama la seccion en el rail de navegacion y como
-- la nombra la mitad del equipo.
--
-- El buscador nuevo ya mira el identificador -y `module:dashboard` lleva la
-- palabra-, asi que se encuentra igual. Aqui se le añade a la descripcion, que
-- es donde toca decir el otro nombre de una cosa.

INSERT INTO public.features (id, name, description, is_active, trial_days, category, sort_order)
VALUES
  ('analisis.metas', 'Metas diarias', 'Fijar un objetivo de mensajes al dia y seguirlo en el panel.', true, 0, 'analisis', 25),
  ('analisis.periodos', 'Comparar periodos', 'Ver el panel por semana, mes, trimestre, semestre o año, contra el periodo anterior.', true, 0, 'analisis', 30)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- La descripcion del panel nombra tambien "dashboard", para que se encuentre
-- por las dos palabras. El nombre visible se queda en "Panel", que es como se
-- lee mejor en una lista.
UPDATE public.features
SET description = 'El dashboard: metricas del dia, conversion, alertas y progreso.'
WHERE id = 'module:dashboard';

-- Las metas existen hoy para cualquiera -los tres campos estan en los ajustes
-- de todo el mundo-, asi que se asignan a los tres planes: el catalogo
-- describe lo que hay, y cobrarlas es despues un clic.
--
-- Las ventanas de tiempo se reparten como el propio panel: Standard y Pro. Con
-- el plan gratuito el panel sigue mostrando hoy, que es lo que mostraba antes
-- de la 177.
INSERT INTO public.plan_features (plan_id, feature_id)
VALUES
  ('plan_free', 'analisis.metas'),
  ('plan_standard', 'analisis.metas'),
  ('plan_pro', 'analisis.metas'),
  ('plan_standard', 'analisis.periodos'),
  ('plan_pro', 'analisis.periodos')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   delete from public.features where id in ('analisis.metas', 'analisis.periodos');
--
--   La descripcion de `module:dashboard` puede quedarse: decir que el panel es
--   el dashboard no estorba a nada.
