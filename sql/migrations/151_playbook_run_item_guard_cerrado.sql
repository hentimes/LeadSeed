-- Query permanente
-- Dominio: playbooks / integridad del snapshot historico
-- Objeto: public.playbook_run_item_guard()
-- Clase: correccion de una funcion existente
-- Descripcion: el guard pasa a enumerar lo MUTABLE en vez de lo congelado
-- Proposito: que una columna nueva nazca congelada y no editable por descuido
-- Dependencias: 148 (crea la funcion y su trigger)
-- Impacto: ninguno sobre el comportamiento actual; cambia lo que pasa manana
-- Persistencia: permanente
-- Reversibilidad: total (volver al cuerpo de la 148)
--
-- ======================================================================
-- POR QUE
-- ======================================================================
--
-- La 148 congela el snapshot de un item con un trigger que ENUMERA las
-- columnas protegidas:
--
--   if new.run_id is distinct from old.run_id
--   or new.position is distinct from old.position
--   or ... nueve columnas ...
--   then raise exception
--
-- Esa lista es cerrada, asi que **toda columna que se anada despues nace
-- MUTABLE**. No hay error, no hay aviso: simplemente el candado no la cubre y
-- nadie se entera hasta que alguien reescribe historial.
--
-- El guard falla ABIERTO, que es la peor forma de fallar para algo cuyo unico
-- trabajo es impedir.
--
-- Lo irritante es que la propia 148 dedica veinte lineas a explicar que una
-- garantia que solo vive en un comentario no es una garantia -es la leccion de
-- la 145, donde el comentario de una politica de la comunidad prometia impedir
-- que una edicion moviera un comentario de hilo, y no lo impedia-. Y a la vez
-- dejo el candado enumerando el lado equivocado.
--
-- ======================================================================
-- LA INVERSION
-- ======================================================================
--
-- Se compara la fila entera menos las columnas que SI pueden cambiar. Lo que
-- se enumera ahora es la lista corta y estable de lo mutable:
--
--   state           el estado del punto
--   note            la nota que escribe la persona
--   selections      las respuestas por opciones          (migracion 152)
--   checkpoint_text la frase de confirmacion editada     (migracion 152)
--   answered_at     lo sella el trigger de la 148
--   updated_at      idem
--
-- Cualquier columna futura queda fuera de esa lista y por tanto congelada
-- desde el primer dia. Para desbloquearla hay que venir aqui y escribirlo, que
-- es justo la decision que antes se podia tomar por omision.
--
-- ## Por que se pueden nombrar columnas que todavia no existen
--
-- `selections` y `checkpoint_text` llegan en la 152. El operador `-` sobre un
-- jsonb con una clave que no esta devuelve el objeto igual, sin error, asi que
-- nombrarlas hoy no rompe nada y evita que la 152 tenga que acordarse de
-- volver aqui. Es el unico sitio donde adelantarse cuesta cero.
--
-- ## Coste
--
-- Dos `to_jsonb` de una fila por UPDATE, sobre una tabla que se escribe de a
-- un item cuando alguien toca un boton en una reunion. Irrelevante.
--
-- ======================================================================
-- REVERSION
-- ======================================================================
--
-- Volver a poner el cuerpo enumerativo de la 148. No se recomienda: ese cuerpo
-- es el defecto que esta migracion corrige.

create or replace function public.playbook_run_item_guard()
returns trigger
language plpgsql
as $$
begin
  /*
   * Se enumera lo MUTABLE, no lo congelado. Ver la cabecera: con la lista al
   * reves, cada columna nueva nacia editable sin que nadie lo decidiera.
   */
  if to_jsonb(new)
       - 'state' - 'note' - 'selections' - 'checkpoint_text'
       - 'answered_at' - 'updated_at'
     is distinct from
     to_jsonb(old)
       - 'state' - 'note' - 'selections' - 'checkpoint_text'
       - 'answered_at' - 'updated_at'
  then
    raise exception 'El registro de lo que se pregunto no se edita: solo cambian el estado, la seleccion y las notas';
  end if;

  return new;
end;
$$;

comment on function public.playbook_run_item_guard() is
  'Congela la copia historica de un item del recorrido. Enumera lo MUTABLE -estado, nota, selecciones, texto del checkpoint y los dos sellos-, de modo que toda columna futura nace congelada. La version de la 148 enumeraba lo contrario y por eso fallaba abierto.';
