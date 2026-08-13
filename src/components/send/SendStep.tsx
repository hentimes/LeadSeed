import type { ReactNode } from 'react';
import { CardTitle } from '../../design';

/**
 * Paso numerado del flujo de envio.
 *
 * Antes cada bloque escribia su propio numero en el titulo ("1. Seleccionar
 * Plantilla", "3. Destinatarios"). Como el paso 2 solo aparecia si habia
 * plantilla elegida, la pantalla mostraba "1" y "3" sin un "2" en medio, y
 * `CallSender` llegaba a titular "1. Seleccionar Guion" en su cuarto bloque.
 *
 * Aca el numero lo pone el contenedor segun la posicion real del paso, asi
 * que la numeracion no puede volver a descuadrarse.
 */
export function SendStep({
  step,
  title,
  actions,
  children,
  /** Paso aun no alcanzado: se atenua y no acepta interaccion. */
  disabled = false,
}: {
  step: number;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <section className={`card-standard ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <div className="card-header">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro font-bold text-primary">
            {step}
          </span>
          <CardTitle as="h2" className="truncate">{title}</CardTitle>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
