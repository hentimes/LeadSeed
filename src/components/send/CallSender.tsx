import { useState, useMemo } from 'react';
import type { Lead, CallTemplate, CallTemplateList, LeadList } from '../../types';
import { getAssignedLeads } from '../../hooks/useTemplates';
import { Icon } from '../../utils/icons';
import { getCurrentSession } from '../../services/authService';
import { logCallSend } from '../../services/sendService';
import { Field, Panel, Select } from '../../design';
import { SendStep } from './SendStep';
import { TemplatePicker } from './TemplatePicker';
import { SendAction } from './RecipientPicker';

interface Props {
  leads: Lead[];
  templates: CallTemplate[];
  templateLists: CallTemplateList[];
  leadLists: LeadList[];
}

export default function CallSender({ leads, templates, templateLists }: Props) {
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [assignedLeadIds, setAssignedLeadIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');

  const findTemplateById = (value: string) =>
    templates.find((template) => String(template.id ?? '') === value) || null;

  const handleTemplateSelect = async (template: CallTemplate | null) => {
    const value = String(template?.id ?? '');
    setSelectedTemplateId(value);
    if (!value) {
      setAssignedLeadIds([]);
      setSelectedLeadId('');
      return;
    }

    if (template) {
      const session = await getCurrentSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { allIds } = await getAssignedLeads(template, userId);
      setAssignedLeadIds(allIds);
      if (!allIds.includes(String(selectedLeadId))) {
        setSelectedLeadId('');
      }
    }
  };

  const validLeads = useMemo(() => {
    if (!selectedTemplateId) return [];
    return leads.filter((lead) => assignedLeadIds.includes(lead.id!));
  }, [leads, assignedLeadIds, selectedTemplateId]);

  const selectedTemplate = findTemplateById(selectedTemplateId);
  const selectedLead = validLeads.find((lead) => lead.id === selectedLeadId);

  const handleLogCall = async () => {
    if (!selectedTemplate || !selectedLead) return;
    setLogging(true);

    try {
      const session = await getCurrentSession();
      const userId = session?.user?.id;
      if (!userId) {
        setMessage('Sesion no disponible');
        return;
      }

      await logCallSend(userId, selectedTemplate.id!, selectedLead, {
        nombre: selectedTemplate.nombre,
        contenido: selectedTemplate.contenido,
      });
      setMessage('Llamada registrada con exito');
    } catch {
      setMessage('Error al registrar llamada');
    } finally {
      setLogging(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-3 animate-ios-slide-up pb-4">
      <SendStep step={1} title="Guion">
        <TemplatePicker
          templates={templates}
          templateLists={templateLists}
          categoryId={selectedListId}
          onCategoryChange={(id) => {
            setSelectedListId(id);
            setSelectedTemplateId('');
            setAssignedLeadIds([]);
            setSelectedLeadId('');
          }}
          selectedId={selectedTemplateId}
          onSelect={handleTemplateSelect}
          itemLabel="guion"
        />
      </SendStep>

      <SendStep step={2} title="Script" disabled={!selectedTemplate}>
        {selectedTemplate ? (
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-muted p-2.5 text-body text-ink">
            {selectedTemplate.contenido}
          </p>
        ) : (
          <p className="text-micro text-ink-muted">Elegí un guion para ver el script.</p>
        )}
      </SendStep>

      <SendStep step={3} title="Lead a llamar" disabled={!selectedTemplateId}>
        <Field
          label="Lead"
          hint={
            selectedTemplateId && validLeads.length === 0
              ? 'Este guion no tiene leads asignados.'
              : undefined
          }
        >
          <Select
            value={selectedLeadId}
            onChange={(event) => setSelectedLeadId(event.target.value)}
            disabled={!selectedTemplateId}
          >
            <option value="">Elegir lead...</option>
            {validLeads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name} ({lead.phone || 'Sin número'})
              </option>
            ))}
          </Select>
        </Field>
      </SendStep>

      <SendStep step={4} title="Registrar">
        <div className="flex flex-col gap-2.5">
          <SendAction
            label={logging ? 'Registrando...' : 'Registrar llamada completada'}
            disabled={!selectedTemplateId || !selectedLeadId || logging}
            onClick={handleLogCall}
          />

          {message && (
            <Panel tone={message.includes('exito') ? 'success' : 'danger'}>
              <div className="flex items-center gap-2 text-body font-medium">
                {message.includes('exito') ? <Icon.Check /> : <Icon.Warning />}
                {message}
              </div>
            </Panel>
          )}
        </div>
      </SendStep>
    </div>
  );
}
