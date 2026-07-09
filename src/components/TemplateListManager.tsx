import { useEffect, useState } from 'react';

interface TemplateList {
  id?: number;
  name: string;
  color: string;
}

interface Props {
  lists: TemplateList[];
  onSave: (list: TemplateList) => void;
  onDelete: (id: number) => void;
  onSelect: (list: TemplateList | null) => void;
  selectedId: number | null;
}

const COLORS: { name: string; value: string }[] = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Naranja', value: '#F97316' },
];

export default function TemplateListManager({ lists, onSave, onDelete, onSelect, selectedId }: Props) {
  const [editing, setEditing] = useState<TemplateList | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].value);

  useEffect(() => {
    if (editing) { setName(editing.name); setColor(editing.color); }
    else { setName(''); setColor(COLORS[Math.floor(Math.random() * COLORS.length)].value); }
  }, [editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: editing?.id || 0, name: name.trim(), color });
    setEditing(null);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3 items-end">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de categoría"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
          required
        />
        <div className="relative">
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white appearance-none pr-6 focus:ring-2 focus:ring-blue-500"
          >
            {COLORS.map((c) => (
              <option key={c.value} value={c.value}>{c.name}</option>
            ))}
          </select>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none" style={{ backgroundColor: color }} />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-medium hover:bg-blue-700">
          {editing ? 'OK' : 'Crear'}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(null)} className="bg-gray-200 px-2.5 py-1.5 rounded text-xs">Cancelar</button>
        )}
      </form>

      <div className="space-y-1">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-2 py-1.5 rounded text-xs ${selectedId === null ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        >
          Todas
        </button>
        {lists.map((list) => (
          <div
            key={list.id}
            onClick={() => onSelect(list)}
            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs ${selectedId === list.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
              <span>{list.name}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); setEditing(list); }} className="text-blue-600 hover:text-blue-800 text-xs">E</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(list.id!); }} className="text-red-600 hover:text-red-800 text-xs">X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
