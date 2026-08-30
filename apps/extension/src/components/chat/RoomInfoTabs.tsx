import { useRef, type ReactNode } from 'react';

/**
 * BARRA DE SECCIONES DE LA SALA
 *
 * Mismo patron que las pestanas de Configuracion (`pages/settings/SettingsTabs`),
 * a proposito: es la navegacion por pestanas que ya tiene el producto y no hay
 * motivo para que esta se comporte distinto.
 *
 * ## Por que no se ensena solo el rotulo de la activa
 *
 * Fue el primer intento y estaba mal. Con la etiqueta unicamente en la pestana
 * abierta, esa pestana medía ~110px y las otras 32: al cambiar de seccion las
 * cinco cambiaban de ancho y **todos los iconos se corrian de sitio**. Se
 * pierde la referencia de donde hay que tocar, y cada clic parece reordenar la
 * barra entera.
 *
 * Aqui cada pestana es `flex-1`: las cinco miden lo mismo y no se mueven nunca,
 * pase lo que pase. El nombre se consulta con el `title` -aparece al posarse
 * encima- y se escribe, en las CINCO a la vez, cuando el panel es lo bastante
 * ancho para que quepan.
 *
 * ## El punto de corte
 *
 * `panel-lg` son 548px de ventana, con los que el modal llega a su tope de
 * 480px: quedan 456 utiles, o sea 91px por pestana. El rotulo mas largo
 * ("Descripcion", 11 caracteres) pide unos 82 con su icono. Entra.
 *
 * Restriccion que hereda quien agregue una seccion: con seis quedan 76px cada
 * una y el modo con texto deja de caber. A partir de ahi hay que subir el tope
 * del modal o acortar los rotulos.
 */

export interface RoomInfoTab {
  id: string;
  label: string;
  icon: ReactNode;
  /** Cuantos elementos hay dentro. Cero o ausente no muestra nada. */
  count?: number;
}

export default function RoomInfoTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: RoomInfoTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  const barraRef = useRef<HTMLDivElement>(null);

  /*
   * Roving tabindex: la barra entera es UNA parada de tabulacion y dentro se
   * mueve con las flechas, que es el patron de pestanas de la guia WAI-ARIA.
   * Sin esto, llegar al contenido cuesta cinco tabulaciones.
   */
  const alPulsar = (event: React.KeyboardEvent, indice: number) => {
    const teclas: Record<string, number> = {
      ArrowRight: indice + 1,
      ArrowLeft: indice - 1,
      Home: 0,
      End: tabs.length - 1,
    };

    const destino = teclas[event.key];
    if (destino === undefined) return;

    event.preventDefault();
    const acotado = (destino + tabs.length) % tabs.length;
    const siguiente = tabs[acotado];
    if (!siguiente) return;

    onChange(siguiente.id);

    const botones = barraRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    botones?.[acotado]?.focus();
  };

  return (
    <div
      ref={barraRef}
      role="tablist"
      aria-label="Secciones de la sala"
      className="flex w-full min-w-0 items-end border-b border-line pb-1"
    >
      {tabs.map((tab, indice) => {
        const activa = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activa}
            aria-controls={`panel-${tab.id}`}
            // El nombre accesible va siempre: por debajo de `panel-lg` la
            // etiqueta esta oculta y solo se ve el icono.
            aria-label={tab.count ? `${tab.label}, ${tab.count}` : tab.label}
            title={tab.label}
            tabIndex={activa ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => alPulsar(event, indice)}
            className={`relative -mb-[5px] flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 border-b-[2px] pb-3 text-body font-medium transition-colors ${
              activa
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <span className="shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">{tab.icon}</span>

            <span className="hidden truncate panel-lg:inline">
              {tab.label}
              {!!tab.count && <span className="ml-1 font-normal text-ink-muted">{tab.count}</span>}
            </span>

            {/*
              Con el rotulo oculto, el contador se reduce a un punto. Va
              `absolute` para que no participe del layout: si ocupara sitio, que
              entre o salga un archivo movería la barra, que es justo lo que
              esta version viene a evitar.
            */}
            {!!tab.count && (
              <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-primary panel-lg:hidden" />
            )}
          </button>
        );
      })}
    </div>
  );
}
