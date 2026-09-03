import { useState } from 'react';
import type { Profile } from '../../types';
import { Button, Field, Modal, Select } from '../../design';

/**
 * Transferir leads o plantillas de un usuario a otro.
 *
 * Antes el selector de destino y el boton vivian en una barra fija sobre la
 * lista, ocupando sitio permanentemente aunque no hubiera nada seleccionado
 * -que es el 95% del tiempo-, y la confirmacion la pedia un `confirm()` del
 * navegador.
 */
export default function AdminTransferModal({
  profiles,
  excludeUserId,
  itemCount,
  itemLabel,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  profiles: Profile[];
  excludeUserId: string;
  itemCount: number;
  /** "leads" o "plantillas": el texto explica que se mueve. */
  itemLabel: string;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: (targetUserId: string) => void;
}) {
  const [targetUserId, setTargetUserId] = useState('');
  const destinos = profiles.filter((profile) => profile.id !== excludeUserId);

  return (
    <Modal onClose={onCancel} maxWidth="420px" label="Transferir elementos">
      <div className="space-y-3 p-4">
        <h3 className="text-card-title font-semibold text-ink">
          Transferir {itemCount} {itemLabel}
        </h3>
        <p className="text-micro text-ink-muted">
          Los elementos dejan de pertenecer a este usuario y pasan al destinatario. La acción no se puede deshacer.
        </p>

        <Field label="Destinatario">
          <Select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
            <option value="">Selecciona un usuario...</option>
            {destinos.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || profile.email}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(targetUserId)}
            disabled={!targetUserId || isProcessing}
          >
            {isProcessing ? 'Transfiriendo...' : 'Transferir'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
