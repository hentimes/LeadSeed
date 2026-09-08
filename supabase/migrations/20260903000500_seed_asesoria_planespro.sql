-- Query de un solo uso
-- Dominio: playbooks / contenido
-- Objeto: filas en public.playbooks, playbook_sections y playbook_items
-- Clase: carga de datos
-- Descripcion: crea el guion "Asesoria PlanesPro" con su Fase 1 completa
-- Proposito: tener el guion listo para conducir la proxima reunion sin teclear
--            diecisiete preguntas a mano
-- Dependencias: 148 (las seis tablas)
-- Impacto: solo agrega filas, y solo para una cuenta
-- Persistencia: un solo uso
-- Reversibilidad: total (delete del playbook; las hijas caen en cascada)
--
-- POR QUE UNA MIGRACION Y NO EL EDITOR
--
-- El contenido se puede escribir desde la pantalla de Playbooks, y a la larga
-- es lo que hara el usuario. Estas diecisiete preguntas ya estaban redactadas
-- -salieron de una conversacion de trabajo, no de un ejemplo inventado- y
-- teclearlas a mano solo introduce erratas.
--
-- ES DE UN SOLO USO Y VA ACOTADA A UNA CUENTA
--
-- Se ancla por correo en `auth.users` en vez de sembrar a todo el mundo: esto
-- es contenido de un negocio concreto, no una plantilla de fabrica del
-- producto. Si el dia de manana se quiere un guion de ejemplo para toda cuenta
-- nueva, eso es otra cosa y se decide aparte.
--
-- IDEMPOTENTE
--
-- Si ya existe un guion con ese nombre para esa cuenta, no hace nada. Volver a
-- aplicarla no duplica.
--
-- REVERSION
--
--   delete from public.playbooks
--   where name = 'Asesoría PlanesPro'
--     and user_id = (select id from auth.users where email = 'hentimes@gmail.com');

do $$
declare
  v_user_id uuid;
  v_playbook_id uuid;
  v_section_id uuid;
begin
  select id into v_user_id from auth.users where email = 'hentimes@gmail.com';

  if v_user_id is null then
    raise notice 'No existe esa cuenta; no se carga nada.';
    return;
  end if;

  if exists (
    select 1 from public.playbooks
    where user_id = v_user_id and name = 'Asesoría PlanesPro'
  ) then
    raise notice 'El guion ya existe; no se carga nada.';
    return;
  end if;

  insert into public.playbooks (user_id, name, description)
  values (
    v_user_id,
    'Asesoría PlanesPro',
    'Entender, profundizar, aportar una perspectiva, hacer priorizar, confirmar y preparar una solución.'
  )
  returning id into v_playbook_id;

  insert into public.playbook_sections (playbook_id, position, title)
  values (v_playbook_id, 1, 'Fase 1 · Primera reunión — Diagnóstico')
  returning id into v_section_id;

  insert into public.playbook_items (section_id, position, title, question, support)
  select v_section_id, fila.position, fila.title, fila.question, fila.support
  from (values
    (1, 'Motivo de la reunión', '¿Qué te llevó a revisar tu plan de salud justo ahora?', 'Cambio reciente, problema, recomendación, inquietud, oportunidad.'),
    (2, 'Situación actual', 'Cuéntame, ¿qué tienes actualmente?', 'Isapre/Fonasa, plan, antigüedad, costo, complementarios.'),
    (3, 'Percepción del plan actual', 'En general, ¿cómo ha sido tu experiencia con el plan que tienes?', 'Buena experiencia, problemas, uso real, satisfacción.'),
    (4, 'Lo que funciona', '¿Qué cosas de tu plan actual valoras y te gustaría conservar?', 'Clínicas, médicos, coberturas, precio, excedentes, beneficios.'),
    (5, 'Qué quiere mejorar', '¿Qué es lo que principalmente te gustaría mejorar?', 'Cobertura, costo, red, hospitalización, ambulatorio, urgencias.'),
    (6, 'Impacto del problema', '¿Eso te ha generado algún problema concreto o es algo que quieres prevenir?', 'Copagos, gasto adicional, mala cobertura, inseguridad, prevención.'),
    (7, 'Qué no quiere perder', 'Si apareciera una alternativa mejor, ¿qué no estarías dispuesto a sacrificar?', 'Clínicas, médicos, coberturas, excedentes, beneficios importantes.'),
    (8, 'Preferencias de atención', '¿Dónde te atiendes normalmente o dónde te gustaría poder atenderte?', 'Clínicas, centros médicos, especialistas, sector geográfico.'),
    (9, 'Prioridad de cobertura', '¿Qué te importa más proteger: el uso frecuente del plan o un evento hospitalario de mayor costo?', 'Ambulatorio, hospitalario o equilibrio entre ambos.'),
    (10, 'Situación personal', '¿Tienes cargas o alguna situación familiar que debamos considerar?', 'Cantidad, edades, necesidades relevantes.'),
    (11, 'Cotización y presupuesto', '¿Actualmente tu 7% cubre el plan o realizas algún aporte adicional?', 'Renta, 7%, tope, excedentes, aporte adicional.'),
    (12, 'Antecedentes relevantes', '¿Hay algún antecedente de salud que sea importante considerar al evaluar alternativas?', 'Diagnósticos, tratamientos, medicamentos, cirugías.'),
    (13, 'Nueva perspectiva', 'Por lo que me cuentas, quizás el punto principal no sea ___ sino ___. ¿Te hace sentido verlo así?', 'Ayudar al cliente a observar su situación desde una perspectiva distinta.'),
    (14, 'Prioridad principal', 'Si pudiéramos mejorar una sola cosa, ¿cuál tendría más valor para ti?', 'Identificar qué debe priorizar la propuesta.'),
    (15, 'Criterio para cambiarse', '¿Qué tendría que ofrecerte una alternativa para que realmente valiera la pena cambiarte?', 'Condición mínima que debe cumplir una propuesta.'),
    (16, 'Confirmación del diagnóstico', 'Entonces, si entendí bien, quieres mejorar ___, mantener ___ y no es indispensable ___. ¿Correcto?', 'Confirmar que entendiste correctamente antes de buscar alternativas.'),
    (17, 'Próximo paso', 'Te preparo una comparación considerando justamente esto. ¿Cuándo te parece bien que la revisemos?', 'Dejar definida la siguiente acción y fecha de contacto.')
  ) as fila(position, title, question, support);
end;
$$;
