import type { ReactNode } from 'react';
import { Icon } from '../../utils/icons';
import { CHANNELS, type SendChannel } from './channels';

const TAB_ICONS: Record<SendChannel, () => ReactNode> = {
  whatsapp: Icon.WhatsAppOutline,
  email: Icon.EmailOutline,
  call: Icon.PhoneOutline,
};

/**
 * Pestanas de canal.
 *
 * Antes eran pastillas grises sobre `bg-gray-100`, un patron que no existe
 * en ninguna otra seccion. El Dashboard usa pestanas con subrayado sobre
 * `border-line`, y son las que se replican aca para que las dos secciones
 * se lean como el mismo producto.
 */
export function SendTabs({
  active,
  onChange,
}: {
  active: SendChannel;
  onChange: (channel: SendChannel) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Canal de envío"
      className="flex w-full items-end border-b border-line pb-1"
    >
      {(Object.keys(CHANNELS) as SendChannel[]).map((channel) => {
        const TabIcon = TAB_ICONS[channel];
        const isActive = active === channel;

        return (
          <button
            key={channel}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(channel)}
            className={`-mb-[5px] flex flex-1 items-center justify-center gap-1.5 border-b-[2px] pb-3 text-body font-medium transition-all ${
              isActive ? 'border-primary text-ink' : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <span className={isActive ? CHANNELS[channel].glyphClass : ''}>
              <TabIcon />
            </span>
            {CHANNELS[channel].label}
          </button>
        );
      })}
    </div>
  );
}
