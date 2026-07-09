import { useState } from 'react';
import type { LeadList } from '../types';

interface Props {
  lists: LeadList[];
  onSave: (list: LeadList) => void;
  onDelete: (id: number) => void;
}

const COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Naranja', value: '#F97316' },
];

export default function ListManager({ lists, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].value);
  const [status, setStatus] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus('Escribe un nombre');
      return;
    }
    console.log('ListManager: creando lista', trimmed, color);
    setStatus('Guardando...');
    try {
      await onSave({ name: trimmed, color, createdAt: '' });
      setName('');
      setStatus('Creada!');
      setTimeout(() => setStatus(''), 2000);
    } catch (e) {
      console.error('ListManager error:', e);
      setStatus('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setStatus(''); }}
          placeholder="Nombre de la lista"
          className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="border border-gray-300 rounded px-2 py-2 text-sm bg-white flex-1"
          >
            {COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                ● {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 active:bg-blue-800"
          >
            Crear
          </button>
        </div>
        {status && (
          <p className={`text-xs ${status === 'Creada!' ? 'text-green-600' : status.startsWith('Error') ? 'text-red-600' : 'text-gray-500'}`}>
            {status}
          </p>
        )}
      </div>

      <div className="space-y-1">
        {lists.map((list) => (
          <div key={list.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
              <span className="font-medium text-sm">{list.name}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onDelete(list.id!)} className="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
            </div>
          </div>
        ))}
        {lists.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No hay listas. Crea la primera.</p>
        )}
      </div>
    </div>
  );
}
