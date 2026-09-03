import { useState } from 'react';
import { Button, Modal } from '../../design';

/**
 * Motivos frecuentes.
 *
 * Salen de las cuatro categorias que el panel llevaba mostrando como si fueran
 * datos reales. Se conservan como sugerencia porque describen bien el negocio,
 * pero ahora hay que elegirlas de verdad para que cuenten.
 */
const MOTIVOS = ['Precio alto', 'No responde', 'Competencia', 'Fuera de zona'];

interface DiscardReasonModalProps {
  /** Cuantos leads se van a descartar. Solo para el texto. */
  cantidad: number;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

/**
 * Pregunta por que se descarta un lead.
 *
 * Hasta el `2026-08-14` nadie lo preguntaba, y el grafico de razones de
 * descarte del panel mostraba cuatro constantes escritas en el codigo.
 *
 * Se puede seguir sin dar motivo: obligar a rellenarlo convertiria descartar en
 * un tramite y la gente acabaria eligiendo cualquier cosa para salir del paso,
 * que ensucia el dato mas que dejarlo vacio. Un "Sin motivo" honesto vale mas
 * que una categoria elegida al azar.
 */
export default function DiscardReasonModal({ cantidad, onConfirm, onCancel }: DiscardReasonModalProps) {
  const [motivo, setMotivo] = useState('');
  const [otro, setOtro] = useState('');

  const elegido = motivo === 'otro' ? otro.trim() : motivo;

  return (
    <Modal onClose={onCancel} maxWidth="380px" label="Motivo del descarte">
      <div className="p-4">
        <h2 className="text-card-title font-semibold text-ink">
          {cantidad === 1 ? 'Descartar el lead' : `Descartar ${cantidad} leads`}
        </h2>
        <p className="mt-1 text-micro text-ink-secondary">
          Saber por que se pierden ayuda a ver que corregir. Es opcional.
        </p>

        <div className="mt-3 flex flex-col gap-1.5">
          {MOTIVOS.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 text-body text-ink">
              <input
                type="radio"
                name="motivo-descarte"
                value={m}
                checked={motivo === m}
                onChange={(e) => setMotivo(e.target.value)}
              />
              {m}
            </label>
          ))}

          <label className="flex cursor-pointer items-center gap-2 text-body text-ink">
            <input
              type="radio"
              name="motivo-descarte"
              value="otro"
              checked={motivo === 'otro'}
              onChange={(e) => setMotivo(e.target.value)}
            />
            Otro
          </label>

          {motivo === 'otro' && (
            <input
              type="text"
              autoFocus
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              placeholder="Cual"
              maxLength={60}
              className="ml-6 h-control rounded-md border border-line bg-surface px-2.5 text-body text-ink outline-none focus:border-primary"
            />
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => onConfirm('')}>
            Sin motivo
          </Button>
          <Button variant="primary" size="sm" disabled={!elegido} onClick={() => onConfirm(elegido)}>
            Descartar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
