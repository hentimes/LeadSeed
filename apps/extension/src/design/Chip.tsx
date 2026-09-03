import type { ReactNode } from 'react';

/**
 * FILTRO DE UN VALOR
 *
 * Pildora seleccionable de una fila de filtros. Se usa en las categorias de
 * Comunidad, que antes la resolvian con una funcion `chip()` declarada dentro
 * del propio componente.
 *
 * `aria-pressed` en vez de solo pintar el activo: un filtro es un interruptor,
 * y sin ese atributo un lector de pantalla lee cinco botones identicos sin
 * decir cual esta puesto.
 */
export function Chip({
  children,
  active = false,
  onClick,
  title,
  className = '',
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`h-control-sm shrink-0 whitespace-nowrap rounded-full px-3 text-meta font-semibold transition-colors ${
        active
          ? 'bg-primary text-ink-inverse'
          : 'bg-surface-sunken text-ink-secondary hover:bg-surface-hover hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * ELECCION ENTRE POCAS OPCIONES EXCLUYENTES
 *
 * Distinto de `Chip` a proposito: el chip filtra y se combina, esto elige uno
 * de un conjunto cerrado y siempre hay exactamente uno puesto. Visualmente eso
 * se dice con un carril hundido y una pastilla elevada encima, no con relleno
 * de marca.
 *
 * Los radios son cortos (`rounded-md` el carril, `rounded-sm` la pastilla) y no
 * `rounded-full`. Con el radio completo el control se lee como una fila de
 * pildoras sueltas -lo mismo que las fichas de categoria que se quitaron- en
 * vez de como un unico selector con dos posiciones.
 *
 * `role="radiogroup"` y no una fila de botones sueltos: es la semantica que
 * corresponde a "elegi uno", y hace que las flechas del teclado se muevan
 * entre opciones en vez de tabular una por una.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  collapseLabels = false,
  className = '',
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /** Nombre del grupo para el lector de pantalla. */
  label: string;
  /**
   * Deja solo los iconos mientras el panel sea angosto, y muestra los rotulos
   * -TODOS a la vez- a partir de `panel-lg`. Es el mismo criterio que las
   * pestanas de Configuracion.
   *
   * Se muestran todos o ninguno a proposito: ensenar el rotulo solo de la
   * opcion activa hace que las demas cambien de ancho en cada clic y los
   * iconos se corran de sitio.
   *
   * Exige que cada opcion traiga `icon`: sin el, colapsar el rotulo deja un
   * boton vacio.
   */
  collapseLabels?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex shrink-0 items-center gap-0.5 rounded-md bg-surface-sunken p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            // Con el rotulo colapsado el boton se queda sin texto: el nombre
            // accesible y el tooltip son lo unico que queda para saber que es.
            aria-label={collapseLabels ? option.label : undefined}
            title={collapseLabels ? option.label : undefined}
            className={`flex h-6 items-center gap-1 whitespace-nowrap rounded-sm text-meta font-semibold transition-colors ${
              collapseLabels ? 'px-2 panel-lg:px-2.5' : 'px-2.5'
            } ${active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink-secondary'}`}
          >
            {option.icon && (
              <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{option.icon}</span>
            )}
            <span className={collapseLabels ? 'hidden panel-lg:inline' : ''}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * CONTADOR PEGADO A LA ESQUINA DE UN BOTON
 *
 * El bloque `absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full ...`
 * estaba copiado tres veces (dos en la barra del chat, una en la tira de
 * mensajes directos), y las tres se separaban del fondo con
 * `border-2 border-white dark:border-gray-800`: un color literal que hay que
 * acordarse de cambiar en dos temas. Aca es `ring-surface`, que sigue al token.
 */
export function CountBadge({
  count,
  tone = 'primary',
  max = 99,
}: {
  count: number;
  tone?: 'primary' | 'danger';
  max?: number;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-micro font-bold text-ink-inverse ring-2 ring-surface ${
        tone === 'danger' ? 'bg-state-danger' : 'bg-primary'
      }`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
