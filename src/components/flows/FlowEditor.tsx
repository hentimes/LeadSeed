import { useEffect, useState } from 'react';
import { Button, Card, Field, IconButton, Input, Select } from '../../design';
import { Icon } from '../../utils/icons';
import { ChannelTabs } from '../templates/ChannelTabs';
import { fetchTemplatesByType } from '../../services/templatesService';
import { validarFlujo } from '../../services/messageFlowsService';
import type { FlowChannel, MessageFlow, MessageFlowStep } from '../../types';

interface PasoEditable {
  templateId: string;
  waitDays: number;
}

interface Props {
  flujo: MessageFlow | null;
  pasosIniciales: MessageFlowStep[];
  onGuardar: (
    datos: { id?: string; channel: FlowChannel; name: string },
    pasos: PasoEditable[]
  ) => Promise<void>;
  onCancelar: () => void;
}

/**
 * Editor de flujo.
 *
 * Es una **vista de pagina, no un dialogo**, y la razon es de medida: en un
 * panel de 360px un `Modal` deja 278px de contenido, y una fila de paso
 * necesita numero, nombre de plantilla y dos flechas. Entra por los pelos y sin
 * sitio para el nombre. Ademas el dialogo bloquea el scroll de la pagina, asi
 * que un flujo de ocho pasos scrollearia dentro de una caja dentro del panel.
 *
 * Reordenar es con flechas y no arrastrando: en una columna estrecha que ya
 * hace scroll vertical, el arrastre pelea con el scroll, y dos botones son
 * operables con teclado sin inventar ARIA de arrastre.
 */
export function FlowEditor({ flujo, pasosIniciales, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(flujo?.name ?? '');
  const [canal, setCanal] = useState<FlowChannel>(flujo?.channel ?? 'whatsapp');
  const [pasos, setPasos] = useState<PasoEditable[]>(
    pasosIniciales.map((p) => ({ templateId: p.templateId, waitDays: p.waitDays }))
  );
  const [plantillas, setPlantillas] = useState<Array<{ id: string; nombre: string }>>([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchTemplatesByType<{ id: string; nombre: string }>(canal).then((lista) =>
      setPlantillas(lista.map((t) => ({ id: String(t.id), nombre: t.nombre })))
    );
  }, [canal]);

  // El canal se bloquea en cuanto hay pasos: las plantillas son de un canal, y
  // cambiarlo dejaria cada paso apuntando a una plantilla de otro.
  const canalBloqueado = pasos.length > 0;

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= pasos.length) return;
    const copia = [...pasos];
    const [movido] = copia.splice(desde, 1);
    if (movido) copia.splice(hacia, 0, movido);
    setPasos(copia);
  };

  const guardar = async () => {
    const problema = validarFlujo(nombre, pasos);
    if (problema) {
      setError(problema);
      return;
    }
    if (pasos.some((p) => !p.templateId)) {
      setError('Cada paso necesita una plantilla.');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      await onGuardar({ ...(flujo ? { id: flujo.id } : {}), channel: canal, name: nombre }, pasos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el flujo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconButton icon={<Icon.ArrowLeft />} label="Volver" size="sm" onClick={onCancelar} />
        <h2 className="min-w-0 flex-1 truncate text-card-title font-semibold text-ink">
          {flujo ? 'Editar flujo' : 'Nuevo flujo'}
        </h2>
      </div>

      <Field label="Nombre">
        <Input
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(''); }}
          placeholder="Reactivacion de frios"
          autoFocus
        />
      </Field>

      <Field
        label="Canal"
        hint={
          canalBloqueado
            ? 'No se puede cambiar con pasos creados: las plantillas son de un canal. Quita los pasos para cambiarlo.'
            : 'WhatsApp abre el chat con el mensaje escrito. LeadSeed no puede confirmar que se envio ni que llego.'
        }
      >
        <div className={canalBloqueado ? 'pointer-events-none opacity-60' : ''}>
          <ChannelTabs active={canal} onChange={setCanal} />
        </div>
      </Field>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">Pasos</span>
        <Card padding="none">
          <ul className="min-w-0">
            {pasos.map((paso, i) => (
              <li key={i} className="flex min-w-0 items-start gap-2 border-b border-line-soft p-3 last:border-0">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro font-bold text-primary">
                  {i + 1}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Select
                    value={paso.templateId}
                    aria-label={`Plantilla del paso ${i + 1}`}
                    onChange={(e) => {
                      const copia = [...pasos];
                      copia[i] = { ...paso, templateId: e.target.value };
                      setPasos(copia);
                    }}
                  >
                    <option value="">Elegir plantilla...</option>
                    {plantillas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </Select>

                  <label className="flex items-center gap-2 text-micro text-ink-secondary">
                    Esperar
                    <input
                      type="number"
                      min={0}
                      value={paso.waitDays}
                      aria-label={`Dias de espera del paso ${i + 1}`}
                      onChange={(e) => {
                        const copia = [...pasos];
                        copia[i] = { ...paso, waitDays: Math.max(0, Number(e.target.value) || 0) };
                        setPasos(copia);
                      }}
                      className="h-control w-16 rounded-md border border-line bg-surface px-2 text-body text-ink outline-none focus:border-primary"
                    />
                    dias {i === 0 ? 'desde la inscripcion' : 'desde el paso anterior'}
                  </label>
                </div>

                <div className="flex shrink-0 flex-col">
                  <IconButton
                    icon={<Icon.ChevronUp />}
                    label={`Mover el paso ${i + 1} hacia arriba`}
                    size="sm"
                    disabled={i === 0}
                    onClick={() => mover(i, i - 1)}
                  />
                  <IconButton
                    icon={<Icon.ChevronDown />}
                    label={`Mover el paso ${i + 1} hacia abajo`}
                    size="sm"
                    disabled={i === pasos.length - 1}
                    onClick={() => mover(i, i + 1)}
                  />
                  <IconButton
                    icon={<Icon.Trash />}
                    label={`Quitar el paso ${i + 1}`}
                    size="sm"
                    variant="ghost-danger"
                    onClick={() => setPasos(pasos.filter((_, j) => j !== i))}
                  />
                </div>
              </li>
            ))}

            <li className="border-t border-dashed border-line p-2">
              <Button
                size="sm"
                className="w-full"
                onClick={() => setPasos([...pasos, { templateId: '', waitDays: pasos.length === 0 ? 0 : 3 }])}
              >
                Añadir paso
              </Button>
            </li>
          </ul>
        </Card>
      </div>

      {error && (
        <p role="alert" className="text-micro text-state-danger">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancelar}>Cancelar</Button>
        <Button variant="primary" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando...' : 'Guardar flujo'}
        </Button>
      </div>
    </div>
  );
}
