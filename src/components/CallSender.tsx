import { useState, useMemo } from 'react';
import type { Lead, CallTemplate, CallTemplateList, LeadList } from '../types';
import { db } from '../db/database';
import { getAssignedLeads } from '../hooks/useTemplates';
import { Icon } from '../utils/icons';

interface Props {
  leads: Lead[];
  templates: CallTemplate[];
  templateLists: CallTemplateList[];
  leadLists: LeadList[];
}

export default function CallSender({ leads, templates, templateLists, leadLists }: Props) {
  const [selectedListId, setSelectedListId] = useState<number | 'all'>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [assignedLeadIds, setAssignedLeadIds] = useState<number[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | ''>('');
  
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');

  const filteredTemplates = useMemo(() => {
    if (selectedListId === 'all') return templates;
    return templates.filter((t) => (t.templateListIds || []).includes(selectedListId));
  }, [templates, selectedListId]);

  const handleTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTemplateId(val === '' ? '' : Number(val));
    if (!val) {
      setAssignedLeadIds([]);
      setSelectedLeadId('');
      return;
    }
    const tpl = templates.find((t) => t.id === Number(val));
    if (tpl) {
      const { allIds } = await getAssignedLeads(tpl);
      setAssignedLeadIds(allIds);
      if (!allIds.includes(Number(selectedLeadId))) setSelectedLeadId('');
    }
  };

  const validLeads = useMemo(() => {
    if (!selectedTemplateId) return [];
    return leads.filter((l) => assignedLeadIds.includes(l.id!));
  }, [leads, assignedLeadIds, selectedTemplateId]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedLead = validLeads.find(l => l.id === selectedLeadId);

  const handleLogCall = async () => {
    if (!selectedTemplate || !selectedLead) return;
    setLogging(true);
    
    // Solo registrar en la DB, no enviamos nada real
    try {
      await db.sendLog.add({
        templateId: selectedTemplate.id!,
        templateType: 'call',
        leadId: selectedLead.id!,
        leadName: selectedLead.name,
        leadPhone: selectedLead.phone,
        sentAt: new Date().toISOString(),
      });
      setMessage('Llamada registrada con éxito');
    } catch (e) {
      setMessage('Error al registrar llamada');
    }
    setLogging(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="bg-white border rounded-lg p-4 max-w-2xl">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">1. Categoría de Llamada</label>
        <select
          value={selectedListId}
          onChange={(e) => {
            setSelectedListId(e.target.value === 'all' ? 'all' : Number(e.target.value));
            setSelectedTemplateId('');
            setAssignedLeadIds([]);
            setSelectedLeadId('');
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">Todas las categorías</option>
          {templateLists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">2. Guion / Script</label>
        <select
          value={selectedTemplateId}
          onChange={handleTemplateChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">-- Seleccionar Guion --</option>
          {filteredTemplates.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">3. Lead a llamar</label>
        <select
          value={selectedLeadId}
          onChange={(e) => setSelectedLeadId(e.target.value ? Number(e.target.value) : '')}
          disabled={!selectedTemplateId}
          className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
        >
          <option value="">-- Seleccionar Lead --</option>
          {validLeads.map((l) => (
            <option key={l.id} value={l.id}>{l.name} ({l.phone || 'Sin número'})</option>
          ))}
        </select>
        {selectedTemplateId && validLeads.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Este guion no tiene leads asignados.</p>
        )}
      </div>

      {selectedTemplate && selectedLead && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Guion Activo</h4>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedTemplate.contenido}</p>
        </div>
      )}

      <button
        onClick={handleLogCall}
        disabled={!selectedTemplateId || !selectedLeadId || logging}
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {logging ? 'Registrando...' : <><Icon.Phone /> Registrar Llamada Completada</>}
      </button>

      {message && (
        <div className={`mt-3 p-2 rounded text-sm text-center font-medium flex items-center justify-center gap-1.5 ${message.includes('éxito') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.includes('éxito') ? <Icon.Check /> : <Icon.Warning />} {message}
        </div>
      )}
    </div>
  );
}
