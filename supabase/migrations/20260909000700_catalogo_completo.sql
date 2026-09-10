-- catalogo_completo
--
-- Tipo:           altas de catalogo + asignaciones a planes
-- Objeto:         public.features, public.plan_features
-- Clase:          funcionalidad nueva
-- Persistencia:   permanente
-- Reversibilidad: parcial (ver al final)
--
-- Bloque C de docs/auditoria-catalogo-saas.md.
--
-- EL CATALOGO NO DESCRIBIA LA APLICACION
--
-- Doce funcionalidades planas para quince secciones y unas cuarenta capacidades
-- vendibles. Aqui se siembran las 44 que existen de verdad, todas verificadas
-- leyendo el codigo, repartidas en nueve categorias.
--
-- LOS IDENTIFICADORES VIEJOS SE CONSERVAN
--
-- `module:leads`, `pro:unlimited_leads` y los demas siguen con su clave. No se
-- renombran: la clave es lo que el codigo consulta, y cambiarla no renombra
-- nada -deja de coincidir con la comprobacion escrita y la funcionalidad
-- desaparece para todo el mundo-. Lo que se les añade es categoria y orden.
--
-- LAS ASIGNACIONES SON `DO NOTHING`, NUNCA UN BORRADO
--
-- Esta migracion solo AÑADE funcionalidades a los planes. No quita ninguna, ni
-- siquiera para "corregir" un reparto: quitar una es quitarsela a quien la
-- tiene hoy, y eso es una decision de producto, no de una migracion de
-- siembra. El reparto de aqui es la propuesta de partida; ajustarlo se hace
-- desde el panel, que es justo lo que esta migracion viene a hacer posible.
--
-- POR QUE ESTE REPARTO
--
-- Gratuito: lo minimo para trabajar -contactos, listas, plantillas, enviar,
-- tareas, agenda, historial, comunidad-, con los topes de siempre.
-- Standard: lo que ahorra tiempo -pipeline, listas automaticas, tanda,
-- flujos, panel, enlaces de captura-.
-- Pro: lo que automatiza o distingue -sin topes, campañas, Google Calendar,
-- agendamiento publico, reportes, programar correos-.

INSERT INTO public.features (id, name, description, is_active, trial_days, category, sort_order)
VALUES
  ('module:leads', 'Contactos', 'La base de contactos.', true, 0, 'contactos', 10),
  ('contactos.importar', 'Importar', 'Cargar contactos desde Excel o CSV.', true, 0, 'contactos', 20),
  ('contactos.exportar', 'Exportar', 'Descargar los contactos en Excel o JSON.', true, 0, 'contactos', 30),
  ('contactos.duplicados', 'Detectar duplicados', 'Avisa cuando un contacto ya existe.', true, 0, 'contactos', 40),
  ('contactos.papelera', 'Papelera', 'Recuperar contactos borrados.', true, 0, 'contactos', 50),
  ('pro:unlimited_leads', 'Contactos ilimitados', 'Sin el tope de 100 del plan gratuito.', true, 0, 'contactos', 60),
  ('module:lists', 'Listas', 'Agrupar contactos a mano.', true, 0, 'listas', 10),
  ('listas.automaticas', 'Listas automaticas', 'Listas que se actualizan solas por reglas.', true, 0, 'listas', 20),
  ('listas.grupos', 'Carpetas de listas', 'Agrupar listas en carpetas.', true, 0, 'listas', 30),
  ('pro:unlimited_lists', 'Listas ilimitadas', 'Sin el tope de 2 del plan gratuito.', true, 0, 'listas', 40),
  ('module:templates', 'Plantillas', 'Mensajes predefinidos con variables.', true, 0, 'mensajes', 10),
  ('module:send', 'Enviar', 'La pantalla de envio.', true, 0, 'mensajes', 20),
  ('mensajes.whatsapp', 'Enviar por WhatsApp', 'Abrir la conversacion con el mensaje puesto.', true, 0, 'mensajes', 30),
  ('mensajes.correo', 'Enviar por correo', 'Mandar correos desde la extension.', true, 0, 'mensajes', 40),
  ('mensajes.llamadas', 'Guiones de llamada', 'Guiones para llamar, con registro.', true, 0, 'mensajes', 50),
  ('mensajes.tanda', 'Envio en tanda', 'Mandar a varios contactos seguidos.', true, 0, 'mensajes', 60),
  ('mensajes.programar', 'Programar correos', 'Dejar un correo listo para una fecha.', true, 0, 'mensajes', 70),
  ('mensajes.flujos', 'Flujos', 'Secuencias de mensajes con espera entre pasos.', true, 0, 'mensajes', 75),
  ('mensajes.playbooks', 'Playbooks', 'Guiones para conducir una reunion.', true, 0, 'mensajes', 76),
  ('pro:unlimited_templates', 'Plantillas ilimitadas', 'Sin tope de plantillas.', true, 0, 'mensajes', 80),
  ('pro:unlimited_emails', 'Correos ilimitados', 'Sin tope diario de correos.', true, 0, 'mensajes', 90),
  ('captacion.enlaces', 'Enlaces de captura', 'Enlaces que llevan a un formulario propio.', true, 0, 'captacion', 10),
  ('captacion.campanas', 'Campañas', 'Separar los leads por campaña y UTM.', true, 0, 'captacion', 20),
  ('captacion.formularios', 'Tipos de formulario', 'Configurar que pide cada formulario.', true, 0, 'captacion', 30),
  ('module:pipeline', 'Pipeline', 'Embudo de ventas tipo kanban.', true, 0, 'seguimiento', 10),
  ('module:tasks', 'Tareas', 'Gestor de tareas y recordatorios.', true, 0, 'seguimiento', 20),
  ('seguimiento.tablero', 'Tablero de tareas', 'Ver las tareas en columnas.', true, 0, 'seguimiento', 30),
  ('seguimiento.matriz', 'Matriz de Eisenhower', 'Repartir las tareas por urgencia e importancia.', true, 0, 'seguimiento', 40),
  ('seguimiento.agenda', 'Agenda', 'Citas y horarios de disponibilidad.', true, 0, 'seguimiento', 50),
  ('seguimiento.google', 'Google Calendar', 'Sincronizar las citas con Google.', true, 0, 'seguimiento', 60),
  ('seguimiento.agendamiento', 'Agendamiento publico', 'Que un lead reserve hora por su cuenta.', true, 0, 'seguimiento', 70),
  ('module:dashboard', 'Panel', 'Metricas y ventanas de tiempo.', true, 0, 'analisis', 10),
  ('analisis.reportes', 'Reportes', 'Adquisicion, embudo y calidad por fuente.', true, 0, 'analisis', 20),
  ('module:history', 'Historial', 'Registro de todo lo enviado.', true, 0, 'analisis', 40),
  ('module:community', 'Comunidad', 'Foro entre usuarios de LeadSeed.', true, 0, 'comunidad', 10),
  ('comunidad.chat', 'Chat', 'Salas de conversacion.', true, 0, 'comunidad', 20),
  ('comunidad.directos', 'Mensajes directos', 'Escribir a otro usuario en privado.', true, 0, 'comunidad', 30),
  ('premium_aesthetics', 'Marco premium', 'Marco distintivo en la foto de perfil.', true, 0, 'comunidad', 40),
  ('correo.emailjs', 'EmailJS', 'Enviar con EmailJS.', true, 0, 'correo', 10),
  ('correo.resend', 'Resend', 'Enviar con Resend, con dominio propio.', true, 0, 'correo', 20),
  ('correo.gmail', 'Gmail', 'Enviar desde la propia cuenta de Gmail.', true, 0, 'correo', 30),
  ('plataforma.soporte_vip', 'Ayuda prioritaria', 'Atencion preferente en los requerimientos.', true, 0, 'plataforma', 10),
  ('plataforma.ayudante', 'Rol de ayudante', 'Puede moderar el chat y la comunidad.', true, 0, 'plataforma', 20),
  ('module:admin', 'Panel de administracion', 'Gestion de usuarios, planes y catalogo.', true, 0, 'plataforma', 30)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;
-- `is_active` y `trial_days` NO se pisan: si alguien apago una funcionalidad
-- desde el panel, una migracion de siembra no tiene por que volver a
-- encenderla.

INSERT INTO public.plan_features (plan_id, feature_id)
VALUES
  ('plan_free', 'module:leads'),
  ('plan_standard', 'module:leads'),
  ('plan_pro', 'module:leads'),
  ('plan_free', 'contactos.importar'),
  ('plan_standard', 'contactos.importar'),
  ('plan_pro', 'contactos.importar'),
  ('plan_standard', 'contactos.exportar'),
  ('plan_pro', 'contactos.exportar'),
  ('plan_standard', 'contactos.duplicados'),
  ('plan_pro', 'contactos.duplicados'),
  ('plan_free', 'contactos.papelera'),
  ('plan_standard', 'contactos.papelera'),
  ('plan_pro', 'contactos.papelera'),
  ('plan_pro', 'pro:unlimited_leads'),
  ('plan_free', 'module:lists'),
  ('plan_standard', 'module:lists'),
  ('plan_pro', 'module:lists'),
  ('plan_standard', 'listas.automaticas'),
  ('plan_pro', 'listas.automaticas'),
  ('plan_standard', 'listas.grupos'),
  ('plan_pro', 'listas.grupos'),
  ('plan_pro', 'pro:unlimited_lists'),
  ('plan_free', 'module:templates'),
  ('plan_standard', 'module:templates'),
  ('plan_pro', 'module:templates'),
  ('plan_free', 'module:send'),
  ('plan_standard', 'module:send'),
  ('plan_pro', 'module:send'),
  ('plan_free', 'mensajes.whatsapp'),
  ('plan_standard', 'mensajes.whatsapp'),
  ('plan_pro', 'mensajes.whatsapp'),
  ('plan_free', 'mensajes.correo'),
  ('plan_standard', 'mensajes.correo'),
  ('plan_pro', 'mensajes.correo'),
  ('plan_standard', 'mensajes.llamadas'),
  ('plan_pro', 'mensajes.llamadas'),
  ('plan_standard', 'mensajes.tanda'),
  ('plan_pro', 'mensajes.tanda'),
  ('plan_pro', 'mensajes.programar'),
  ('plan_standard', 'mensajes.flujos'),
  ('plan_pro', 'mensajes.flujos'),
  ('plan_pro', 'mensajes.playbooks'),
  ('plan_pro', 'pro:unlimited_templates'),
  ('plan_pro', 'pro:unlimited_emails'),
  ('plan_standard', 'captacion.enlaces'),
  ('plan_pro', 'captacion.enlaces'),
  ('plan_pro', 'captacion.campanas'),
  ('plan_pro', 'captacion.formularios'),
  ('plan_standard', 'module:pipeline'),
  ('plan_pro', 'module:pipeline'),
  ('plan_free', 'module:tasks'),
  ('plan_standard', 'module:tasks'),
  ('plan_pro', 'module:tasks'),
  ('plan_standard', 'seguimiento.tablero'),
  ('plan_pro', 'seguimiento.tablero'),
  ('plan_pro', 'seguimiento.matriz'),
  ('plan_free', 'seguimiento.agenda'),
  ('plan_standard', 'seguimiento.agenda'),
  ('plan_pro', 'seguimiento.agenda'),
  ('plan_pro', 'seguimiento.google'),
  ('plan_pro', 'seguimiento.agendamiento'),
  ('plan_standard', 'module:dashboard'),
  ('plan_pro', 'module:dashboard'),
  ('plan_pro', 'analisis.reportes'),
  ('plan_free', 'module:history'),
  ('plan_standard', 'module:history'),
  ('plan_pro', 'module:history'),
  ('plan_free', 'module:community'),
  ('plan_standard', 'module:community'),
  ('plan_pro', 'module:community'),
  ('plan_free', 'comunidad.chat'),
  ('plan_standard', 'comunidad.chat'),
  ('plan_pro', 'comunidad.chat'),
  ('plan_standard', 'comunidad.directos'),
  ('plan_pro', 'comunidad.directos'),
  ('plan_pro', 'premium_aesthetics'),
  ('plan_free', 'correo.emailjs'),
  ('plan_standard', 'correo.emailjs'),
  ('plan_pro', 'correo.emailjs'),
  ('plan_pro', 'correo.resend'),
  ('plan_standard', 'correo.gmail'),
  ('plan_pro', 'correo.gmail'),
  ('plan_pro', 'plataforma.soporte_vip')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   No conviene revertirla entera: borrar `module:community` o
--   `comunidad.chat` cierra esas secciones para todo el mundo, porque
--   `hasFeature` falla cerrado.
--
--   Para deshacer solo las altas nuevas, sin tocar las doce que ya estaban:
--   delete from public.features where id like '%.%' and id not like 'module:%';
