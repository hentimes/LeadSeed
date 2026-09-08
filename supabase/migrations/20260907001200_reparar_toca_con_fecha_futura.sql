-- reparar_toca_con_fecha_futura
--
-- Tipo:           reparacion de datos (una sola vez)
-- Objeto:         public.message_flow_progress
-- Clase:          escritura correctiva
-- Persistencia:   permanente (el efecto; la migracion no crea nada)
-- Reversibilidad: ninguna, y no hace falta: deja los datos en el unico estado
--                 coherente posible.
--
-- QUE REPARA
--
-- Filas con `status = 'toca'` y `due_at` en el futuro. Ese estado es
-- contradictorio: `toca` significa "ya vencio, mandalo", y la fecha dice lo
-- contrario.
--
-- Lo creo el "Repartir" roto que corrigio la 165: empujaba `due_at` a los
-- proximos dias y dejaba `status` intacto. Mientras la cola filtraba solo por
-- estado, esas filas seguian saliendo en "Hoy" -el sintoma que motivo la 165-.
-- En cuanto la 165 agrego la comprobacion de fecha, las mismas filas pasaron al
-- extremo contrario: **desaparecieron de "Hoy"**, mientras el detalle del flujo
-- las sigue mostrando como "toca ya" porque lee el estado.
--
-- O sea que la 165 arreglo la regla y dejo los datos viejos del lado malo. Esto
-- los reconcilia.
--
-- POR QUE DEGRADAR Y NO ADELANTAR LA FECHA
--
-- Las dos opciones dejan las filas coherentes, pero significan cosas distintas.
-- Adelantar la fecha a `now()` daria por bueno un reparto que el usuario pidio
-- y que la aplicacion prometio: "se mueven 350 pasos para que ningun dia pase
-- de 50". Deshacerlo mandaria hoy lo que se decidio mandar mas adelante, que es
-- justo el riesgo que el reparto venia a evitar.
--
-- Degradar respeta esa decision: el paso vuelve a la sala de espera y
-- `promote_due_flow_steps` lo devolvera a `toca` el dia que de verdad le toque.
--
-- POR QUE NO ES UNA FUNCION NI UN TRIGGER
--
-- Porque el agujero que lo producia ya esta tapado en la 165, y desde ella
-- ninguna escritura puede volver a dejar esta combinacion. Un trigger
-- permanente para vigilar un caso que ya no puede ocurrir seria coste fijo
-- contra un riesgo cerrado. Si volviera a aparecer, el sitio de la comprobacion
-- es la funcion que escribe, no un vigilante.
--
-- ALCANCE
--
-- Toca filas de todos los usuarios. Es una reparacion de datos, no una
-- operacion de sesion: corre una vez con permisos de migracion y no depende de
-- `auth.uid()`.

UPDATE public.message_flow_progress
SET status = 'pendiente',
    updated_at = now()
WHERE status = 'toca'
  AND due_at IS NOT NULL
  AND due_at > now();

NOTIFY pgrst, 'reload schema';
