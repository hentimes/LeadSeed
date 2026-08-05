-- Query permanente
-- Dominio: chat
-- Objetivo: descripcion y reglas de la sala, editables por staff, para el
--           panel de informacion de la sala.

-- La policy de UPDATE para admin/helper ya existe desde la migracion
-- 019_chat_rooms_system.sql y cubre cualquier columna, estas incluidas.
ALTER TABLE public.chat_rooms
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS rules text;

NOTIFY pgrst, 'reload schema';
