import { useEffect, useState } from 'react';
import { Button, IconButton, Input, Modal } from '../../design';
import { Icon } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchActiveLeads } from '../../services/leadsService';
import type { Lead, MessageFlow } from '../../types';
import LeadIdentity from '../leads/LeadIdentity';

interface Props {
  flujo: MessageFlow;
  onInscribir: (leadId: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Inscribir un lead en un flujo.
 *
 * Solo lista los leads que tienen el dato que el canal necesita: inscribir en
 * un flujo de correo a alguien sin correo es programar un envio que no puede
 * salir. Se filtran aqui en vez de dejar que falle al despachar.
 *
 * El rechazo por canal ocupado -la base solo admite una inscripcion activa por
 * lead y canal- llega traducido desde el servicio, porque el texto crudo de
 * Postgres no le dice nada a nadie.
 */
export function FlowEnrollModal({ flujo, onInscribir, onClose }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchActiveLeads(user.id).then(setLeads);
  }, [user]);

  const tieneDato = (lead: Lead) =>
    flujo.channel === 'email' ? Boolean(lead.email?.trim()) : Boolean(lead.phone?.trim());

  const q = busqueda.trim().toLocaleLowerCase('es');
  const candidatos = leads
    .filter(tieneDato)
    .filter((l) => (q ? (l.name || '').toLocaleLowerCase('es').includes(q) : true))
    .slice(0, 50);

  const inscribir = async (lead: Lead) => {
    setError('');
    setInscribiendo(lead.id!);
    try {
      await onInscribir(lead.id!);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo inscribir.');
    } finally {
      setInscribiendo(null);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="400px" label={`Inscribir en ${flujo.name}`}>
      <div className="flex max-h-[80vh] min-h-0 flex-col">
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <div className="min-w-0">
            <h2 className="text-card-title font-semibold text-ink">Inscribir en {flujo.name}</h2>
            <p className="mt-0.5 text-micro text-ink-secondary">
              El paso 1 se programa segun su espera.
              {flujo.channel === 'email'
                ? ' Solo aparecen leads con correo.'
                : ' Solo aparecen leads con telefono.'}
            </p>
          </div>
          <IconButton icon={<Icon.Close />} label="Cerrar" size="sm" onClick={onClose} />
        </div>

        <div className="px-4 pt-3">
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar lead..."
            aria-label="Buscar lead"
            autoFocus
          />
        </div>

        {error && (
          <p role="alert" className="px-4 pt-2 text-micro text-state-danger">{error}</p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {candidatos.length === 0 ? (
            <p className="text-micro text-ink-muted">
              {leads.length === 0
                ? 'Todavia no tienes leads.'
                : `Ningun lead con ${flujo.channel === 'email' ? 'correo' : 'telefono'} coincide.`}
            </p>
          ) : (
            <ul className="min-w-0">
              {candidatos.map((lead) => (
                <li
                  key={lead.id}
                  className="flex min-w-0 items-center gap-2 border-b border-line-soft px-2.5 py-2 last:border-0"
                >
                  {/*
                    Esta lista era la unica sin relleno lateral: el nombre
                    arrancaba pegado al borde del modal. Se le anade `px-2.5`,
                    que es el de la tabla de leads, de donde sale el molde.

                    El respaldo del nombre decia "(sin nombre)" con parentesis.
                    Ahora lo pone `LeadIdentity` y dice "Sin nombre": un lector
                    de pantalla en modo de puntuacion completa verbaliza los
                    parentesis, y el resto de los vacios del producto ya usan
                    esa forma.
                  */}
                  <LeadIdentity
                    className="flex-1"
                    name={lead.name}
                    caption={flujo.channel === 'email' ? lead.email : lead.phone}
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={inscribiendo !== null}
                    onClick={() => inscribir(lead)}
                  >
                    {inscribiendo === lead.id ? '...' : 'Inscribir'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
