import type { ReactNode } from 'react';
import { nombreVisible, SIN_NOMBRE } from '../../utils/leadDisplay';

/**
 * Como se ve un lead en una fila, en cualquier lista de la aplicacion.
 *
 * Es el fragmento invariante que hasta el 2026-08-20 estaba escrito siete veces
 * con siete resultados distintos: la tabla de leads, el selector de envio
 * masivo, el modal de inscripcion a flujos, la tabla de listas, los dos paneles
 * de admin y el pipeline. Cada uno con su propio tamano de nombre, su propia
 * separacion y su propia respuesta -o ninguna- a que hacer cuando el lead no
 * tiene nombre.
 *
 * ## Que NO hace, y por que
 *
 * No conoce el tipo `Lead`. Recibe cadenas y nodos ya resueltos, asi que se
 * puede probar sin fixtures del dominio y no arrastra el modelo de datos a cada
 * sitio que la use.
 *
 * No dibuja el avatar: lo recibe. Cada lista tiene el suyo -la tabla de leads
 * le superpone un boton de pin al pasar el raton, el chat usa una foto real- y
 * meter esas variantes aca seria bifurcar por sitio, que es justo lo que esta
 * primitiva viene a impedir.
 *
 * No pone la fila ni su fondo. Un `<tr>` solo admite `<td>` como hijo directo,
 * asi que una primitiva que ademas fuera el contenedor no podria servir a la
 * vez a las tablas reales y a las listas. Esto es contenido; el contenedor lo
 * pone cada sitio.
 *
 * ## Que si hace
 *
 * Aplica el respaldo del nombre por su cuenta. Si dependiera de que cada sitio
 * se acordase de llamar a `nombreVisible`, volveriamos a tener listas que se
 * olvidan -que es exactamente el estado del que venimos: cuatro de las siete lo
 * hacian-.
 */

/** Los dos tamanos de fila. `compacta` la usa la tabla de leads con `compactMode`. */
export type LeadIdentityDensity = 'compact' | 'normal';

const DENSIDAD: Record<LeadIdentityDensity, { hueco: string; separacionDetalle: string }> = {
  compact: { hueco: 'gap-1.5', separacionDetalle: 'mt-0' },
  normal: { hueco: 'gap-2', separacionDetalle: 'mt-0.5' },
};

interface LeadIdentityProps {
  /**
   * Nombre del lead, tal como viene del dato. Puede llegar vacio: el respaldo
   * se resuelve aqui dentro, no en quien llama.
   */
  name: string;
  /**
   * Linea secundaria bajo el nombre: el RUT, la empresa, el telefono o el
   * correo, segun la lista. Si no se pasa, no se reserva su alto.
   */
  caption?: ReactNode;
  /**
   * Avatar ya armado. Si no se pasa, el nombre empieza pegado al borde en vez
   * de dejar un hueco vacio: las listas sin avatar -envio masivo, flujos- no
   * deben pagar el ancho de algo que no muestran.
   */
  avatar?: ReactNode;
  /**
   * Distintivos en linea junto al nombre: contadores de envio, alerta de cruce,
   * dias sin contacto. Si no se pasan, no se reserva su ancho.
   *
   * Ojo con la memoizacion: la fila de la tabla de leads se compara por
   * referencia, asi que este nodo debe venir de un `useMemo` con las mismas
   * dependencias que use el comparador, o la memoizacion se rompe en silencio.
   */
  badges?: ReactNode;
  density?: LeadIdentityDensity;
  className?: string;
}

export default function LeadIdentity({
  name,
  caption,
  avatar,
  badges,
  density = 'normal',
  className = '',
}: LeadIdentityProps) {
  const visible = nombreVisible(name);
  const sinNombre = visible === SIN_NOMBRE;
  const escala = DENSIDAD[density];

  return (
    <div className={`flex items-center ${escala.hueco} min-w-0 ${className}`}>
      {avatar}

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {/*
            El respaldo se pinta atenuado y en cursiva a proposito. Con el mismo
            peso que un nombre real, "Sin nombre" se lee como si alguien se
            llamara asi; atenuado se lee como lo que es, un dato que falta.
          */}
          <span
            className={`truncate text-body font-medium ${
              sinNombre ? 'italic text-ink-muted' : 'text-ink'
            }`}
          >
            {visible}
          </span>
          {badges}
        </div>

        {caption !== undefined && caption !== null && caption !== '' && (
          <div className={`truncate text-meta text-ink-secondary ${escala.separacionDetalle}`}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}
