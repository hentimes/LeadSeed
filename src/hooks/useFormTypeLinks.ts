import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildLinkUrl,
  createMyCaptureLink,
  deactivateMyCaptureLink,
  getMyCaptureLinkStats,
  getMyCaptureLinksLimit,
  listMyCaptureLinks,
  resetMyCaptureLinkProgress,
  updateMyCaptureLink,
} from '../services/captureLinksService';
import type { CaptureLink, CaptureLinkStats, FormType } from '../types';
import { getErrorMessage } from '../utils/errorMessage';
import { topLeadStats } from '../utils/captureLinkFormat';
import { getPlatform } from '../platform/registry';

export interface LinkFormState {
  label: string;
  campaignName: string;
}

const emptyForm: LinkFormState = { label: '', campaignName: '' };

export interface UseFormTypeLinksResult {
  links: CaptureLink[];
  limit: number | null;
  form: LinkFormState;
  editingId: number | null;
  selectedLink: CaptureLink | undefined;
  selectedStats: CaptureLinkStats[];
  message: string;
  error: string;
  loading: boolean;
  saving: boolean;
  /** Los tipos abiertos a todo el mundo tienen link principal y cupos. */
  showDefaultConcept: boolean;
  canCreate: boolean;
  slotsText: string;
  isFormOpen: boolean;
  openCreate: () => void;
  openEdit: (link: CaptureLink) => void;
  closeForm: () => void;
  setForm: (updater: (current: LinkFormState) => LinkFormState) => void;
  select: (id: number) => void;
  dismissError: () => void;
  save: () => Promise<void>;
  deactivate: (link: CaptureLink) => Promise<void>;
  reactivate: (link: CaptureLink) => Promise<void>;
  makeDefault: (link: CaptureLink) => Promise<void>;
  resetProgress: (link: CaptureLink) => Promise<void>;
  copyUrl: (link: CaptureLink) => Promise<void>;
  urlOf: (link: CaptureLink) => string;
}

/** Cuanto dura el aviso de exito antes de volver al estado normal. */
const MENSAJE_MS = 2500;

/**
 * Estado y acciones de los links de captura de UN tipo de formulario.
 *
 * Vive aparte del componente por dos motivos. El primero es de tamano: la
 * seccion tenia 429 lineas con la carga de datos, seis acciones remotas y
 * todo el marcado mezclados. El segundo es que aca la frontera de
 * portabilidad obliga a pedir la confirmacion por el puerto `dialogs` en vez
 * de llamar a `confirm()`, que no existe en React Native.
 */
export function useFormTypeLinks(formType: FormType): UseFormTypeLinksResult {
  const [links, setLinks] = useState<CaptureLink[]>([]);
  const [stats, setStats] = useState<CaptureLinkStats[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [form, setFormState] = useState<LinkFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showDefaultConcept = !formType.linksAdminOnly;

  const loadData = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [nextLinks, nextStats, nextLimit] = await Promise.all([
        listMyCaptureLinks(formType.slug),
        getMyCaptureLinkStats(),
        getMyCaptureLinksLimit(),
      ]);
      setLinks(nextLinks);
      setStats(nextStats);
      setLimit(nextLimit);
      setSelectedId((current) => current ?? nextLinks[0]?.id ?? null);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los links'));
    } finally {
      setLoading(false);
    }
  }, [formType.slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // El aviso de exito se retira solo: antes se quedaba en pantalla hasta la
  // siguiente accion, empujando la lista hacia abajo indefinidamente.
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), MENSAJE_MS);
    return () => clearTimeout(id);
  }, [message]);

  const selectedLink = useMemo(
    () => links.find((link) => link.id === selectedId) || links[0],
    [links, selectedId],
  );

  const selectedStats = useMemo(
    () => topLeadStats(stats.filter((item) => item.captureLinkId === selectedLink?.id)),
    [selectedLink?.id, stats],
  );

  const canCreate = !showDefaultConcept || limit === null || links.length < limit;
  const slotsText = limit === null ? `${links.length}` : `${links.length}/${limit}`;

  /** Envuelve una accion remota: apaga avisos, marca guardado y recarga. */
  const ejecutar = useCallback(
    async (accion: () => Promise<void>, exito: string, fallo: string) => {
      setSaving(true);
      setError('');
      setMessage('');
      try {
        await accion();
        setMessage(exito);
        await loadData();
      } catch (err) {
        setError(getErrorMessage(err, fallo));
      } finally {
        setSaving(false);
      }
    },
    [loadData],
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormState(emptyForm);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((link: CaptureLink) => {
    setEditingId(link.id);
    setFormState({ label: link.label, campaignName: link.campaignName });
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormState(emptyForm);
  }, []);

  const save = useCallback(async () => {
    const label = form.label.trim();
    if (!label) {
      setError('El nombre del link es obligatorio');
      return;
    }

    const campaignName = form.campaignName.trim();
    const idEnEdicion = editingId;

    await ejecutar(
      async () => {
        if (idEnEdicion) {
          await updateMyCaptureLink(idEnEdicion, { label, campaignName });
        } else {
          await createMyCaptureLink({ label, campaignName, linkType: formType.slug });
        }
      },
      idEnEdicion ? 'Link actualizado' : 'Link creado',
      'No se pudo guardar el link',
    );

    closeForm();
  }, [form, editingId, ejecutar, closeForm, formType.slug]);

  const deactivate = useCallback(
    async (link: CaptureLink) => {
      if (link.isDefault) {
        setError('El link principal no se puede desactivar');
        return;
      }

      const confirmado = await getPlatform().dialogs.confirm(`Desactivar ${link.label}?`);
      if (!confirmado) return;

      await ejecutar(
        async () => {
          await deactivateMyCaptureLink(link.id);
        },
        'Link desactivado',
        'No se pudo desactivar el link',
      );
    },
    [ejecutar],
  );

  const reactivate = useCallback(
    (link: CaptureLink) =>
      ejecutar(
        async () => {
          await updateMyCaptureLink(link.id, {
            label: link.label,
            campaignName: link.campaignName,
            isActive: true,
          });
        },
        'Link reactivado',
        'No se pudo reactivar el link',
      ),
    [ejecutar],
  );

  const makeDefault = useCallback(
    (link: CaptureLink) =>
      ejecutar(
        async () => {
          await updateMyCaptureLink(link.id, {
            label: link.label,
            campaignName: link.campaignName,
            isDefault: true,
            isActive: true,
          });
        },
        'Link principal actualizado',
        'No se pudo cambiar el link principal',
      ),
    [ejecutar],
  );

  const resetProgress = useCallback(
    async (link: CaptureLink) => {
      const confirmado = await getPlatform().dialogs.confirm(
        `Resetear Visitas/Paso 1/Paso 2 de "${link.label}" a cero? Los leads ya capturados no se ven afectados.`,
      );
      if (!confirmado) return;

      await ejecutar(
        async () => {
          await resetMyCaptureLinkProgress(link.id);
        },
        'Contador reseteado',
        'No se pudo resetear el contador',
      );
    },
    [ejecutar],
  );

  const urlOf = useCallback((link: CaptureLink) => buildLinkUrl(formType, link.refCode), [formType]);

  const copyUrl = useCallback(
    async (link: CaptureLink) => {
      await navigator.clipboard.writeText(urlOf(link));
      setMessage('URL copiada');
    },
    [urlOf],
  );

  return {
    links,
    limit,
    form,
    editingId,
    selectedLink,
    selectedStats,
    message,
    error,
    loading,
    saving,
    showDefaultConcept,
    canCreate,
    slotsText,
    isFormOpen,
    openCreate,
    openEdit,
    closeForm,
    setForm: setFormState,
    select: setSelectedId,
    dismissError: () => setError(''),
    save,
    deactivate,
    reactivate,
    makeDefault,
    resetProgress,
    copyUrl,
    urlOf,
  };
}
