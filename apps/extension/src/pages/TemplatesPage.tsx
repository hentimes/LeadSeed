import { useEffect, useState } from 'react';
import { getPlatform } from '../platform/registry';
import {
  useWhatsAppTemplates, useWhatsAppTemplateLists,
  useEmailTemplates, useEmailTemplateLists,
  useCallTemplates, useCallTemplateLists,
} from '../hooks/useTemplates';
import type { SendLog } from '../types';
import type { AnyTemplate, AnyTemplateList, EditableTemplate } from '../types';
import TemplateEditor from '../components/templates/TemplateEditor';
import { fetchSendLogsForTemplate } from '../services/historyService';
import { Icon } from '../utils/icons';
import { Button, Card, IconButton, Input, Modal, EmptyState, LoadError, Skeleton } from '../design';
import { ChannelSegmented } from '../components/channels/ChannelSegmented';
import { CategoryManagerModal } from '../components/templates/CategoryManagerModal';
import { ReasonManagerModal } from '../components/templates/ReasonManagerModal';
import { SendHistoryDisclosure } from '../components/send/SendHistoryDisclosure';
import { useMessageReasons } from '../hooks/useMessageReasons';
import {
  isDuplicateReason,
  normalizeReasonText,
  MAX_REASON_LENGTH,
  type MessageReason,
} from '../services/messageReasonsService';

type Tab = 'whatsapp' | 'email' | 'call';

const COLORS = [
  { name: 'Azul', value: '#3B82F6' }, { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' }, { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' }, { name: 'Rosa', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' }, { name: 'Naranja', value: '#F97316' },
];

interface Props {
  highlightTemplate?: { type: 'whatsapp' | 'email' | 'call'; id: number } | null;
  onClearHighlight?: () => void;
}

/** Ficha de filtro por categoria. El punto de color lo identifica sin teñir el fondo. */
function FiltroChip({
  activo,
  color,
  onClick,
  children,
}: {
  activo: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-micro font-medium transition-colors ${
        activo
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}

export default function TemplatesPage({ highlightTemplate }: Props = {}) {
  const [tab, setTab] = useState<Tab>(highlightTemplate?.type || 'whatsapp');
  const waT = useWhatsAppTemplates(); const waL = useWhatsAppTemplateLists();
  const emT = useEmailTemplates(); const emL = useEmailTemplateLists();
  const caT = useCallTemplates(); const caL = useCallTemplateLists();
  const { motivos: reasons, save: guardarMotivo, remove: borrarMotivo } = useMessageReasons();

  // Los tres canales comparten la forma de WhatsAppTemplate; lo que cambia es
  // de que hook vienen, no el tipo.
  const [templates, setTemplates] = useState<AnyTemplate[]>([]);
  const [tplLists, setTplLists] = useState<AnyTemplateList[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [editing, setEditing] = useState<EditableTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);

  // Category form
  const [catName, setCatName] = useState('');
  // COLORS es una constante de este archivo y nunca esta vacia; el respaldo
  // existe para no depender de eso desde otro punto del codigo.
  const [catColor, setCatColor] = useState(COLORS[0]?.value ?? '#3B82F6');

  // View filters
  const [filterCatId, setFilterCatId] = useState<number | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Catalogo de motivos: alimenta la variable {motivo} de las plantillas. Se
  // administra aqui y no en Ajustes porque es contenido de mensajes, no una
  // preferencia de la cuenta.
  const [showReasonManager, setShowReasonManager] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState('');


  const handleCreateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = normalizeReasonText(reasonText);
    if (text === null) {
      setReasonError(`Escribí un motivo de hasta ${MAX_REASON_LENGTH} caracteres.`);
      return;
    }
    if (isDuplicateReason(text, reasons)) {
      setReasonError('Ese motivo ya está en la lista.');
      return;
    }
    setReasonError('');
    await guardarMotivo({ text, createdAt: '' });
    setReasonText('');
  };

  const handleDeleteReason = async (id: number) => {
    // Las plantillas que lo tuvieran como valor por defecto lo pierden, pero no
    // se rompen: la columna es `on delete set null`.
    if (!(await getPlatform().dialogs.confirm('Las plantillas que lo usaban por defecto quedan sin motivo.', { title: '¿Eliminar este motivo?', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    await borrarMotivo(id);
  };

  /*
   * `cargando` arranca en true. Antes no existia: mientras la red respondia,
   * `templates` era `[]` y la pantalla afirmaba "todavia no tenes plantillas",
   * con su boton de crear. Un fallo de red se veia exactamente igual que una
   * cuenta nueva, y quien lo leia creia que habia perdido su trabajo.
   */
  const load = async () => {
    setCargando(true);
    setFallo(false);

    // Las dos consultas van en paralelo: la segunda no depende de la primera.
    const fuente =
      tab === 'whatsapp'
        ? ([waT, waL] as const)
        : tab === 'email'
          ? ([emT, emL] as const)
          : ([caT, caL] as const);

    try {
      const [plantillas, listas] = await Promise.all([fuente[0].getAll(), fuente[1].getAll()]);
      setTemplates(plantillas);
      setTplLists(listas);
    } catch (error) {
      console.error('[plantillas] no se pudieron cargar', error);
      setFallo(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    load();
    setEditing(null);
    setSelectedIds(new Set());
    setBusqueda('');
    /*
     * El filtro de categoria tambien se limpia, y esto era un bug.
     *
     * Las categorias son POR CANAL: cada uno tiene su propio catalogo. Al
     * cambiar de canal el id filtrado dejaba de existir, asi que la lista
     * quedaba filtrada por una categoria de otro canal -practicamente vacia- y
     * ademas ninguna ficha se pintaba activa, porque "Todas" solo se marca con
     * `filterCatId === null`. O sea: pocas plantillas o ninguna, y nada en
     * pantalla explicando por que.
     */
    setFilterCatId(null);
  }, [tab]);


  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (tab === 'whatsapp') await waL.save({ name: catName.trim(), color: catColor, createdAt: '' });
    else if (tab === 'email') await emL.save({ name: catName.trim(), color: catColor, createdAt: '' });
    else await caL.save({ name: catName.trim(), color: catColor, createdAt: '' });
    setCatName(''); load();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!(await getPlatform().dialogs.confirm('Las plantillas que la tuvieran salen de ella. No se borra ninguna.', { title: '¿Eliminar esta categoría?', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    if (tab === 'whatsapp') await waL.remove(id); 
    else if (tab === 'email') await emL.remove(id);
    else await caL.remove(id);
    if (filterCatId === id) setFilterCatId(null);
    load();
  };

  const handleSave = async (data: { id?: number; nombre: string; contenido: string; asunto?: string; isHtml?: boolean; templateListIds?: number[]; defaultReasonId?: number | null }) => {
    if (saving) return; // prevent double submit
    setSaving(true);
    const existing = templates.find((t) => t.id === data.id);
    const base = { 
      ...data, 
      templateListIds: data.templateListIds || existing?.templateListIds || [], 
      leadIds: existing?.leadIds || [], 
      leadListIds: existing?.leadListIds || [], 
      createdAt: existing?.createdAt || '' 
    };
    if (tab === 'whatsapp') await waT.save(base);
    else if (tab === 'email') await emT.save({ ...base, isHtml: data.isHtml || false } as any);
    else await caT.save(base);
    setEditing(null); setSaving(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!(await getPlatform().dialogs.confirm('No se puede deshacer.', { title: '¿Eliminar esta plantilla?', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    if (tab === 'whatsapp') await waT.remove(id); 
    else if (tab === 'email') await emT.remove(id);
    else await caT.remove(id);
    if (editing?.id === id) setEditing(null);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    load();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!(await getPlatform().dialogs.confirm('No se puede deshacer.', { title: `¿Eliminar ${selectedIds.size} plantillas?`, confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    for (const id of selectedIds) {
      if (tab === 'whatsapp') await waT.remove(id); 
      else if (tab === 'email') await emT.remove(id);
      else await caT.remove(id);
    }
    setSelectedIds(new Set());
    load();
  };

  /**
   * El id de una plantilla es `string | number` en el tipo porque asi lo
   * declara el dominio, pero la seleccion y el editor trabajan con numeros.
   * Se convierte en un solo sitio en vez de repartir `as number` por el JSX.
   */
  const idNumerico = (t: AnyTemplate): number | null => {
    if (typeof t.id === 'number') return t.id;
    if (typeof t.id === 'string' && t.id.trim() !== '') {
      const n = Number(t.id);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  /** Recorta una plantilla a lo que el editor necesita. */
  const aEditable = (t: AnyTemplate): EditableTemplate => ({
    ...(idNumerico(t) !== null ? { id: idNumerico(t) as number } : {}),
    nombre: t.nombre,
    contenido: t.contenido,
    ...('asunto' in t ? { asunto: t.asunto } : {}),
    ...('isHtml' in t ? { isHtml: t.isHtml } : {}),
    templateListIds: t.templateListIds,
  });

  /** Solo las categorias ya guardadas: sin id no hay nada a que asociar. */
  const categoriasConId = tplLists.flatMap((l) =>
    typeof l.id === 'number' ? [{ id: l.id, name: l.name, color: l.color }] : [],
  );

  const toggleSel = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };


  /**
   * El historial de una plantilla se carga al abrirla para editar.
   *
   * Antes cada fila de la lista tenia un boton "Ver envios" que desplegaba el
   * log ahi mismo, empujando el resto de la lista. Es informacion de la
   * plantilla, asi que vive con la plantilla.
   */
  useEffect(() => {
    if (editing?.id) {
      fetchSendLogsForTemplate(editing.id).then(setSendLogs);
    } else {
      setSendLogs([]);
    }
  }, [editing?.id]);

  const filtered = filterCatId ? templates.filter((t) => (t.templateListIds || []).includes(filterCatId)) : templates;

  const canalLabel = tab === 'whatsapp' ? 'WhatsApp' : tab === 'email' ? 'Email' : 'Llamadas';
  const nombreItem = tab === 'call' ? 'guion' : 'plantilla';
  /*
   * El plural va escrito y no se arma con `${nombreItem}s`: eso producia
   * "guions". En español la regla depende de la terminacion, asi que componer
   * plurales concatenando una ese falla en cuanto la palabra no termina en
   * vocal.
   */
  const plural = tab === 'call' ? 'guiones' : 'plantillas';

  const buscadas = busqueda.trim()
    ? filtered.filter((t) => {
        const q = busqueda.trim().toLocaleLowerCase('es');
        return (
          (t.nombre || '').toLocaleLowerCase('es').includes(q) ||
          (t.contenido || '').toLocaleLowerCase('es').includes(q)
        );
      })
    : filtered;

  return (
    // `min-w-0` en toda la cadena: sin el, un hijo con texto largo ensancha al
    // padre y la pagina entera se desborda hacia la derecha, que es lo que
    // pasaba aunque los textos tuvieran `truncate`.
    <div className="flex min-w-0 flex-col gap-3">
      <ChannelSegmented active={tab} onChange={setTab} label="Canal de las plantillas" />

      {/* Una sola fila: buscar, crear, y el resto detras del menu. Antes eran
          cuatro controles con etiquetas largas que se partian en tres filas. */}
      <div className="flex min-w-0 items-center gap-2">
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={`Buscar ${nombreItem}...`}
          aria-label={`Buscar ${nombreItem}`}
          className="min-w-0 flex-1"
        />
        <IconButton
          icon={<Icon.Plus />}
          label={`Nueva ${nombreItem}`}
          variant="primary"
          onClick={() => setEditing({ nombre: '', contenido: '', templateListIds: [] })}
        />
        <div className="relative">
          <IconButton
            icon={<Icon.More />}
            label="Más opciones"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto(!menuAbierto)}
          />
          {menuAbierto && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuAbierto(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
                <button
                  type="button"
                  onClick={() => { setMenuAbierto(false); setShowCatManager(true); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-body text-ink hover:bg-surface-hover"
                >
                  Categorias
                  <span className="text-micro text-ink-muted">{categoriasConId.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuAbierto(false); setShowReasonManager(true); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-body text-ink hover:bg-surface-hover"
                >
                  Motivos del mensaje
                  <span className="text-micro text-ink-muted">{reasons.length}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filtro por categoria: fichas, no un desplegable. Un `select` reserva
          el ancho de su opcion mas larga y empujaba la pagina.

          Se envuelven en vez de desplazarse. Tenian scroll horizontal propio,
          pero los scrollbars estan ocultos globalmente en `index.css`: las
          categorias que no entraban desaparecian por el borde sin ninguna
          pista de que hubiera mas. Son datos del usuario, de cantidad y largo
          imprevisibles, asi que no hay ancho que garantice que quepan en una
          linea; lo unico que se puede prometer es que ninguna se pierda. */}
      {categoriasConId.length > 0 && (
        <div className="-mx-1 flex min-w-0 flex-wrap gap-1.5 px-1 pb-0.5">
          <FiltroChip activo={filterCatId === null} onClick={() => setFilterCatId(null)}>
            Todas
          </FiltroChip>
          {categoriasConId.map((c) => (
            <FiltroChip
              key={c.id}
              activo={filterCatId === c.id}
              color={c.color}
              onClick={() => setFilterCatId(filterCatId === c.id ? null : c.id)}
            >
              {c.name}
            </FiltroChip>
          ))}
        </div>
      )}

      {cargando ? (
        <Card padding="none">
          <ul className="min-w-0 divide-y divide-line-soft">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 p-3">
                <Skeleton shape="block" width="34px" height="34px" />
                <span className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton width="52%" height="11px" />
                  <Skeleton width="78%" height="9px" />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : fallo ? (
        <LoadError
          title={`No pudimos cargar tus ${plural}`}
          description="Revisá la conexión y volvé a intentar."
          onRetry={() => void load()}
        />
      ) : buscadas.length === 0 ? (
        <EmptyState
          title={
            busqueda.trim()
              ? `Ningún resultado para "${busqueda.trim()}"`
              : `Todavía no tenés ${plural} de ${canalLabel}`
          }
          description={
            busqueda.trim()
              ? undefined
              : `Un${tab === 'call' ? ' guion' : 'a plantilla'} es un mensaje con huecos: escribís {nombre} y al enviar se completa con el de cada lead.`
          }
        />
      ) : (
        <Card padding="none">
          <ul className="min-w-0">
            {buscadas.map((t) => {
              const id = idNumerico(t);
              const seleccionada = id !== null && selectedIds.has(id);
              return (
                <li
                  key={t.id}
                  className={`flex min-w-0 items-start gap-2.5 border-b border-line-soft px-3 py-2.5 last:border-0 ${
                    seleccionada ? 'bg-primary-soft' : 'hover:bg-surface-hover'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    onChange={() => { if (id !== null) toggleSel(id); }}
                    aria-label={`Seleccionar ${t.nombre || 'sin nombre'}`}
                    className="mt-1 shrink-0 rounded border-line-strong text-primary focus:ring-primary"
                  />

                  <button
                    type="button"
                    onClick={() => setEditing(aEditable(t))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-body font-semibold text-ink">
                      {t.nombre || '(sin nombre)'}
                    </span>
                    <span className="mt-0.5 block truncate text-micro text-ink-secondary">
                      {t.contenido || '...'}
                    </span>
                    {(t.templateListIds || []).length > 0 && (
                      <span className="mt-1 flex min-w-0 flex-wrap gap-1">
                        {(t.templateListIds || []).map((lid: number) => {
                          const cat = tplLists.find((c) => c.id === lid);
                          return cat ? (
                            /*
                              Punto de color + nombre en tinta normal.

                              Era texto blanco sobre el color que elige el
                              usuario, y eso fallaba AA con TODA la paleta, no
                              con algun caso raro: amarillo 2.15:1, verde
                              2.54:1, azul 3.68:1, rojo 3.76:1, morado 4.23:1.
                              Ninguno llega a 4.5, y encima a 10px.

                              El color pasa a ser refuerzo y el nombre lo porta
                              el texto: es la misma regla del glifo de canal, y
                              lo que ya hacen las fichas de filtro dos bloques
                              mas arriba. El componente estaba discrepando
                              consigo mismo.
                            */
                            <span
                              key={lid}
                              className="flex min-w-0 items-center gap-1 text-micro text-ink-secondary"
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate">{cat.name}</span>
                            </span>
                          ) : null;
                        })}
                      </span>
                    )}
                  </button>

                  <IconButton
                    icon={<Icon.Trash />}
                    label={`Eliminar ${t.nombre || 'plantilla'}`}
                    size="sm"
                    variant="ghost-danger"
                    className="shrink-0"
                    onClick={() => { if (id !== null) handleDelete(id); }}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 shadow-card">
          <span className="text-micro text-ink-secondary">{selectedIds.size} seleccionadas</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Eliminar</Button>
          </div>
        </div>
      )}

      {editing && (
        <Modal
          onClose={() => setEditing(null)}
          maxWidth="420px"
          label={editing.id ? 'Editar plantilla' : 'Nueva plantilla'}
        >
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-card-title font-semibold text-ink">
                {editing.id ? 'Editar' : 'Nueva'} {nombreItem} · {canalLabel}
              </h2>
              <IconButton icon={<Icon.Close />} label="Cerrar" size="sm" onClick={() => setEditing(null)} />
            </div>
            <TemplateEditor
              template={editing}
              type={tab}
              categories={categoriasConId}
              reasons={reasons.filter((r): r is MessageReason & { id: number } => r.id != null)}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
            {editing.id && <SendHistoryDisclosure log={sendLogs} templateName={editing.nombre} />}
          </div>
        </Modal>
      )}

      {showCatManager && (
        <CategoryManagerModal
          categorias={categoriasConId}
          colores={COLORS}
          nombre={catName}
          color={catColor}
          onNombreChange={setCatName}
          onColorChange={setCatColor}
          onCrear={handleCreateCategory}
          onEliminar={handleDeleteCategory}
          onClose={() => setShowCatManager(false)}
        />
      )}

      {showReasonManager && (
        <ReasonManagerModal
          motivos={reasons}
          texto={reasonText}
          error={reasonError}
          onTextoChange={(v) => { setReasonText(v); setReasonError(''); }}
          onCrear={handleCreateReason}
          onEliminar={handleDeleteReason}
          onClose={() => setShowReasonManager(false)}
        />
      )}
    </div>
  );
}
