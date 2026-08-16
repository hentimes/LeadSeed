import { Icon } from '../../utils/icons';

export type TemplateChannel = 'whatsapp' | 'email' | 'call';

const CANALES: Array<{ id: TemplateChannel; label: string; glifo: () => JSX.Element }> = [
  { id: 'whatsapp', label: 'WhatsApp', glifo: Icon.WhatsAppOutline },
  { id: 'email', label: 'Email', glifo: Icon.EmailOutline },
  { id: 'call', label: 'Llamadas', glifo: Icon.PhoneOutline },
];

interface Props {
  active: TemplateChannel;
  onChange: (canal: TemplateChannel) => void;
}

/**
 * Selector de canal de la pantalla de plantillas.
 *
 * Antes eran tres pastillas de colores plenos -verde, azul, ambar- que ademas
 * pintaban el canal con los tokens de estado: el mismo verde que significa
 * "exito" en el resto de la aplicacion. Ahora usa el subrayado del compositor
 * de envio, que es el patron vigente: al moverse entre Plantillas y Enviar el
 * canal deja de cambiar de idioma visual.
 */
export function ChannelTabs({ active, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Canal" className="flex border-b border-line">
      {CANALES.map(({ id, label, glifo }) => {
        const activo = id === active;
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={activo}
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-body transition-colors ${
              activo
                ? 'border-primary font-semibold text-ink'
                : 'border-transparent font-medium text-ink-secondary hover:text-ink'
            }`}
          >
            <span className={activo ? 'text-primary' : 'text-ink-muted'}>{glifo()}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
