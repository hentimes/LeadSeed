-- puertas_sin_quitar_nada
--
-- Tipo:           asignaciones a planes
-- Objeto:         public.plan_features
-- Clase:          correccion de un fallo de diseño
-- Persistencia:   permanente
-- Reversibilidad: total, pero ver la advertencia
--
-- POR QUE EXISTE ESTA MIGRACION
--
-- El siguiente paso es poner puerta en el codigo a Agenda, Chat, Flujos y
-- Playbooks, que hoy estan abiertos a cualquiera con sesion.
--
-- El problema es que `hasFeature` FALLA CERRADO: declarar la puerta no "empieza
-- a cobrar" la seccion, se la QUITA a todo el que no tenga la clave. Y en la
-- 180 se sembro Flujos como Standard y Pro, y Playbooks solo como Pro. Poner
-- la puerta con ese reparto le quitaria Flujos a los gratuitos y Playbooks a
-- todos menos Pro, hoy, sin avisar.
--
-- Eso no lo decide una migracion. Lo que hace esta es dejar el reparto igual a
-- la realidad de hoy -las cuatro abiertas a los tres planes- para que poner la
-- puerta no cambie nada para nadie.
--
-- QUE SE GANA ENTONCES
--
-- Que a partir de ahora la decision SE PUEDA TOMAR. Hoy Flujos no se puede
-- cobrar de ninguna manera: no tiene clave, y ponersela lo cierra de golpe.
-- Con la clave declarada y asignada a los tres, quitarsela al plan gratuito es
-- un clic en el panel, reversible, y con el aviso de "funcionalidad no
-- disponible" que la aplicacion ya sabe pintar.
--
-- Es la diferencia entre no poder cobrarlo y decidir cuando.

INSERT INTO public.plan_features (plan_id, feature_id)
VALUES
  -- Flujos: hoy abierto a todos.
  ('plan_free', 'mensajes.flujos'),
  -- Playbooks: hoy abierto a todos.
  ('plan_free', 'mensajes.playbooks'),
  ('plan_standard', 'mensajes.playbooks')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   delete from public.plan_features
--   where (plan_id, feature_id) in (
--     ('plan_free', 'mensajes.flujos'),
--     ('plan_free', 'mensajes.playbooks'),
--     ('plan_standard', 'mensajes.playbooks')
--   );
--
--   ADVERTENCIA: revertir esto DESPUES de que el codigo tenga las puertas
--   puestas le quita Flujos y Playbooks a esos planes de inmediato. Que es
--   exactamente lo que hay que poder hacer, pero desde el panel y a sabiendas,
--   no ejecutando una reversion.
