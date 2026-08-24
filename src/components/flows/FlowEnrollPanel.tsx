import { useEffect, useState } from 'react';
import { useHideUnnamedLeads } from '../../hooks/useHideUnnamedLeads';
import { Button, IconButton, Input, ListPagination, ListPanel, ListRow } from '../../design';
import { Icon } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchActiveLeads } from '../../services/leadsService';
import type { Lead, MessageFlow } from '../../types';
import LeadIdentity from '../leads/LeadIdentity';
import SinNombreToggle, { contarSinNombre, pasaFiltroDeNombre } from '../leads/SinNombreToggle';

interface Props {
  flujo: MessageFlow;
  onInscribir: (leadId: string) => Promise<void>;
  onVolver: () => void;
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
 *
 * ## Por que dejo de ser un modal el 2026-08-20
 *
 * Era el unico de esta pagina. Editar un flujo y ver su detalle ya eran vistas
 * incrustadas; solo inscribir se abria en una ventana encima. El resultado es
 * que la misma tarea -elegir un lead de una lista- se veia de una forma aqui y
 * de otra en envio masivo, y las dos listas parecian de productos distintos
 * aunque su contenido fuera identico.
 *
 * Ahora es una vista mas del conmutador de `FlowsPage`, con su "Volver" como
 * las otras dos. El modal no aportaba nada que la vista no de: no hay nada
 * detras que convenga seguir viendo mientras eliges.
 */
/** Lo que antes era un subtitulo de dos lineas bajo el titulo. */
const AYUDA = (canal: string) =>
  `El paso 1 se programa segun su espera. Solo aparecen leads con ${canal === 'email' ? 'correo' : 'telefono'}.`;

/** Cuantos leads por pagina. */
const LEADS_POR_PAGINA = 12;

export function FlowEnrollPanel({ flujo, onInscribir, onVolver }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  /* Mismo filtro que en envio masivo, y con la misma pieza: las dos listas
     tienen que seguir viendose iguales. */
  // Misma preferencia que la tabla de leads y el pipeline.
  const [ocultarSinNombre, setOcultarSinNombre] = useHideUnnamedLeads();

  /*
   * Al filtrar, la pagina 7 puede dejar de existir. Se ajusta durante el render
   * y no desde un efecto, que pintaria la pagina vieja antes de corregirse.
   */
  const filtroActual = `${busqueda}|${ocultarSinNombre}`;
  const [filtroAnterior, setFiltroAnterior] = useState(filtroActual);
  if (filtroAnterior !== filtroActual) {
    setFiltroAnterior(filtroActual);
    setPagina(1);
  }

  useEffect(() => {
    if (user) fetchActiveLeads(user.id).then(setLeads);
  }, [user]);

  const tieneDato = (lead: Lead) =>
    flujo.channel === 'email' ? Boolean(lead.email?.trim()) : Boolean(lead.phone?.trim());

  const q = busqueda.trim().toLocaleLowerCase('es');
  /*
   * Aqui habia un `.slice(0, 50)` sin aviso: con mas de cincuenta candidatos,
   * el lead 51 sencillamente no existia para esta pantalla y nada lo decia.
   * Ahora se paginan todos.
   */
  const conDato = leads.filter(tieneDato);
  const sinNombre = contarSinNombre(conDato);

  const candidatos = conDato
    .filter((l) => pasaFiltroDeNombre(l, ocultarSinNombre))
    .filter((l) => (q ? (l.name || '').toLocaleLowerCase('es').includes(q) : true));

  const totalPaginas = Math.max(1, Math.ceil(candidatos.length / LEADS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = candidatos.slice(
    (paginaActual - 1) * LEADS_POR_PAGINA,
    paginaActual * LEADS_POR_PAGINA,
  );

  const inscribir = async (lead: Lead) => {
    setError('');
    setInscribiendo(lead.id!);
    try {
      await onInscribir(lead.id!);
      onVolver();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo inscribir.');
    } finally {
      setInscribiendo(null);
    }
  };

  return (
    /*
     * Misma estructura que el paso "Destinatarios" de envio masivo, a
     * proposito: tarjeta con relleno, cabecera, buscador, y la lista con
     * sangria negativa para que sus filas lleguen al borde de la tarjeta.
     * Antes esta lista colgaba suelta de la pagina, y por eso no se parecia a
     * la otra aunque sus filas fueran identicas.
     */
    <section className="card-standard flex min-h-0 flex-col gap-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton icon={<Icon.ArrowLeft />} label="Volver" size="sm" onClick={onVolver} />
        {/*
          El subtitulo ocupaba dos lineas para explicar dos reglas que solo
          importan la primera vez. Pasa a un icono de ayuda: quien ya lo sabe
          no lo lee, y quien no, lo tiene a un puntero de distancia.
        */}
        <h2 className="min-w-0 truncate text-card-title font-semibold text-ink">
          Inscribir en {flujo.name}
        </h2>
        <span
          className="shrink-0 cursor-help text-ink-muted"
          tabIndex={0}
          role="note"
          aria-label={AYUDA(flujo.channel)}
          title={AYUDA(flujo.channel)}
        >
          <div className="w-3.5">{Icon.Help()}</div>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar lead..."
          aria-label="Buscar lead"
          autoFocus
          className="flex-1"
        />
        <SinNombreToggle
          count={sinNombre}
          ocultos={ocultarSinNombre}
          onToggle={() => setOcultarSinNombre(!ocultarSinNombre)}
        />
      </div>

      {error && <p role="alert" className="text-micro text-state-danger">{error}</p>}

      <ListPanel
        flush
        className="-mx-3"
        footer={
          <ListPagination page={paginaActual} pageCount={totalPaginas} onPageChange={setPagina} />
        }
        empty={
          <p className="px-3 py-6 text-center text-micro text-ink-muted">
            {leads.length === 0
              ? 'Todavia no tienes leads.'
              : `Ningun lead con ${flujo.channel === 'email' ? 'correo' : 'telefono'} coincide.`}
          </p>
        }
      >
        {visibles.map((lead) => (
          <ListRow as="div" key={lead.id}>
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
          </ListRow>
        ))}
      </ListPanel>
    </section>
  );
}
