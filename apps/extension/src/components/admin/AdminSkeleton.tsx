/**
 * Esqueleto de carga, uno para todo Admin.
 *
 * Antes cada sub-vista escribia su propia frase: "Cargando telemetria...",
 * "Cargando inventario de la nube...", "Cargando requerimientos...", "Cargando
 * base del usuario...", "Cargando estadisticas del helper...". Cinco textos
 * distintos, todos centrados en mitad de la pantalla, que ademas **sustituian
 * la vista entera**: al cambiar de seccion desaparecia hasta la cabecera con
 * el nombre del usuario, asi que durante un segundo no se sabia ni a quien
 * estabas mirando.
 *
 * Esto ocupa el sitio del contenido que viene, dentro de la seccion, y deja
 * todo lo demas en su lugar.
 */
export default function AdminSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-md bg-surface-sunken" />
      ))}
    </div>
  );
}
