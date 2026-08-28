import { useEffect, useState } from 'react';
import { getSettings, patchSettings } from '../../services/appSettingsService';
import { Select, SettingRow } from '../../design';

/**
 * A donde se abre un envio de WhatsApp.
 *
 * Era una `Card` de 96px con un icono verde de 40px, un titulo de seccion, un
 * parrafo y un segmentado de dos botones cuyos rotulos -"WhatsApp Web
 * (Pestaña)" y "App de Escritorio"- no caben juntos por debajo de 500px: uno
 * de los dos se recortaba siempre.
 *
 * Es una eleccion entre dos valores que se guarda sola: eso es un selector,
 * y cabe en una fila de 52px.
 *
 * Ademas vivia en "Apariencia", que es donde llevaba desde el principio por
 * accidente. No es una preferencia visual; es por que canal sale el mensaje.
 */
export default function WhatsAppClientToggle() {
  const [preference, setPreference] = useState<'web' | 'app'>('web');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    void getSettings().then((settings) => {
      if (!activo) return;
      setPreference(settings.whatsappClientPreference || 'web');
      setLoading(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  const cambiar = async (valor: 'web' | 'app') => {
    setPreference(valor);
    await patchSettings({ whatsappClientPreference: valor });
  };

  if (loading) return null;

  return (
    <SettingRow
      label="Abrir WhatsApp en"
      hint="Dónde se abren los chats al enviar un mensaje"
      control={
        <Select
          compact
          fullWidth={false}
          aria-label="Cliente de WhatsApp"
          value={preference}
          onChange={(event) => void cambiar(event.target.value as 'web' | 'app')}
          className="w-[140px]"
        >
          <option value="web">WhatsApp Web</option>
          <option value="app">App de escritorio</option>
        </Select>
      }
    />
  );
}
