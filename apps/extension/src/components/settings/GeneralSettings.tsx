import { useEffect, useState } from 'react';
import type { ColumnDef, ComparePeriod } from '../../types';
import { getSettings, patchSettings } from '../../services/appSettingsService';
import { useAcusarGuardado } from '../../hooks/useAcusarGuardado';
import { Badge, Checkbox, Input, Section, Select, SettingGroup, SettingRow, Switch } from '../../design';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (value: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
  /** Seccion que abre el hash: `#goals` entra directo a las metas. */
  initialBlock?: string;
}

/**
 * Los ajustes que cambian como se comporta la app por defecto.
 *
 * Reune lo que estaba en "Apariencia" (menos las alertas y el cliente de
 * WhatsApp, que se fueron a Avisos y a Canales), el formato de exportacion por
 * defecto -que vivia en "Datos" entre botones de accion, siendo lo unico de
 * aquella pantalla que no era una accion- y las metas diarias, que tenian
 * pestana propia para cuatro controles.
 *
 * ## No hay boton de guardar
 *
 * "Metas" tenia uno, y era el unico de toda la seccion. Un boton de guardar
 * promete que puedes trastear sin consecuencias hasta pulsarlo, y ninguna otra
 * fila de Configuracion cumple esa promesa: todas guardan al tocarlas. Los
 * numeros guardan al salir del campo y avisan con un visto de segundo y medio.
 */
export default function GeneralSettings({
  compactMode,
  onCompactModeChange,
  darkMode,
  onDarkModeChange,
  visibleCols,
  onColsChange,
  initialBlock,
}: Props) {
  const [columnasAbiertas, setColumnasAbiertas] = useState(false);
  const [metasAbiertas, setMetasAbiertas] = useState(initialBlock === 'metas');
  const { acusar, estaGuardado } = useAcusarGuardado();

  const [waGoal, setWaGoal] = useState(30);
  const [emailGoal, setEmailGoal] = useState(20);
  const [callGoal, setCallGoal] = useState(5);
  const [comparePeriod, setComparePeriod] = useState<ComparePeriod>('yesterday');

  useEffect(() => {
    let activo = true;
    void getSettings().then((s) => {
      if (!activo) return;
      if (s.dailyGoalWhatsApp !== undefined) setWaGoal(s.dailyGoalWhatsApp);
      if (s.dailyGoalEmail !== undefined) setEmailGoal(s.dailyGoalEmail);
      if (s.dailyGoalCalls !== undefined) setCallGoal(s.dailyGoalCalls);
      if (s.dashboardComparePeriod) setComparePeriod(s.dashboardComparePeriod);
    });
    return () => {
      activo = false;
    };
  }, []);

  const guardarMetas = async (patch: Record<string, number | ComparePeriod>, campo: string) => {
    await patchSettings(patch);
    acusar(campo);
  };

  const columnas = visibleCols.filter((col) => col.key !== 'name');
  const visibles = columnas.filter((col) => col.visible).length;

  /** El visto que sustituye al boton "Guardar configuracion". */
  const visto = (campo: string) =>
    estaGuardado(campo) ? (
      <span className="text-micro font-semibold text-state-success" role="status">
        Guardado
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      <SettingGroup label="Apariencia">
        <SettingRow
          label="Modo compacto"
          hint="Menos espacio entre filas para ver más leads de una vez"
          control={
            <Switch
              label="Modo compacto"
              checked={compactMode}
              onChange={(event) => onCompactModeChange(event.target.checked)}
            />
          }
        />
        <SettingRow
          label="Modo oscuro"
          control={
            <Switch
              label="Modo oscuro"
              checked={darkMode}
              onChange={(event) => onDarkModeChange(event.target.checked)}
            />
          }
        />

        {/*
          Once casillas dentro de una fila de ajuste no caben, y desplegadas
          ocupaban mas alto que los dos interruptores de arriba juntos. La cifra
          en la cabecera dice lo que hay dentro sin abrirlo.
        */}
        <Section
          title="Columnas de la tabla"
          badge={<Badge tone="neutral">{visibles} de {columnas.length}</Badge>}
          isOpen={columnasAbiertas}
          onToggle={() => setColumnasAbiertas((abierto) => !abierto)}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {columnas.map((col) => (
              <Checkbox
                key={col.key}
                label={col.label}
                checked={col.visible}
                onChange={() =>
                  onColsChange(
                    visibleCols.map((c) => (c.key === col.key ? { ...c, visible: !c.visible } : c)),
                  )
                }
              />
            ))}
          </div>
          <p className="mt-2 text-micro text-ink-muted">La columna Nombre siempre queda visible.</p>
        </Section>
      </SettingGroup>

      <SettingGroup>
        <Section
          title="Metas diarias"
          badge={<Badge tone="neutral">{waGoal + emailGoal + callGoal} al día</Badge>}
          isOpen={metasAbiertas}
          onToggle={() => setMetasAbiertas((abierto) => !abierto)}
        >
          <div className="overflow-hidden rounded-md border border-line divide-y divide-line">
            {[
              { campo: 'wa', rotulo: 'WhatsApp', valor: waGoal, set: setWaGoal, clave: 'dailyGoalWhatsApp' },
              { campo: 'email', rotulo: 'Emails', valor: emailGoal, set: setEmailGoal, clave: 'dailyGoalEmail' },
              { campo: 'call', rotulo: 'Llamadas', valor: callGoal, set: setCallGoal, clave: 'dailyGoalCalls' },
            ].map(({ campo, rotulo, valor, set, clave }) => (
              <SettingRow
                key={campo}
                label={rotulo}
                control={
                  <div className="flex items-center gap-1.5">
                    {visto(campo)}
                    <Input
                      type="number"
                      min="0"
                      fullWidth={false}
                      aria-label={`Meta diaria de ${rotulo}`}
                      value={valor}
                      onChange={(event) => set(Number(event.target.value))}
                      onBlur={() => void guardarMetas({ [clave]: valor }, campo)}
                      className="w-[72px] text-right"
                    />
                    <span className="text-meta text-ink-muted">/día</span>
                  </div>
                }
              />
            ))}

            <SettingRow
              label="Comparar contra"
              hint="Referencia del panel para medir el progreso"
              control={
                <div className="flex items-center gap-2">
                  {visto('compare')}
                  <Select
                    compact
                    fullWidth={false}
                    aria-label="Periodo de comparación"
                    value={comparePeriod}
                    onChange={(event) => {
                      const periodo = event.target.value as ComparePeriod;
                      setComparePeriod(periodo);
                      void guardarMetas({ dashboardComparePeriod: periodo }, 'compare');
                    }}
                    className="w-[140px]"
                  >
                    <option value="yesterday">Ayer</option>
                    <option value="lastWeek">Semana pasada</option>
                    <option value="lastMonth">Mes pasado</option>
                    <option value="lastYear">Año pasado</option>
                  </Select>
                </div>
              }
            />
          </div>
        </Section>
      </SettingGroup>
    </div>
  );
}
