import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listFormTypes } from '../../services/captureLinksService';
import type { FormType } from '../../types';
import FormTypeLinksSection from './links/FormTypeLinksSection';
import FormTypeRegistryForm from './FormTypeRegistryForm';
import { getErrorMessage } from '../../utils/errorMessage';
import { EmptyState, Notice, Section } from '../../design';

/**
 * Links de captura, un tipo de formulario por seccion plegable.
 *
 * ## Por que se pliegan
 *
 * Antes se pintaban **todos los tipos a la vez**, cada uno con su tarjeta, su
 * contador de cupos y su lista entera de links. Con dos tipos de tres links
 * eso son ~456px que no se pueden reducir; con cuatro tipos, ~910px. Y casi
 * siempre se entra a mirar uno.
 *
 * ## Y por que ademas ahorra consultas
 *
 * `useFormTypeLinks` se monta **por tipo** y dispara tres peticiones cada vez:
 * los links de ese tipo, las estadisticas y el limite del perfil. Las dos
 * ultimas no estan filtradas por tipo, asi que con tres tipos se pedian tres
 * veces las mismas: nueve peticiones para pintar la pantalla.
 *
 * Como el cuerpo de una seccion cerrada no se monta, el hook del tipo cerrado
 * no corre: se piden **tres**, las del tipo que estas mirando. Queda pendiente
 * la duplicacion de estadisticas y limite si algun dia se abren dos a la vez,
 * que hoy no puede pasar porque solo hay una abierta.
 *
 * El primer tipo visible se abre solo: es determinista, no necesita recordar
 * nada entre sesiones, y cuesta lo mismo que costaba una sola de las tarjetas
 * de antes.
 */
export default function LinksSettings() {
  const { isAdmin } = useAuth();
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  const loadFormTypes = useCallback(async () => {
    setError('');
    try {
      const types = await listFormTypes();
      setFormTypes(types);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los tipos de formulario'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFormTypes();
  }, [loadFormTypes]);

  if (loading) {
    return (
      <div className="space-y-1.5" role="status" aria-label="Cargando">
        {[0, 1].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-surface-sunken" />
        ))}
      </div>
    );
  }

  if (error) return <Notice>{error}</Notice>;

  const visibles = formTypes.filter((type) => type.isActive && (!type.linksAdminOnly || isAdmin));

  if (visibles.length === 0 && !isAdmin) {
    return <EmptyState title="Sin formularios" description="No hay tipos disponibles todavía." />;
  }

  // El primero queda abierto mientras nadie elija otro. `abierto` arranca en
  // null y se compara contra el primero para no tener que sincronizarlo con
  // una lista que llega despues del primer render.
  const abiertoEfectivo = abierto ?? visibles[0]?.slug ?? null;

  const alternar = (slug: string) => setAbierto((actual) => ((actual ?? visibles[0]?.slug) === slug ? '' : slug));

  return (
    <div className="divide-y divide-line">
      {visibles.map((formType) => (
        <Section
          key={formType.slug}
          flush
          id={formType.slug}
          title={formType.displayName}
          isOpen={abiertoEfectivo === formType.slug}
          onToggle={() => alternar(formType.slug)}
        >
          <FormTypeLinksSection formType={formType} />
        </Section>
      ))}

      {isAdmin && (
        <Section
          flush
          id="registro-tipos"
          title="Registrar tipo de formulario"
          isOpen={abiertoEfectivo === 'registro-tipos'}
          onToggle={() => alternar('registro-tipos')}
        >
          <FormTypeRegistryForm formTypes={formTypes} onChanged={() => void loadFormTypes()} />
        </Section>
      )}
    </div>
  );
}
