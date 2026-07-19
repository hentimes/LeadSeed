import { useEffect, useState } from 'react';
import type { Lead, LeadList, LeadStatus } from '../../types';
import { STATUS_LABELS } from '../../types';
import { formatRutDisplay, isValidRut, normalizeRut } from '../../utils/rutNormalizer';
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone);
      setEmail(lead.email);
      setCompany(lead.company);
      setRut(lead.rut ? formatRutDisplay(lead.rut) : '');
      setNotes(lead.notes);
      setStatus(lead.status || 'nuevo');
      setListaIds(lead.listaIds || []);
      return;
    }

    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setRut('');
    setNotes('');
    setStatus('nuevo');
    setListaIds([]);
  }, [lead]);

  const toggleList = (id: number) => {
    setListaIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleRutChange = (value: string) => {
    setRut(value.replace(/[^0-9kK.\-]/g, '').toUpperCase());
  };

  const handleRutBlur = () => {
    if (!rut.trim()) return;
    const normalized = normalizeRut(rut.trim());
    if (!normalized) return;
    setRut(formatRutDisplay(normalized));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!phone.trim() && !email.trim()) {
      setError('Debe tener telefono o email.');
      return;
    }

    const normalizedRut = rut.trim() ? normalizeRut(rut.trim()) : '';
    if (rut.trim() && (!normalizedRut || !isValidRut(normalizedRut))) {
      setError('Ingresa un RUT valido en formato 12.345.678-9.');
      return;
    }

    onSave({
      ...(lead || {}),
      id: lead?.id || undefined,
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim(),
      company: company.trim(),
      rut: normalizedRut || '',
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
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Telefono (+569XXXXXXXX)</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="12345678 o +56912345678"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Empresa</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">RUT</label>
          <input
            type="text"
            value={rut}
            onChange={(e) => handleRutChange(e.target.value)}
            onBlur={handleRutBlur}
            placeholder="12.345.678-9"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
          >
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((item) => (
              <option key={item} value={item}>
                {STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600/50 dark:border-gray-600"
        />
      </div>

      {lists.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Listas</label>
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <button
                key={list.id!}
                type="button"
                onClick={() => toggleList(list.id!!)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  listaIds.includes(list.id!!)
                    ? 'border-transparent text-white'
                    : 'border-slate-300 text-slate-500 hover:border-gray-400 dark:border-slate-600/50 dark:border-gray-600 dark:text-slate-400'
                }`}
                style={listaIds.includes(list.id!!) ? { backgroundColor: list.color } : {}}
              >
                {list.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {lead?.id ? 'Actualizar' : 'Crear Lead'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-300 dark:text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
