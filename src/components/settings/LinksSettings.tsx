import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listFormTypes } from '../../services/captureLinksService';
import type { FormType } from '../../types';
import FormTypeLinksSection from './links/FormTypeLinksSection';
import FormTypeRegistryForm from './FormTypeRegistryForm';
import { getErrorMessage } from '../../utils/errorMessage';

/**
 * Reemplaza CaptureLinksSettings (solo pb) y AdminRetiroLinksPanel (solo
 * retiro, antes viviendo separado dentro de Admin). Todo tipo de formulario
 * registrado en form_types aparece aca como una seccion: los tipos abiertos
 * (pb hoy) los ve cualquier usuario, los admin-only (retiro hoy, form
 * despues de registrarlo) solo el admin. Solo el admin ve ademas el
 * formulario para registrar tipos nuevos.
 */
export default function LinksSettings() {
  const { isAdmin } = useAuth();
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return <p className="text-sm text-ink-muted py-6">Cargando links de publicacion...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }

  const visibleTypes = formTypes.filter((type) => type.isActive && (!type.linksAdminOnly || isAdmin));

  return (
    <div className="flex flex-col gap-4">
      {visibleTypes.length === 0 && (
        <p className="text-sm text-ink-muted py-6">No hay tipos de formulario disponibles todavia.</p>
      )}
      {visibleTypes.map((formType) => (
        <FormTypeLinksSection key={formType.slug} formType={formType} />
      ))}
      {isAdmin && <FormTypeRegistryForm formTypes={formTypes} onChanged={() => void loadFormTypes()} />}
    </div>
  );
}
