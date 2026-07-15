import { useState, useEffect } from 'react';
import type { Task, Lead, LeadList } from '../../types';

interface TaskFormProps {
  task: Task | null;
  leads: Lead[];
  lists: LeadList[];
  onSave: (data: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}

export default function TaskForm({ task, leads, lists, onSave, onCancel }: TaskFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [leadListIds, setLeadListIds] = useState<number[]>([]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  useEffect(() => {
    if (task) {
      setTitulo(task.titulo);
      setDescripcion(task.descripcion);
      setLeadIds(task.leadIds || []);
      setLeadListIds(task.leadListIds || []);
      setFechaVencimiento(task.fechaVencimiento ? task.fechaVencimiento.slice(0, 10) : '');
    } else {
      setTitulo('');
      setDescripcion('');
      setLeadIds([]);
      setLeadListIds([]);
      setFechaVencimiento('');
    }
  }, [task]);

  const handleSubmit = () => {
    if (!titulo.trim()) return;
    onSave({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      leadIds,
      leadListIds,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento + 'T23:59:59').toISOString() : '',
    });
  };

  return (
    <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-base font-semibold mb-3">{task ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título *</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-600" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Vencimiento</label>
          <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Leads asignados</label>
          <div className="border rounded max-h-32 overflow-y-auto p-1 dark:border-gray-600">
            {leads.filter((l) => !l.deletedAt).map((lead) => (
              <label key={lead.id} className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-xs">
                <input type="checkbox" checked={leadIds.includes(lead.id!)} onChange={() => setLeadIds((prev) => prev.includes(lead.id!) ? prev.filter((x) => x !== lead.id) : [...prev, lead.id!])} />
                {lead.name}
              </label>
            ))}
          </div>
        </div>
        {lists.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Listas asignadas</label>
            <div className="flex flex-wrap gap-1">
              {lists.map((list) => (
                <button key={list.id} type="button" onClick={() => setLeadListIds((prev) => prev.includes(list.id!) ? prev.filter((x) => x !== list.id) : [...prev, list.id!])}
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${leadListIds.includes(list.id!) ? 'text-white border-transparent' : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'}`}
                  style={leadListIds.includes(list.id!) ? { backgroundColor: list.color } : {}}>
                  {list.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
            {task ? 'Actualizar' : 'Crear Tarea'}
          </button>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded text-xs font-medium transition-colors underline decoration-dotted">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
