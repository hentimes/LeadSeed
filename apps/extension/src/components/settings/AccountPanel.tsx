import { useState } from 'react';
import { Section, SettingGroup } from '../../design';
import AccountSettings from './AccountSettings';
import SupportTicketsSettings from './SupportTicketsSettings';

/**
 * Cuenta: quien eres, como entras y como pides ayuda.
 *
 * "Ayuda VIP" era una pestana de primer nivel para una bandeja de dos o tres
 * tickets. Baja aqui porque depende del plan, y el plan es justo lo que esta
 * pantalla ya muestra: no hay que cambiar de sitio para saber si te
 * corresponde.
 */
export default function AccountPanel({ initialBlock }: { initialBlock?: string }) {
  const [ayudaAbierta, setAyudaAbierta] = useState(initialBlock === 'ayuda-vip');

  return (
    <div className="flex flex-col gap-3">
      <AccountSettings />

      <SettingGroup label="Soporte">
        <Section
          title="Ayuda VIP"
          isOpen={ayudaAbierta}
          onToggle={() => setAyudaAbierta((abierto) => !abierto)}
        >
          <SupportTicketsSettings />
        </Section>
      </SettingGroup>
    </div>
  );
}
