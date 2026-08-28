import { useState } from 'react';
import { Section, SettingGroup } from '../../design';
import WhatsAppClientToggle from './WhatsAppClientToggle';
import EmailSettings from './EmailSettings';
import LinksSettings from './LinksSettings';

/**
 * Por donde entra y sale la comunicacion.
 *
 * Junta tres cosas que estaban en tres sitios distintos y responden a la misma
 * pregunta:
 *
 *  - **Correo**: era una pestana propia.
 *  - **Enlaces de captura**: era otra pestana propia. Es el canal de entrada
 *    de leads, igual que el correo es el de salida.
 *  - **WhatsApp**: vivia en "Apariencia" porque no habia donde ponerlo.
 *
 * Las dos secciones grandes van plegadas y solo una abierta a la vez: la de
 * correo carga las cuentas y la de enlaces carga los tipos de formulario, y
 * tener las dos abiertas hace las dos consultas para mirar una.
 */
export default function ChannelsSettings({ initialBlock }: { initialBlock?: string }) {
  const [abierta, setAbierta] = useState<string | null>(initialBlock ?? 'correo');

  const alternar = (id: string) => setAbierta((actual) => (actual === id ? null : id));

  return (
    <div className="flex flex-col gap-3">
      <SettingGroup label="WhatsApp">
        <WhatsAppClientToggle />
      </SettingGroup>

      <SettingGroup label="Correo">
        <Section
          title="Cuentas de correo"
          isOpen={abierta === 'correo'}
          onToggle={() => alternar('correo')}
        >
          <EmailSettings />
        </Section>
      </SettingGroup>

      <SettingGroup label="Captura">
        <Section
          title="Enlaces de captura"
          isOpen={abierta === 'enlaces'}
          onToggle={() => alternar('enlaces')}
        >
          <LinksSettings />
        </Section>
      </SettingGroup>
    </div>
  );
}
