import { useEffect, useState } from 'react';
import {
  getAlertPreferences,
  setAlertTypePreference,
  setAppointmentLeadMinutes,
} from '../../platform/alertNotifier';
import {
  ALERT_FAMILIES,
  ALERT_TYPE_LABELS,
  type AlertPreferences,
  type AlertType,
  type AlertTypePreference,
} from '../../types';
import { Badge, IconButton, Input, Section, SettingGroup, SettingRow, Switch } from '../../design';

type ClaveCanal = keyof Pick<AlertTypePreference, 'sound' | 'desktop' | 'onlyWhenClosed'>;

/**
 * Los tres canales de una alerta, con su explicacion en el `title`.
 *
 * El texto explicativo ("Notificacion del sistema", "Tono al recibirla")
 * cuenta **como funciona por dentro**, no que hace. Eso no gana un renglon en
 * pantalla: vive en el `title` del control, que es donde se busca cuando hace
 * falta.
 */
const CANALES: { key: ClaveCanal; label: string; hint: string }[] = [
  { key: 'desktop', label: 'Aviso del sistema', hint: 'Notificación del escritorio' },
  { key: 'sound', label: 'Sonido', hint: 'Tono al recibirla' },
  { key: 'onlyWhenClosed', label: 'Solo con la extensión cerrada', hint: 'No avisar si ya la tienes abierta' },
];

const chevron = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Que te avisa y como.
 *
 * ## La tabla que nadie llego a ver
 *
 * Esto era una rejilla de cinco columnas -Alerta, Activa, Aviso, Sonido, Solo
 * cerrada- cuya cabecera se declaraba `hidden sm:grid`. `sm:` empieza en 640px
 * y esta extension vive en un panel lateral: **la cabecera no se ha
 * renderizado nunca**. El resultado era una fila con cuatro casillas sueltas
 * sin nada que dijera cual era cual, salvo un texto de 11px repetido al lado
 * de cada una.
 *
 * Ahora cada canal es una fila con su rotulo completo, siempre legible, y las
 * tres se pliegan bajo la alerta a la que pertenecen.
 *
 * ## Y por que ademas hay familias
 *
 * Siete alertas de dos lineas son 420px de reposo. Plegadas en dos familias,
 * ~100px, y la cifra de la cabecera ("3 de 3") contesta sin abrir nada la
 * pregunta que trae aqui a la gente: que tengo silenciado. Eso es informacion
 * que antes exigia leer siete pistas.
 *
 * ## Y por que estaba escondida en "Apariencia"
 *
 * Porque no habia otro sitio. Silenciar un aviso no es un ajuste visual;
 * ahora es una pestana propia, que es donde se busca.
 */
export default function AlertsManager() {
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [minutos, setMinutos] = useState('15');
  const [abierta, setAbierta] = useState<AlertType | null>(null);
  // Todas cerradas al entrar: en esta pantalla el reposo es el valor.
  const [familiaAbierta, setFamiliaAbierta] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    void getAlertPreferences().then((cargadas) => {
      if (!activo) return;
      setPrefs(cargadas);
      setMinutos(String(cargadas.appointmentLeadMinutes));
    });
    return () => {
      activo = false;
    };
  }, []);

  const alternar = async (type: AlertType, key: keyof AlertTypePreference, value: boolean) => {
    setPrefs(await setAlertTypePreference(type, { [key]: value }));
  };

  const guardarMinutos = async () => {
    const parsed = Number(minutos);
    if (!Number.isFinite(parsed)) {
      setMinutos(String(prefs?.appointmentLeadMinutes ?? 15));
      return;
    }
    const siguiente = await setAppointmentLeadMinutes(parsed);
    setPrefs(siguiente);
    setMinutos(String(siguiente.appointmentLeadMinutes));
  };

  if (!prefs) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-surface-sunken" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {ALERT_FAMILIES.map((familia) => {
        const activas = familia.types.filter((type) => prefs.byType[type].enabled).length;
        const total = familia.types.length;
        const tono = activas === 0 ? 'danger' : activas < total ? 'warning' : 'neutral';

        return (
          <SettingGroup key={familia.id}>
            <Section
              id={familia.id}
              title={familia.title}
              badge={<Badge tone={tono}>{activas} de {total}</Badge>}
              isOpen={familiaAbierta === familia.id}
              onToggle={() => {
                setFamiliaAbierta((actual) => (actual === familia.id ? null : familia.id));
                // Cerrar la familia devuelve sus alertas al reposo. Sin esto,
                // la que dejaste con los canales desplegados reaparecia
                // desplegada al reabrir, sin haberla vuelto a pulsar.
                setAbierta(null);
              }}
            >
              <div className="overflow-hidden rounded-md border border-line divide-y divide-line">
                {familia.types.map((type) => {
                  const pref = prefs.byType[type];
                  const meta = ALERT_TYPE_LABELS[type];
                  // Apagar la alerta con el panel abierto quita el panel del
                  // DOM: el estado anunciado sigue a lo que se pinta.
                  const desplegada = abierta === type && pref.enabled;

                  // Resumen de lo encendido, para no tener que abrirla.
                  const canalesActivos = CANALES.filter((canal) => pref[canal.key]).map(
                    (canal) => canal.label,
                  );
                  const resumen = !pref.enabled
                    ? 'Desactivada'
                    : canalesActivos.length > 0
                      ? canalesActivos.join(' · ')
                      : 'Solo dentro de la app';

                  return (
                    <SettingRow
                      key={type}
                      label={meta.title}
                      hint={resumen}
                      control={
                        <div className="flex items-center gap-1">
                          <Switch
                            label={meta.title}
                            title={meta.description}
                            checked={pref.enabled}
                            onChange={(event) => void alternar(type, 'enabled', event.target.checked)}
                          />
                          <IconButton
                            size="sm"
                            label={
                              desplegada
                                ? `Ocultar opciones de ${meta.title}`
                                : `Opciones de ${meta.title}`
                            }
                            aria-expanded={desplegada}
                            disabled={!pref.enabled}
                            onClick={() => setAbierta(desplegada ? null : type)}
                            icon={
                              <span className={`transition-transform ${desplegada ? 'rotate-180' : ''}`}>
                                {chevron}
                              </span>
                            }
                          />
                        </div>
                      }
                    >
                      {desplegada && (
                        <div className="overflow-hidden rounded-md border border-line divide-y divide-line">
                          {CANALES.map((canal) => (
                            <SettingRow
                              key={canal.key}
                              label={<span className="text-micro">{canal.label}</span>}
                              control={
                                <Switch
                                  label={`${canal.label} en ${meta.title}`}
                                  title={canal.hint}
                                  checked={pref[canal.key]}
                                  onChange={(event) =>
                                    void alternar(type, canal.key, event.target.checked)
                                  }
                                />
                              }
                            />
                          ))}

                          {type === 'upcoming_appointment' && (
                            <SettingRow
                              label={<span className="text-micro">Antelación</span>}
                              control={
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={240}
                                    fullWidth={false}
                                    aria-label="Minutos de antelación del aviso de cita"
                                    value={minutos}
                                    onChange={(event) => setMinutos(event.target.value)}
                                    onBlur={() => void guardarMinutos()}
                                    className="w-[72px] text-right"
                                  />
                                  <span className="text-meta text-ink-muted">min antes</span>
                                </div>
                              }
                            />
                          )}
                        </div>
                      )}
                    </SettingRow>
                  );
                })}
              </div>
            </Section>
          </SettingGroup>
        );
      })}
    </div>
  );
}
