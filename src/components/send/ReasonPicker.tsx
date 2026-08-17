import { useState } from 'react';
import { Button, IconButton, Input, Modal } from '../../design';
import { Icon } from '../../utils/icons';
import type { MessageReason } from '../../services/messageReasonsService';

interface Props {
  motivos: MessageReason[];
  seleccionado: number | null;
  onSeleccionar: (id: number | null) => void;
}

/**
 * Elige el motivo del mensaje.
 *
 * No es un `select` nativo, y la razon es el ancho: un motivo es una frase
 * entera, y en una columna estrecha el desplegable la corta justo cuando hace
 * falta compararla con las otras. Aqui cada motivo ocupa las lineas que
 * necesite -el texto envuelve, no se trunca- y la hoja tiene scroll propio, asi
 * que da igual que haya dos o cincuenta.
 *
 * Se descarto darles un nombre corto y listar solo nombres: obligaria a
 * rellenar dos campos por motivo, el nombre puede desincronizarse del texto al
 * editarlo, y no resuelve el problema de fondo, que es no recordar que dice
 * cada uno. Para eso sirve la vista previa, que lo muestra ya sustituido.
 */
export function ReasonPicker({ motivos, seleccionado, onSeleccionar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const elegido = motivos.find((m) => m.id === seleccionado);

  const q = busqueda.trim().toLocaleLowerCase('es');
  const visibles = q
    ? motivos.filter((m) => m.text.toLocaleLowerCase('es').includes(q))
    : motivos;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        // El texto elegido se trunca a una linea aqui a proposito: quien quiera
        // leerlo entero lo ve en la vista previa, ya sustituido en la frase.
        className={`flex h-control w-full min-w-0 items-center gap-2 rounded-md border px-2.5 text-left text-body transition-colors ${
          elegido
            ? 'border-primary bg-primary-soft text-ink'
            : 'border-line bg-surface text-ink-muted hover:border-line-strong'
        }`}
      >
        <span className="min-w-0 flex-1 truncate">
          {elegido ? elegido.text : 'Sin motivo'}
        </span>
        <span className="shrink-0 text-ink-muted">
          <Icon.ChevronDown />
        </span>
      </button>

      {abierto && (
        <Modal onClose={() => setAbierto(false)} maxWidth="400px" label="Motivo del mensaje">
          <div className="flex max-h-[80vh] min-h-0 flex-col">
            <div className="flex items-start justify-between gap-2 px-4 pt-4">
              <div className="min-w-0">
                <h2 className="text-card-title font-semibold text-ink">Motivo del mensaje</h2>
                <p className="mt-0.5 text-micro text-ink-secondary">
                  Sustituye a <code className="font-mono">{'{motivo}'}</code> en este envio.
                </p>
              </div>
              <IconButton
                icon={<Icon.Close />}
                label="Cerrar"
                size="sm"
                onClick={() => setAbierto(false)}
              />
            </div>

            {motivos.length > 4 && (
              <div className="px-4 pt-3">
                <Input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar motivo..."
                  aria-label="Buscar motivo"
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
              <ul className="min-w-0">
                <li>
                  <button
                    type="button"
                    onClick={() => { onSeleccionar(null); setAbierto(false); }}
                    className={`w-full border-b border-line-soft py-2 text-left text-body ${
                      seleccionado === null ? 'font-semibold text-primary' : 'text-ink-secondary'
                    }`}
                  >
                    Sin motivo
                  </button>
                </li>
                {visibles.map((motivo) => (
                  <li key={motivo.id}>
                    <button
                      type="button"
                      onClick={() => { onSeleccionar(motivo.id ?? null); setAbierto(false); }}
                      className={`w-full border-b border-line-soft py-2 text-left text-body last:border-0 ${
                        seleccionado === motivo.id ? 'font-semibold text-primary' : 'text-ink'
                      }`}
                    >
                      {/* Sin `truncate`: aqui es donde el motivo se lee entero. */}
                      <span className="block break-words">{motivo.text}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {motivos.length === 0 && (
                <p className="text-micro text-ink-muted">
                  No hay motivos todavia. Crealos en Plantillas, con "Gestionar motivos".
                </p>
              )}
            </div>

            <div className="border-t border-line px-4 py-3">
              <Button className="w-full" onClick={() => setAbierto(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
