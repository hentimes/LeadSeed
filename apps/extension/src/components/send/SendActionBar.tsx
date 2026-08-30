import { Button } from '../../design';
import type { SendActionState } from './channels';

/**
 * BARRA DE ACCION DEL ENVIO
 *
 * ## Por que existe
 *
 * El boton primario estaba al final de la columna, debajo de la lista de
 * destinatarios. Medido en un panel de 400px con una plantilla elegida, la
 * pagina media unos 1.130px y el visible ronda los 600: el boton caia en el
 * ultimo 8% del documento. Habia que bajar tres pantallas para encontrar el
 * unico control que hace algo.
 *
 * ## Por que `fixed` y no `sticky`
 *
 * `sticky` necesita que el contenedor de scroll sea un ancestro cercano, y aca
 * el que scrollea es el `<main>` de `AppLayout`, dos niveles mas arriba,
 * pasando por `PageShell`. Para que `sticky` funcionara habria que meter
 * `send` en `PAGE_FILL_HEIGHT` y dar scroll propio a cada sender: una
 * reestructuracion de layout mucho mas grande.
 *
 * `fixed` con el hueco del rail descontado ya es un patron probado en el
 * proyecto -`LeadsPageToasts` y `LeadAlertToast` lo usan-, asi que se copia esa
 * formula en vez de inventar una.
 *
 * ## Por que vive en `SendPage` y NUNCA dentro de un sender
 *
 * Los tres senders llevan `animate-ios-slide-up`, que termina en `forwards`: el
 * `transform` del ultimo fotograma **no se descarta**. Un elemento con
 * `transform` crea bloque contenedor para sus descendientes `fixed`, asi que
 * una barra fija montada dentro de un sender se anclaria al sender y no a la
 * ventana. Se veria bien mientras el sender ocupa la pantalla y se despegaria
 * en cuanto no. Es la misma trampa que ya documenta `design/Modal.tsx`.
 *
 * ## El boton no se apaga nunca
 *
 * Ver `SendActionState`. Con algo pendiente va como `secondary` -5.96:1, mas
 * legible que el primario deshabilitado de antes, que daba 1.04:1- y lleva a lo
 * que falta. Solo se llena de marca cuando de verdad envia: ese relleno es la
 * senal de "ya esta", legible de un vistazo sin leer el rotulo.
 */
export function SendActionBar({ action }: { action: SendActionState | null }) {
  if (!action) return null;

  const listo = action.razonPendiente === null;

  return (
    /*
     * `left-0` y el hueco del rail a la derecha: la barra abarca el ancho del
     * contenido, igual que el `<main>` que la contiene visualmente. El relleno
     * propio la alinea con las tarjetas.
     *
     * `z-40` iguala al rail para no quedar por debajo cuando esta abierto; los
     * modales van por encima con su propio portal.
     */
    <div className="fixed bottom-0 left-0 right-[var(--ls-rail-width)] z-40 border-t border-line bg-surface px-3 py-2.5 shadow-bar">
      <Button
        variant={listo ? 'primary' : 'secondary'}
        onClick={action.onTrigger}
        disabled={action.razonPendiente === 'enviando'}
        className="h-control-lg w-full text-body font-semibold"
      >
        {action.label}
      </Button>
    </div>
  );
}
