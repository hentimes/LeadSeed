/**
 * ESQUELETO DE CARGA
 *
 * Reemplaza los "Cargando sala..." y los spinners a pantalla completa. La
 * diferencia no es decorativa: un spinner tapa la pantalla y no dice cuanto
 * queda ni que va a aparecer; un esqueleto conserva la estructura, asi que
 * cuando llegan los datos nada se mueve de sitio.
 *
 * Usa `animate-pulse` de Tailwind, que la regla global de
 * `prefers-reduced-motion` de index.css ya neutraliza sola.
 *
 * `aria-hidden`: para un lector de pantalla estas cajas no son contenido. Quien
 * monta el esqueleto pone el aviso de carga real (`role="status"`) una sola vez
 * alrededor, en vez de que se anuncien quince rectangulos.
 */
export function Skeleton({
  shape = 'text',
  width,
  height,
  className = '',
}: {
  shape?: 'text' | 'circle' | 'block';
  width?: string;
  height?: string;
  className?: string;
}) {
  const formas = {
    text: 'h-3 rounded-sm',
    circle: 'rounded-full',
    block: 'rounded-lg',
  };

  return (
    <span
      aria-hidden="true"
      style={{ width, height }}
      className={`block animate-pulse bg-surface-sunken ${formas[shape]} ${className}`}
    />
  );
}
