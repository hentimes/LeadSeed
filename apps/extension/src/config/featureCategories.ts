/**
 * Las categorias del catalogo de funcionalidades.
 *
 * Viven aqui y no en la base porque son un vocabulario cerrado: cada una
 * corresponde a una parte de la aplicacion, y añadir una es una decision de
 * producto que va acompañada de las funcionalidades que la pueblan. Una tabla
 * suelta invitaria a crear categorias vacias desde el panel.
 *
 * El orden es el que se ve al componer un plan, y va de lo que todo el mundo
 * usa a lo que casi nadie toca.
 */
export interface CategoriaDeFuncionalidad {
  id: string;
  nombre: string;
  /** Una linea. Se ve bajo el titulo del grupo al componer un plan. */
  resumen: string;
}

export const CATEGORIAS: CategoriaDeFuncionalidad[] = [
  { id: 'contactos', nombre: 'Contactos', resumen: 'La base de contactos y lo que se hace con ella' },
  { id: 'listas', nombre: 'Listas', resumen: 'Agrupar contactos a mano o por reglas' },
  { id: 'mensajes', nombre: 'Mensajes', resumen: 'Plantillas, envíos y secuencias' },
  { id: 'captacion', nombre: 'Captación', resumen: 'Formularios, enlaces y campañas' },
  { id: 'seguimiento', nombre: 'Seguimiento', resumen: 'Embudo, tareas y agenda' },
  { id: 'analisis', nombre: 'Análisis', resumen: 'Panel, reportes e historial' },
  { id: 'comunidad', nombre: 'Comunidad', resumen: 'Foro, chat y perfil' },
  { id: 'correo', nombre: 'Correo', resumen: 'Por dónde salen los correos' },
  { id: 'plataforma', nombre: 'Plataforma', resumen: 'Soporte, roles y administración' },
];

/** Como se llama una categoria. Devuelve la clave si no la conoce. */
export function nombreDeCategoria(id: string | null | undefined): string {
  if (!id) return 'Sin clasificar';
  return CATEGORIAS.find((c) => c.id === id)?.nombre ?? id;
}
