import { useState, useMemo } from 'react';
import type { Lead, CallTemplate, CallTemplateList, LeadList } from '../../types';
import { getAssignedLeads } from '../../hooks/useTemplates';
import { Icon } from '../../utils/icons';
import { getCurrentSession } from '../../services/authService';
import { logCallSend } from '../../services/sendService';

interface Props {
  leads: Lead[];
  templates: CallTemplate[];
  templateLists: CallTemplateList[];
  leadLists: LeadList[];
}

export default function CallSender({ leads, templates, templateLists }: Props) {
  const [selectedListId, setSelectedListId] = useState<number | 'all'>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [assignedLeadIds, setAssignedLeadIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | ''>('');
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');

  const filteredTemplates = useMemo(() => {
    if (selectedListId === 'all') return templates;
    return templates.filter((template) => (template.templateListIds || []).includes(selectedListId));
  }, [templates, selectedListId]);

  const findTemplateById = (value: string) => templates.find((template) => String(template.id ?? '') === value) || null;

  const handleTemplateChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedTemplateId(value);
    if (!value) {
      setAssignedLeadIds([]);
      setSelectedLeadId('');
      return;
    }

    const template = findTemplateById(value);
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

      await logCallSend(userId, selectedTemplate.id!, selectedLead);
      setMessage('Llamada registrada con exito');
    } catch {
      setMessage('Error al registrar llamada');
    } finally {
      setLogging(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">1. Categoria de Llamada</label>
        <select
          value={selectedListId}
          onChange={(event) => {
            setSelectedListId(event.target.value === 'all' ? 'all' : Number(event.target.value));
            setSelectedTemplateId('');
            setAssignedLeadIds([]);
            setSelectedLeadId('');
          }}
          className="w-full border border-slate-300 dark:border-slate-600/50 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">Todas las categorias</option>
          {templateLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">2. Guion / Script</label>
        <select
          value={selectedTemplateId}
          onChange={handleTemplateChange}
          className="w-full border border-slate-300 dark:border-slate-600/50 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">-- Seleccionar Guion --</option>
          {filteredTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">3. Lead a llamar</label>
        <select
          value={selectedLeadId}
          onChange={(event) => setSelectedLeadId(event.target.value || '')}
          disabled={!selectedTemplateId}
          className="w-full border border-slate-300 dark:border-slate-600/50 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 dark:bg-slate-800"
        >
          <option value="">-- Seleccionar Lead --</option>
          {validLeads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name} ({lead.phone || 'Sin numero'})
            </option>
          ))}
        </select>
        {selectedTemplateId && validLeads.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Este guion no tiene leads asignados.</p>
        )}
      </div>

      {selectedTemplate && (
        <div className="mb-4 border-b border-gray-100 pb-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">1. Seleccionar Guion</h3>
          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{selectedTemplate.contenido}</p>
        </div>
      )}

      <button
        onClick={handleLogCall}
        disabled={!selectedTemplateId || !selectedLeadId || logging}
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {logging ? 'Registrando...' : (
          <>
            <Icon.Phone /> Registrar Llamada Completada
          </>
        )}
      </button>

      {message && (
        <div
          className={`mt-3 p-2 rounded text-sm text-center font-medium flex items-center justify-center gap-1.5 ${
            message.includes('exito') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.includes('exito') ? <Icon.Check /> : <Icon.Warning />} {message}
        </div>
      )}
    </div>
  );
}
