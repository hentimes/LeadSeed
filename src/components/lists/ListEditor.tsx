import React, { useState, useEffect } from 'react';
import type { LeadList } from '../../types';

const COLORS = [
  { name: 'Azul', value: '#3B82F6' }, { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' }, { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' }, { name: 'Rosa', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' }, { name: 'Naranja', value: '#F97316' },
];

interface Props {
  initialData?: LeadList | null;
  onSave: (data: { name: string; color: string }) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function ListEditor({ initialData, onSave, onCancel, submitLabel = 'Guardar' }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].value);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setColor(initialData.color);
    } else {
      setName('');
      setColor(COLORS[0].value);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-3 bg-white p-2 border rounded-lg shadow-sm">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la lista"
        className="flex-1 border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        required
        autoFocus
      />
      <select
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="border rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      >
        {COLORS.map((c) => (
          <option key={c.value} value={c.value}>● {c.name}</option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-500 hover:text-gray-700 text-sm font-medium px-2"
      >
        Cancelar
      </button>
    </form>
  );
}
