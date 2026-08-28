import { useEffect, useRef, useState } from 'react';
import { exportBackup } from '../../utils/backup';
import { useDuplicates } from '../../hooks/useDuplicates';
import { useLeads } from '../../hooks/useLeads';
import { useAuth } from '../../contexts/AuthContext';
import { fetchActiveLeads } from '../../services/leadsService';
import { exportToExcel, exportToJSON } from '../../utils/exportData';
import type { ExportFormat, Lead } from '../../types';
import type { ParsedRow } from '../../utils/importParser';
import ImportModal from '../leads/ImportModal';
import { getPlatform } from '../../platform/registry';
import { patchSettings } from '../../services/appSettingsService';
import { useAcusarGuardado } from '../../hooks/useAcusarGuardado';
import { Button, ListRow, Modal, Notice, Select, SettingGroup, SettingRow } from '../../design';

interface Props {
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
}

type Aviso = { tone: 'success' | 'danger'; text: string } | null;

/**
 * Acciones sobre la base de datos: respaldo, leads y duplicados.
 *
 * Era la pantalla mas alta de Configuracion: ~700px para un selector y cinco
 * botones, repartidos en tres bloques con un parrafo explicativo sobre cada
 * uno y **cuatro colores de boton distintos** -gris, ambar, verde y azul- para
 * cuatro acciones del mismo rango.
 *
 * Lo que cambia:
 *
 *  - El selector de formato se va a General: era lo unico de aqui que no era
 *    una accion.
 *  - Los tres parrafos se convierten en una pista de un renglon en la fila que
 *    explican. Lo que solo tranquilizaba -"para mantener tu base de datos
 *    limpia"- se borra.
 *  - Los cuatro colores pasan a un unico boton secundario por fila. Al dejar
 *    de gastarse en decorar, **el color vuelve a poder significar peligro**.
 *  - "Restaurar respaldo" sale de la fila de al lado de "Descargar" y baja a
 *    una zona de riesgo plegada al final. Borra la base entera; no puede estar
 *    a 40px de la accion mas inofensiva de la pantalla.
 */
export default function DataManagement({ exportFormat, onExportFormatChange }: Props) {
  const { user } = useAuth();
  const { importLeads } = useLeads();
  const { duplicates, mergeMsg, findDuplicates, mergeLeads } = useDuplicates();

  const [aviso, setAviso] = useState<Aviso>(null);
  const [buscando, setBuscando] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [existingRuts, setExistingRuts] = useState<Set<string>>(new Set());
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());

  const [porFusionar, setPorFusionar] = useState<{ principal: Lead; duplicado: Lead } | null>(null);
  const avisoTimeout = useRef<number | null>(null);
  const { acusar, estaGuardado } = useAcusarGuardado();

  useEffect(
    () => () => {
      if (avisoTimeout.current !== null) window.clearTimeout(avisoTimeout.current);
    },
    [],
  );

  const avisar = (tone: 'success' | 'danger', text: string) => {
    setAviso({ tone, text });
    if (avisoTimeout.current !== null) window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => {
      avisoTimeout.current = null;
      setAviso(null);
    }, 6000);
  };

  const abrirImportacion = async () => {
    if (!user) return;
    const leads = await fetchActiveLeads(user.id);
    const ruts = new Set<string>();
    const telefonos = new Set<string>();
    for (const lead of leads) {
      if (lead.rut) ruts.add(lead.rut);
      if (lead.phone) telefonos.add(lead.phone.replace(/[^+\d]/g, ''));
    }
    setExistingRuts(ruts);
    setExistingPhones(telefonos);
    setShowImport(true);
  };

  const importar = async (rows: ParsedRow[]) => {
    await importLeads(rows.map((row) => ({ ...row, score: 0 })));
    // Antes esto era un `alert()`, que ademas no decia cuantos habian entrado.
    avisar('success', `${rows.length} lead${rows.length === 1 ? '' : 's'} importado${rows.length === 1 ? '' : 's'}.`);
  };

  const cambiarFormato = async (formato: ExportFormat) => {
    onExportFormatChange(formato);
    void getPlatform().storage.sync.set({ exportFormat: formato });
    await patchSettings({ exportFormat: formato });
    acusar('formato');
  };

  const exportarLeads = async () => {
    if (!user) return;
    const leads = await fetchActiveLeads(user.id);
    if (exportFormat === 'excel') exportToExcel(leads);
    else exportToJSON(leads);
  };

  const buscarDuplicados = async () => {
    setBuscando(true);
    try {
      await findDuplicates();
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {aviso && (
        <Notice tone={aviso.tone} onDismiss={() => setAviso(null)}>
          {aviso.text}
        </Notice>
      )}

      <SettingGroup label="Respaldo">
        <SettingRow
          label="Descargar respaldo"
          hint="Copia de leads, listas, plantillas e historial"
          control={
            <Button size="sm" onClick={exportBackup}>
              Descargar
            </Button>
          }
        />
      </SettingGroup>

      <SettingGroup label="Leads">
        {/*
          El selector va pegado a la accion que gobierna, y solo a esa: el
          respaldo escribe JSON siempre (`exportBackup` no mira este ajuste),
          asi que ponerlo arriba del todo prometeria algo que no cumple.

          La pista que llevaba -"JSON para migrar, Excel para uso general"- se
          va al `title`: con el selector puesto quedan 142px para el texto en
          el panel estrecho, o sea que ya salia cortada.
        */}
        <SettingRow
          label="Formato de exportación"
          control={
            <div className="flex items-center gap-2">
              {estaGuardado('formato') && (
                <span className="text-micro font-semibold text-state-success" role="status">
                  Guardado
                </span>
              )}
              <Select
                compact
                fullWidth={false}
                aria-label="Formato de exportación"
                title="JSON para migrar, Excel para uso general"
                value={exportFormat}
                onChange={(event) => void cambiarFormato(event.target.value as ExportFormat)}
                className="w-[110px]"
              >
                <option value="json">JSON</option>
                <option value="excel">Excel</option>
              </Select>
            </div>
          }
        />
        <SettingRow
          label="Exportar leads"
          control={
            <Button size="sm" onClick={() => void exportarLeads()}>
              Exportar
            </Button>
          }
        />
        <SettingRow
          label="Importar leads"
          hint="Desde un archivo Excel o CSV"
          control={
            <Button size="sm" onClick={() => void abrirImportacion()}>
              Importar
            </Button>
          }
        />
        <SettingRow
          label="Buscar duplicados"
          hint="Por RUT o teléfono repetido"
          control={
            <Button size="sm" onClick={() => void buscarDuplicados()} disabled={buscando}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </Button>
          }
        >
          {/*
            Los resultados cuelgan de la fila que los pidio, dentro de la misma
            tarjeta. Antes flotaban como un bloque suelto al final de la
            pantalla, lejos del boton que los habia generado.
          */}
          {mergeMsg && duplicates.length === 0 && (
            <p className="text-micro text-ink-muted">{mergeMsg}</p>
          )}

          {duplicates.length > 0 && (
            <div className="max-h-[240px] overflow-y-auto overflow-hidden rounded-md border border-line">
              {duplicates.map((par, indice) => (
                <ListRow key={`${par.lead1.id}-${par.lead2.id}-${indice}`} density="compact">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-micro font-medium text-ink">{par.lead1.name}</p>
                    <p className="truncate text-micro text-ink-muted">
                      {par.lead2.name} · {par.reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPorFusionar({ principal: par.lead1, duplicado: par.lead2 })}
                  >
                    Unir
                  </Button>
                </ListRow>
              ))}
            </div>
          )}
        </SettingRow>
      </SettingGroup>

      {/*
        Aqui habia una "Zona de riesgo" con un `Badge` rojo que decia "Borra
        todo" y un modal que exigia teclear RESTAURAR.

        No borra nada: `importBackup()` (src/utils/backup.ts) rechaza siempre
        con "La importacion de respaldos ya no es soportada en la version
        Cloud". Es decir, el unico final posible de aquel flujo -elegir
        archivo, leer la advertencia, teclear la palabra, confirmar- era un
        aviso rojo de error.

        Una alarma que no corresponde a ningun peligro real gasta la alarma. Se
        deja una fila que dice lo que hay, sin control que pulsar.
      */}
      <SettingGroup label="Restaurar">
        <SettingRow
          label="Restaurar un respaldo"
          hint="No disponible en la versión Cloud; usa Importar leads"
        />
      </SettingGroup>

      {showImport && (
        <ImportModal
          existingRuts={existingRuts}
          existingPhones={existingPhones}
          onImport={importar}
          onClose={() => setShowImport(false)}
        />
      )}

      {porFusionar && (
        <Modal onClose={() => setPorFusionar(null)} maxWidth="400px" label="Unir leads duplicados">
          <div className="space-y-3 p-4">
            <h3 className="text-card-title font-semibold text-ink">Unir leads</h3>
            <p className="text-micro text-ink-secondary">
              Se conserva <span className="font-medium text-ink">{porFusionar.principal.name}</span> y se
              elimina <span className="font-medium text-ink">{porFusionar.duplicado.name}</span>, volcando sus
              datos en el primero. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setPorFusionar(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void mergeLeads(porFusionar.principal, porFusionar.duplicado);
                  setPorFusionar(null);
                }}
              >
                Unir
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
