-- Query permanente
-- Dominio: chat
-- Objetivo: al correr @limpiar o @purgar, la sala quedaba borrada en la base
--           pero la ventana de chat abierta no se actualizaba sola (habia
--           que recargar). Causa: chat_messages tiene REPLICA IDENTITY
--           DEFAULT, que solo incluye la primary key (id) en el "old record"
--           de un DELETE. subscribeToRoomMessageDeletes filtra el evento
--           realtime por room_id -- una columna que nunca llega en el old
--           record con identity DEFAULT -- asi que el filtro nunca matchea y
--           el evento de borrado no le llega a nadie.

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
