import type { ReactNode } from 'react';
import { CardTitle } from '../../design';

/**
 * BLOQUE DEL ENVIO
 *
 * ## Se fueron los numeros
 *
 * Esto pintaba un circulo con el ordinal del 1 al 4. Cuatro tarjetas numeradas
 * prometen un procedimiento de cuatro etapas, y aca no hay tal cosa: no hay
 * orden obligatorio -se pueden elegir destinatarios antes que plantilla-, no
 * hay validacion por etapa y no se avanza, porque todo esta en la misma
 * pantalla. La numeracion describia una maquina que no existe.
 *
 * El orden vertical ya dice la secuencia. Y los circulos costaban 20px del
 * ancho util de 336, repitiendo cuatro veces un chip de marca que competia con
 * el subrayado de la navegacion de arriba.
 *
 * Ademas quedan tres bloques y no cuatro: "Enviar" dejo de ser una tarjeta
 * cuando su boton se mudo al pie fijo.
 *
 * ## Se fue tambien `disabled`
 *
 * Habia un modo atenuado, `opacity-50 pointer-events-none`, para los pasos que
 * todavia no se podian usar. Estaba mal por dos motivos independientes:
 *
 *  1. Medido, el texto quedaba en 3.32:1 sobre la superficie, por debajo del
 *     4.5:1 de WCAG 1.4.3. Y lo que se volvia ilegible era justo el rotulo que
 *     hay que leer para entender por que el bloque esta apagado.
 *  2. `pointer-events-none` **no saca del orden de tabulacion**. Con el teclado
 *     se entraba al textarea de un paso "apagado" y se podia escribir. Era un
 *     estado falso.
 *
 * En su lugar, un bloque no disponible no se atenua: se encoge a `SendRequisito`,
 * una fila de una linea a contraste pleno que dice que falta.
 */
export function SendStep({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card-standard">
      <div className="card-header">
        <CardTitle as="h2" className="min-w-0 truncate">
          {title}
        </CardTitle>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Bloque todavia no alcanzado: una fila plana que nombra el requisito.
 *
 * Plana y no tarjeta a proposito. La tarjeta es la senal de "esto es lo que
 * estas haciendo ahora", y solo hay una a la vez; cuando todo es tarjeta, ser
 * tarjeta deja de significar algo. Esto es indice, no trabajo.
 *
 * `text-ink-secondary` para el requisito y no `text-ink-muted`: medido, `muted`
 * da 4.30:1 sobre `surface-sunken` y se queda corto. La frase que explica por
 * que no podes seguir es lo ultimo que se puede atenuar.
 */
export function SendRequisito({ title, requisito }: { title: string; requisito: string }) {
  return (
    <div className="border-t border-line-soft px-1 py-2">
      <p className="text-body font-medium text-ink">{title}</p>
      <p className="mt-0.5 text-meta text-ink-secondary">{requisito}</p>
    </div>
  );
}
