import { useEffect, useState } from 'react';
import { getSettings, patchSettings } from '../../services/appSettingsService';
import { Select, SettingRow } from '../../design';
import { useAcusarGuardado } from '../../hooks/useAcusarGuardado';
import { describeError } from '../../utils/errorMessage';

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
  const [fallo, setFallo] = useState('');
  const { acusar, estaGuardado } = useAcusarGuardado();

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

  /*
   * Se guarda solo al elegir, asi que hace falta decir que se guardo.
   *
   * Antes no decia nada de nada: ni al lograrlo ni al fallar. Y como no habia
   * `catch`, un fallo se iba como promesa rechazada sin dueño mientras el
   * selector se quedaba mostrando el valor nuevo, que es la interfaz afirmando
   * un estado que la base no tiene.
   *
   * Al fallar se devuelve el selector a su valor anterior: es la unica forma
   * de que lo que se ve coincida con lo que hay guardado.
   */
  const cambiar = async (valor: 'web' | 'app') => {
    const anterior = preference;
    setPreference(valor);
    setFallo('');
    try {
      await patchSettings({ whatsappClientPreference: valor });
      acusar('cliente');
    } catch (error) {
      setPreference(anterior);
      setFallo(`No se pudo guardar: ${describeError(error)}`);
    }
  };

  if (loading) return null;

  return (
    <SettingRow
      label="Abrir WhatsApp en"
      hint={fallo || 'Dónde se abren los chats al enviar un mensaje'}
      control={
        <div className="flex items-center gap-2">
          {estaGuardado('cliente') && (
            <span className="text-micro font-semibold text-state-success" role="status">
              Guardado
            </span>
          )}
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
        </div>
      }
    />
  );
}
