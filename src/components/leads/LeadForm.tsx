import { useEffect, useState } from 'react';
import type { Lead, LeadList, LeadStatus } from '../../types';
import { STATUS_LABELS } from '../../types';
import { normalizePhone } from '../../utils/waHelper';

interface Props {
  lead?: Lead | null;
  lists: LeadList[];
  onSave: (lead: Lead) => void;
  onCancel: () => void;
}

export default function LeadForm({ lead, lists, onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [rut, setRut] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('nuevo');
  const [listaIds, setListaIds] = useState<number[]>([]);

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone);
      setEmail(lead.email);
      setCompany(lead.company);
      setRut(lead.rut || '');
      setNotes(lead.notes);
      setStatus(lead.status || 'nuevo');
      setListaIds(lead.listaIds || []);
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setCompany('');
      setRut('');
      setNotes('');
      setStatus('nuevo');
      setListaIds([]);
    }
  }, [lead]);

  const toggleList = (id: number) => {
    setListaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!phone.trim() && !email.trim()) { setError('Debe tener teléfono o email.'); return; }
    onSave({
      id: lead?.id || undefined,
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim(),
      company: company.trim(),
      rut: rut.trim(),
      notes: notes.trim(),
      status,
      score: lead?.score || 0,
      listaIds,
      createdAt: lead?.createdAt || '',
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Teléfono (+569XXXXXXXX)</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="12345678 o +56912345678"
            className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Empresa</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">RUT</label>
          <input
            type="text"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="12345678-9"
            className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {lists.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Listas</label>
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <button
                key={list.id!}
                type="button"
                onClick={() => toggleList(list.id!!)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  listaIds.includes(list.id!!)
                    ? 'text-white border-transparent'
                    : 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600/50 dark:border-gray-600 hover:border-gray-400'
                }`}
                style={
                  listaIds.includes(list.id!!)
                    ? { backgroundColor: list.color }
                    : {}
                }
              >
                {list.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          {lead?.id ? 'Actualizar' : 'Crear Lead'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-slate-600 dark:text-slate-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
