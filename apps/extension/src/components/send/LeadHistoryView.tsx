import { useEffect, useState } from 'react';
import { Icon } from '../../utils/icons';
import { IconButton, Skeleton } from '../../design';
import { fetchLeadSendHistory, type EnrichedLog } from '../../services/historyService';
import type { EmailTemplate, Lead, WhatsAppTemplate } from '../../types';

const FECHA_LARGA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const CANAL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Llamada',
};

interface CategoriaMinima {
  id?: number;
  name: string;
  color: string;
}

/**
 * QUE SE LE ENVIO A ESTE LEAD
 *
 * Segundo nivel de la hoja de destinatarios. Se llega tocando el resumen de una
 * fila y se vuelve con la flecha; no es un dialogo nuevo encima del que ya
 * habia, porque dos velos apilados en un panel de 400px de alto dejan la
 * pantalla ilegible y el segundo Escape no se sabe cual cierra.
 *
 * Dentro hay dos vistas y no una: la lista de envios, y el texto de uno. Se
 * separan porque responden preguntas distintas -"cuando le escribi" contra "que
 * le dije"- y porque un mensaje de WhatsApp de quinientos caracteres dentro de
 * una fila de lista destruye la lista.
 */
export function LeadHistoryView({
  lead,
  plantillasWhatsApp,
  plantillasEmail,
  categorias,
  onVolver,
}: {
  lead: Lead;
  plantillasWhatsApp: WhatsAppTemplate[];
  plantillasEmail: EmailTemplate[];
  categorias: CategoriaMinima[];
  onVolver: () => void;
}) {
  const [envios, setEnvios] = useState<EnrichedLog[] | null>(null);
  const [abierto, setAbierto] = useState<EnrichedLog | null>(null);

  useEffect(() => {
    let cancelado = false;
    if (!lead.id) return;

    void (async () => {
      const historial = await fetchLeadSendHistory(lead.id!, plantillasWhatsApp, plantillasEmail);
      if (!cancelado) setEnvios(historial);
    })();

    return () => {
      cancelado = true;
    };
    // Las plantillas solo sirven para resolver nombres de envios viejos; si
    // cambian de identidad no hace falta volver a consultar la base.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const categoriaDe = (log: EnrichedLog): CategoriaMinima | undefined => {
    if (!log.templateId) return undefined;
    const plantilla = [...plantillasWhatsApp, ...plantillasEmail].find(
      (p) => String(p.id) === String(log.templateId),
    );
    const primera = (plantilla?.templateListIds || [])[0];
    return categorias.find((c) => c.id === primera);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <IconButton
          icon={<Icon.ArrowLeft />}
          label={abierto ? 'Volver al historial' : 'Volver a los destinatarios'}
          size="sm"
          onClick={() => (abierto ? setAbierto(null) : onVolver())}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">
            {lead.name || 'Sin nombre'}
          </p>
          <p className="truncate text-micro text-ink-secondary">
            {abierto ? abierto.templateNombre : 'Mensajes enviados'}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {abierto ? (
          <Mensaje log={abierto} />
        ) : envios === null ? (
          <div role="status" aria-label="Cargando el historial" className="flex flex-col gap-2 p-4">
            <Skeleton shape="block" height="46px" />
            <Skeleton shape="block" height="46px" />
          </div>
        ) : envios.length === 0 ? (
          <p className="px-4 py-10 text-center text-meta text-ink-secondary">
            Todavía no le enviaste ningún mensaje.
          </p>
        ) : (
          <ul>
            {envios.map((log) => {
              const categoria = categoriaDe(log);
              const hayTexto = Boolean(log.templateContenido);

              return (
                <li key={log.id} className="border-b border-line-soft last:border-0">
                  <button
                    type="button"
                    disabled={!hayTexto}
                    onClick={() => setAbierto(log)}
                    className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors enabled:hover:bg-surface-hover disabled:cursor-default"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-meta font-medium text-ink">
                        {log.templateNombre}
                      </span>
                      <span className="shrink-0 text-micro tabular-nums text-ink-secondary">
                        {FECHA_LARGA.format(new Date(log.sentAt))}
                      </span>
                    </span>

                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 text-micro text-ink-secondary">
                        {CANAL[log.templateType] ?? log.templateType}
                      </span>
                      {categoria && (
                        <>
                          <span aria-hidden="true" className="text-ink-muted">·</span>
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: categoria.color }}
                          />
                          <span className="min-w-0 truncate text-micro text-ink-secondary">
                            {categoria.name}
                          </span>
                        </>
                      )}
                      {/* Sin copia guardada no hay nada que abrir, y decirlo
                          evita que alguien toque una fila que no responde. */}
                      {!hayTexto && (
                        <>
                          <span aria-hidden="true" className="text-ink-muted">·</span>
                          <span className="text-micro italic text-ink-secondary">
                            sin copia del mensaje
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** El texto tal como salio. */
function Mensaje({ log }: { log: EnrichedLog }) {
  return (
    <div className="p-4">
      <p className="mb-2 text-micro tabular-nums text-ink-secondary">
        {FECHA_LARGA.format(new Date(log.sentAt))} · {CANAL[log.templateType] ?? log.templateType}
      </p>

      <div className="rounded-md bg-surface-sunken p-3">
        {log.isHtml ? (
          /* Los correos son HTML y se pintan como HTML, igual que en la ficha
             del lead. `break-words` porque uno maquetado a 600px no cabe aca. */
          <div
            className="text-meta text-ink [&_*]:max-w-full [&_img]:h-auto break-words"
            dangerouslySetInnerHTML={{ __html: log.templateContenido }}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-meta text-ink">
            {log.templateContenido}
          </p>
        )}
      </div>
    </div>
  );
}
