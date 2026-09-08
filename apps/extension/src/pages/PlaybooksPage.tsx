import { useCallback, useEffect, useState } from 'react';
import { getPlatform } from '../platform/registry';
import { Button, LoadError, Notice, SegmentedControl, Skeleton } from '../design';
import { Icon } from '../utils/icons';
import { usePlaybooks } from '../hooks/usePlaybooks';
import { fetchAllRuns } from '../services/playbookRunService';
import PlaybookList from '../components/playbooks/PlaybookList';
import PlaybookEditor from '../components/playbooks/PlaybookEditor';
import PlaybookRunList from '../components/playbooks/PlaybookRunList';
import PlaybookRunner from '../components/playbooks/PlaybookRunner';
import type { Playbook, PlaybookContent, PlaybookRun } from '../types';
import type { PlaybookDraft } from '../services/playbooksService';

type Vista = 'recorridos' | 'guiones';

/**
 * PLAYBOOKS: los guiones y los recorridos.
 *
 * ## El recorrido enfocado vive en la RUTA, no en un estado
 *
 * `#playbooks?run=<id>` es la unica fuente. Guardarlo ademas en un `useState`
 * es lo que dejo colgada la vista de detalle en la pagina de Flujos: dos
 * verdades sobre lo mismo acaban discrepando.
 *
 * ## Por que la vista por defecto son los recorridos y no los guiones
 *
 * La pregunta que trae aqui es "que reunion tengo a medias", no "que guiones
 * tengo". Los guiones se editan de tarde en tarde; los recorridos se miran
 * cada dia. Es el mismo criterio que puso "Hoy" como entrada de Flujos.
 */
export default function PlaybooksPage() {
  const guiones = usePlaybooks();
  const [vista, setVista] = useState<Vista>('recorridos');
  const [recorridos, setRecorridos] = useState<PlaybookRun[] | null>(null);
  const [errorRecorridos, setErrorRecorridos] = useState('');

  const [editando, setEditando] = useState<Playbook | undefined>();
  const [contenidoEditando, setContenidoEditando] = useState<PlaybookContent | undefined>();
  const [enEditor, setEnEditor] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  const [runIdEnfocado, setRunIdEnfocado] = useState('');

  const leerRunIdDeLaRuta = useCallback(() => {
    const route = getPlatform().navigation.current();
    return route?.name === 'playbooks' ? (route.runId ?? '') : '';
  }, []);

  useEffect(() => {
    const sincronizar = () => setRunIdEnfocado(leerRunIdDeLaRuta());
    sincronizar();
    return getPlatform().navigation.subscribe(sincronizar);
  }, [leerRunIdDeLaRuta]);

  const cargarRecorridos = useCallback(async () => {
    setErrorRecorridos('');
    try {
      setRecorridos(await fetchAllRuns());
    } catch (err) {
      setErrorRecorridos(err instanceof Error ? err.message : 'No se pudieron cargar');
    }
  }, []);

  useEffect(() => {
    void cargarRecorridos();
  }, [cargarRecorridos, guiones.refreshKey]);

  useEffect(() => {
    void guiones.recargar();
  }, [guiones.refreshKey]);

  const abrirRecorrido = (runId: string) =>
    getPlatform().navigation.replace({ name: 'playbooks', runId });

  const volverDelRecorrido = () => {
    getPlatform().navigation.replace({ name: 'playbooks' });
    void cargarRecorridos();
  };

  if (runIdEnfocado) {
    return <PlaybookRunner runId={runIdEnfocado} onVolver={volverDelRecorrido} />;
  }

  if (enEditor) {
    return (
      <PlaybookEditor
        playbook={editando}
        contenido={contenidoEditando}
        guardando={guardando}
        onCancelar={() => {
          setEnEditor(false);
          setEditando(undefined);
          setContenidoEditando(undefined);
        }}
        onGuardar={(draft: PlaybookDraft) => {
          setGuardando(true);
          setAviso('');
          void guiones
            .guardar(draft)
            .then(() => {
              setEnEditor(false);
              setEditando(undefined);
              setContenidoEditando(undefined);
            })
            .catch((err: unknown) => {
              setAviso(err instanceof Error ? err.message : 'No se pudo guardar el guion');
            })
            .finally(() => setGuardando(false));
        }}
      />
    );
  }

  const abrirEditor = async (playbook?: Playbook) => {
    setEditando(playbook);
    setContenidoEditando(playbook ? await guiones.getContenido(playbook.id) : undefined);
    setEnEditor(true);
  };

  return (
    <div className="space-y-3 p-3">
      {!!aviso && <Notice tone="danger" onDismiss={() => setAviso('')}>{aviso}</Notice>}

      {/* El carril va a la derecha y solo con el ancho que necesita: estirado
          de lado a lado pesaba como una tercera barra de navegacion, debajo de
          las pestañas de Mensajes que ya estan arriba. */}
      <div className="flex items-center justify-end gap-2">
        {vista === 'guiones' && (
          <Button variant="primary" size="sm" icon={Icon.Plus()} onClick={() => void abrirEditor()}>
            Nuevo
          </Button>
        )}
        <SegmentedControl
          label="Vista"
          value={vista}
          onChange={setVista}
          options={[
            { value: 'recorridos', label: 'Recorridos', icon: Icon.Bullseye() },
            { value: 'guiones', label: 'Guiones', icon: Icon.Templates() },
          ]}
        />
      </div>

      {vista === 'recorridos' ? (
        errorRecorridos ? (
          <LoadError onRetry={() => void cargarRecorridos()} />
        ) : recorridos === null ? (
          <Skeleton height="40px" />
        ) : (
          <PlaybookRunList
            enCurso={recorridos.filter((r) => r.status === 'en_curso')}
            historicos={recorridos.filter((r) => r.status !== 'en_curso')}
            onAbrir={(run) => abrirRecorrido(run.id)}
            onCrearGuion={() => setVista('guiones')}
          />
        )
      ) : guiones.cargando && guiones.lista.length === 0 ? (
        <Skeleton height="40px" />
      ) : (
        <PlaybookList
          lista={guiones.lista}
          onEditar={(playbook) => void abrirEditor(playbook)}
          onArchivar={(playbook) => void guiones.archivar(playbook.id, !playbook.isActive)}
        />
      )}
    </div>
  );
}
