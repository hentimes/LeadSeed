import type { ReactNode } from 'react';
import { avatarUrl } from '../utils/avatar';

/**
 * FOTO DE PERSONA
 *
 * Antes esto era `<img className="w-8 h-8 rounded-full object-cover ...">`
 * copiado en nueve sitios de ocho archivos, cada uno con su propio tamano, su
 * propio borde y su propia variante `dark:` para ese borde. El punto verde de
 * conectado estaba reimplementado tres veces y el marco dorado de cuenta
 * premium, dos.
 *
 * El respaldo cuando no hay foto -las iniciales dibujadas localmente- ya vivia
 * en `utils/avatar.ts`; aca solo se consume, para que ningun consumidor tenga
 * que acordarse de llamarlo.
 */

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Lado en pixeles, no clase, porque tambien lo necesita el punto de estado. */
const SIZES: Record<Size, { caja: string; punto: string; marco: string }> = {
  xs: { caja: 'h-5 w-5', punto: 'h-1.5 w-1.5', marco: 'p-[1px]' },
  sm: { caja: 'h-6 w-6', punto: 'h-2 w-2', marco: 'p-[1px]' },
  md: { caja: 'h-7 w-7', punto: 'h-2 w-2', marco: 'p-[1.5px]' },
  lg: { caja: 'h-8 w-8', punto: 'h-2.5 w-2.5', marco: 'p-[2px]' },
  xl: { caja: 'h-9 w-9', punto: 'h-2.5 w-2.5', marco: 'p-[2px]' },
};

/**
 * El anillo se dibuja con `ring` y no con `border`. Con `border` el borde come
 * del ancho declarado, asi que un avatar de 32px con borde de 2 deja 28 de
 * foto y los avatares con y sin borde dejan de alinearse. `ring` se pinta por
 * fuera y no altera la caja.
 */
const RINGS = {
  none: '',
  /** Separa el avatar del fondo cuando se superpone a otro. */
  surface: 'ring-2 ring-surface',
  /** Conversacion abierta, en la tira de mensajes directos. */
  active: 'ring-2 ring-primary',
} as const;

export function Avatar({
  name,
  src,
  size = 'lg',
  ring = 'none',
  online = false,
  premium = false,
  className = '',
}: {
  name?: string | null;
  src?: string | null;
  size?: Size;
  ring?: keyof typeof RINGS;
  /** Punto verde de conectado. */
  online?: boolean;
  /** Marco dorado de cuenta premium. */
  premium?: boolean;
  className?: string;
}) {
  const { caja, punto, marco } = SIZES[size];

  const foto = (
    <img
      src={avatarUrl(name, src)}
      alt=""
      className={`${caja} shrink-0 rounded-full object-cover ${RINGS[ring]}`}
    />
  );

  if (!online && !premium) {
    return className ? <span className={`inline-flex ${className}`}>{foto}</span> : foto;
  }

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {premium ? (
        <span className={`rounded-full bg-gradient-to-tr from-accent to-accent-strong ${marco}`}>
          {foto}
        </span>
      ) : (
        foto
      )}

      {online && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-state-success ring-2 ring-surface ${punto}`}
        />
      )}
    </span>
  );
}

/**
 * Pila de avatares superpuestos, con un "+N" cuando no caben.
 *
 * Nace para el aviso de gente conectada de Comunidad: la version anterior era
 * una columna lateral de 256px que en un panel de 320 no cabia -de hecho
 * estaba tras un `hidden md:flex` que nunca se activo-. Superpuestos, seis
 * personas ocupan 88px.
 */
export function AvatarStack({
  people,
  max = 5,
  size = 'sm',
  children,
}: {
  people: { id: string; name?: string | null; avatarUrl?: string | null }[];
  max?: number;
  size?: Size;
  /** Texto a la derecha de la pila. */
  children?: ReactNode;
}) {
  const visibles = people.slice(0, max);
  const resto = people.length - visibles.length;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex items-center">
        {visibles.map((persona, indice) => (
          <span key={persona.id} className={indice === 0 ? '' : '-ml-2'}>
            <Avatar name={persona.name} src={persona.avatarUrl} size={size} ring="surface" />
          </span>
        ))}

        {resto > 0 && (
          <span
            className={`-ml-2 flex ${SIZES[size].caja} items-center justify-center rounded-full bg-surface-sunken text-micro font-semibold text-ink-secondary ring-2 ring-surface`}
          >
            +{resto > 9 ? 9 : resto}
          </span>
        )}
      </div>

      {children && <span className="min-w-0 truncate">{children}</span>}
    </div>
  );
}
