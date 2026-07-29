import re

def update_leads_page():
    with open('src/pages/LeadsPage.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add scroll lock logic
    scroll_lock = """  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showForm]);
"""
    # Find a good place to insert (e.g. after existing useEffects)
    if 'document.body.style.overflow' not in content:
        insert_idx = content.find('  const existingRuts = useMemo(() => {')
        content = content[:insert_idx] + scroll_lock + '\n' + content[insert_idx:]

    # Update modal wrapper
    target_wrapper = """      {showForm && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px] flex flex-col relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-[15px] font-extrabold text-slate-800 tracking-tight">{editing ? 'Editar Lead' : 'Nuevo Lead'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-100px)]">"""
    
    replacement_wrapper = """      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-8 p-4 overflow-y-auto custom-scrollbar" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-[460px] flex flex-col mx-auto animate-scale-in border border-slate-100 mb-8 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 shrink-0">
              <h2 className="text-[15px] font-bold text-slate-800 leading-tight">{editing ? 'Editar Lead' : 'Nuevo Lead'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">"""
            
    content = content.replace(target_wrapper, replacement_wrapper)

    with open('src/pages/LeadsPage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)


def update_lead_form():
    with open('src/components/leads/LeadForm.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add missing state variables
    state_vars = """  const [rangoEdad, setRangoEdad] = useState('');
  const [numeroCargas, setNumeroCargas] = useState('');
  const [edadCargas, setEdadCargas] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');"""
    
    content = content.replace("const [error, setError] = useState('');", "const [error, setError] = useState('');\n" + state_vars)

    # Initialize from lead
    init_from_lead = """      setListaIds(lead.listaIds || []);
      const rp = lead.metadata?.raw_payload || {};
      setRangoEdad(rp.rango_edad || '');
      setNumeroCargas(rp.numero_cargas || '');
      setEdadCargas(rp.edad_cargas ? (Array.isArray(rp.edad_cargas) ? rp.edad_cargas.join(', ') : String(rp.edad_cargas)) : '');
      setRegion(rp.region || '');
      setComuna(rp.comuna || '');
      return;"""
    content = content.replace("setListaIds(lead.listaIds || []);\n      return;", init_from_lead)

    # Reset
    reset_state = """    setListaIds([]);
    setRangoEdad('');
    setNumeroCargas('');
    setEdadCargas('');
    setRegion('');
    setComuna('');"""
    content = content.replace("setListaIds([]);", reset_state)

    # Update handleSubmit payload
    submit_target = """    onSave({
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
    });"""

    submit_replacement = """    const newMetadata = {
      ...(lead?.metadata || {}),
      raw_payload: {
        ...(lead?.metadata?.raw_payload || {}),
        rango_edad: rangoEdad.trim(),
        numero_cargas: numeroCargas.trim(),
        edad_cargas: edadCargas.trim(),
        region: region.trim(),
        comuna: comuna.trim(),
      }
    };

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
      metadata: newMetadata,
      createdAt: lead?.createdAt || '',
      updatedAt: new Date().toISOString(),
    });"""
    content = content.replace(submit_target, submit_replacement)

    # Update form JSX to include the fields
    # Right before "Notas"
    form_fields = """      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Región</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Comuna</label>
          <input
            type="text"
            value={comuna}
            onChange={(e) => setComuna(e.target.value)}
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Edad</label>
          <input
            type="text"
            value={rangoEdad}
            onChange={(e) => setRangoEdad(e.target.value)}
            placeholder="Ej. 30"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cargas</label>
          <input
            type="text"
            value={numeroCargas}
            onChange={(e) => setNumeroCargas(e.target.value)}
            placeholder="Ej. 2"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Edad de cargas</label>
          <input
            type="text"
            value={edadCargas}
            onChange={(e) => setEdadCargas(e.target.value)}
            placeholder="Ej. 5, 8"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>"""
    content = content.replace("      <div>\n        <label className=\"mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide\">Notas", form_fields + "\n        <label className=\"mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide\">Notas")

    with open('src/components/leads/LeadForm.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

update_leads_page()
update_lead_form()
print("Lead form and page updated successfully")
