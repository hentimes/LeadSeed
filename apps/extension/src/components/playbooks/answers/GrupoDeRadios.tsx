import type { KeyboardEvent, ReactNode } from 'react';

/**
 * Un grupo de radios con navegacion por flechas.
 *
 * ## Por que hace falta escribirlo
 *
 * Los controles de estado son `<button role="radio">` y no `<input>` nativos,
 * porque hacen algo que el radio nativo no sabe: volver a tocar el activo lo
 * DESMARCA, que es como se vuelve a "sin clasificar". Ese cuarto estado -no
 * haber contestado- es tan real como los otros tres.
 *
 * El precio de renunciar al nativo es que las flechas dejan de funcionar solas.
 * La primera version de la clasificacion se lo dejo sin resolver: cada boton
 * era una parada de tabulador, asi que recorrer seis criterios costaba
 * dieciocho pulsaciones en vez de seis. Aqui se paga ese precio una vez, en el
 * sitio compartido, en lugar de repetir el defecto en los tres cuerpos.
 *
 * ## Roving tabindex
 *
 * Del grupo entero se entra una sola vez con Tab -al activo, o al primero si no
 * hay ninguno- y dentro se mueve con las flechas. Es lo que espera cualquiera
 * que navegue sin raton, y es lo que dice el patron de la WAI para radiogroup.
 * El `tabIndex` de cada boton lo pone quien lo monta; aqui van las flechas.
 */
interface Props {
  label: string;
  children: ReactNode;
  className?: string;
}

export function GrupoDeRadios({ label, children, className = '' }: Props) {
  const mover = (evento: KeyboardEvent<HTMLDivElement>) => {
    const teclas = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!teclas.includes(evento.key)) return;

    const radios = Array.from(
      evento.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])'),
    );
    if (radios.length === 0) return;

    const actual = radios.findIndex((radio) => radio === document.activeElement);
    const salto = evento.key === 'ArrowRight' || evento.key === 'ArrowDown' ? 1 : -1;
    // Da la vuelta: en un grupo de dos o tres, llegar al borde y quedarse
    // parado se siente como que el teclado dejo de responder.
    const destino = radios[(actual + salto + radios.length) % radios.length];

    if (!destino) return;
    evento.preventDefault();
    destino.focus();
    // El patron de radiogroup selecciona al mover, no solo enfoca.
    destino.click();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={mover}
      className={`flex shrink-0 items-center gap-0.5 rounded-md bg-surface p-0.5 ${className}`}
    >
      {children}
    </div>
  );
}
