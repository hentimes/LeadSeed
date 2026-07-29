import { useEffect, useState } from 'react';
import type { Lead, LeadList, LeadStatus } from '../../types';
import { formatRutDisplay, isValidRut, normalizeRut } from '../../utils/rutNormalizer';
import { normalizePhone } from '../../utils/waHelper';
import { PhoneInput } from './form/PhoneInput';
import { ComunaInput } from './form/ComunaInput';
import { HealthSystemSection } from './form/HealthSystemSection';

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
  
  const [rangoEdad, setRangoEdad] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  
  // Health System State
  const [sistema, setSistema] = useState('Fonasa');
  const [rangoRenta, setRangoRenta] = useState('');
  const [isapre, setIsapre] = useState('');
  const [numeroCargas, setNumeroCargas] = useState('');
  const [edadCargas, setEdadCargas] = useState('');

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
      
      const rp = lead.metadata?.raw_payload || {};
      setRangoEdad(rp.rango_edad || '');
      setRegion(rp.region || '');
      setComuna(rp.comuna || '');
      setSistema(rp.sistema_actual || '');
      setRangoRenta(rp.rango_renta || '');
      setIsapre(rp.isapre_especifica || '');
      setNumeroCargas(rp.numero_cargas || '');
      setEdadCargas(rp.edad_cargas ? (Array.isArray(rp.edad_cargas) ? JSON.stringify(rp.edad_cargas) : String(rp.edad_cargas)) : '');
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
    setRangoEdad('');
    setRegion('');
    setComuna('');
    setSistema('Fonasa');
    setRangoRenta('');
    setIsapre('');
    setNumeroCargas('');
    setEdadCargas('');
  }, [lead]);

  const toggleList = (id: number) => {
    setListaIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleRutChange = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length > 9) {
      clean = clean.slice(0, 9);
    }
    
    if (clean.length <= 1) {
      setRut(clean);
      return;
    }
    
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    
    const reversed = body.split('').reverse();
    const withDots: string[] = [];
    for (let i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 === 0) withDots.push('.');
      withDots.push(reversed[i]);
    }
    const formattedBody = withDots.reverse().join('');
    
    setRut(`${formattedBody}-${dv}`);
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

    // Parse edadCargas if possible
    let parsedEdadCargas: string | string[] = edadCargas;
    try {
      if (edadCargas.trim().startsWith('[')) {
        parsedEdadCargas = JSON.parse(edadCargas);
      }
    } catch {
      // ignore
    }

    const newMetadata = {
      ...(lead?.metadata || {}),
      raw_payload: {
        ...(lead?.metadata?.raw_payload || {}),
        rango_edad: rangoEdad.trim(),
        region: region.trim(),
        comuna: comuna.trim(),
        sistema_actual: sistema.trim(),
        rango_renta: rangoRenta.trim(),
        isapre_especifica: isapre.trim(),
        numero_cargas: numeroCargas.trim(),
        edad_cargas: parsedEdadCargas,
      }
    };

    onSave({
      ...(lead || {}),
      id: lead?.id || undefined,
      name: name.trim(),
      phone: normalizePhone(phone) || phone,
      email: email.trim(),
      company: company.trim(),
      rut: normalizedRut || '',
      notes: notes.trim(),
      status, // Will preserve existing or default to 'nuevo'
      score: lead?.score || 0,
      listaIds,
      metadata: newMetadata,
      createdAt: lead?.createdAt || '',
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
            placeholder="Ej. Juan Pérez"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">RUT</label>
          <input
            type="text"
            value={rut}
            onChange={(e) => handleRutChange(e.target.value)}
            onBlur={handleRutBlur}
            placeholder="12.345.678-9"
            className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhoneInput value={phone} onChange={setPhone} />
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <HealthSystemSection 
        rangoEdad={rangoEdad}
        onRangoEdadChange={setRangoEdad}
        sistema={sistema}
        onSistemaChange={setSistema}
        rangoRenta={rangoRenta}
        onRangoRentaChange={setRangoRenta}
        isapre={isapre}
        onIsapreChange={setIsapre}
        numeroCargas={numeroCargas}
        onNumeroCargasChange={setNumeroCargas}
        edadCargas={edadCargas}
        onEdadCargasChange={setEdadCargas}
      />

      <ComunaInput 
        comuna={comuna} 
        region={region} 
        onComunaChange={setComuna} 
        onRegionChange={setRegion} 
      />



      <div>
        <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Escribe algún comentario o nota importante..."
          className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400 resize-none"
        />
      </div>

      {lists.length > 0 && (
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Listas</label>
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <button
                key={list.id!}
                type="button"
                onClick={() => toggleList(list.id!!)}
                className={`rounded-[6px] border px-2 py-1 text-[11px] font-semibold transition-all ${
                  listaIds.includes(list.id!!)
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
                style={listaIds.includes(list.id!!) ? { backgroundColor: list.color } : {}}
              >
                {list.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="p-2.5 bg-red-50 border border-red-100 rounded-[6px]"><p className="text-[11px] font-semibold text-red-600">{error}</p></div>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-[6px] bg-slate-100 px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-200 transition-colors">
          Cancelar
        </button>
        <button type="submit" className="flex-1 rounded-[6px] bg-[#6C4CF6] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#5b3ce0] transition-colors shadow-sm">
          {lead?.id ? 'Guardar Cambios' : 'Crear Lead'}
        </button>
      </div>
    </form>
  );
}