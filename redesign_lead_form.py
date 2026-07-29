import re

def fix_leads_page():
    with open('src/pages/LeadsPage.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    target = """      {showForm && (
        <div className="mb-4 p-4 border border-[#E6EAF0] rounded-[8px] bg-white shadow-sm">
          <h3 className="text-base font-semibold mb-3">{editing ? 'Editar Lead' : 'Nuevo Lead'}</h3>
          <LeadForm lead={editing} lists={lists} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </div>
      )}"""
      
    replacement = """      {showForm && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-[500px] flex flex-col relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-[15px] font-extrabold text-slate-800 tracking-tight">{editing ? 'Editar Lead' : 'Nuevo Lead'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-100px)]">
              <LeadForm lead={editing} lists={lists} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
            </div>
          </div>
        </div>
      )}"""
    
    content = content.replace(target, replacement)
    
    with open('src/pages/LeadsPage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)


def fix_lead_form():
    with open('src/components/leads/LeadForm.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    new_form = """  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          placeholder="Ej. Juan Pérez"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56912345678"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Ej. Acme Corp"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">RUT</label>
          <input
            type="text"
            value={rut}
            onChange={(e) => handleRutChange(e.target.value)}
            onBlur={handleRutBlur}
            placeholder="12.345.678-9"
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all cursor-pointer"
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
        <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Escribe algún comentario o nota importante..."
          className="w-full rounded-[8px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all placeholder:text-slate-400 resize-none"
        />
      </div>

      {lists.length > 0 && (
        <div>
          <label className="mb-1.5 block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Listas</label>
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <button
                key={list.id!}
                type="button"
                onClick={() => toggleList(list.id!!)}
                className={`rounded-[6px] border px-3 py-1.5 text-[12px] font-semibold transition-all ${
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

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-[8px]"><p className="text-[12px] font-semibold text-red-600">{error}</p></div>}

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 rounded-[8px] bg-slate-100 px-4 py-3 text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors">
          Cancelar
        </button>
        <button type="submit" className="flex-1 rounded-[8px] bg-[#6C4CF6] px-4 py-3 text-[13px] font-bold text-white hover:bg-[#5b3ce0] transition-colors shadow-sm">
          {lead?.id ? 'Guardar Cambios' : 'Crear Lead'}
        </button>
      </div>
    </form>
  );
}"""

    idx = content.find('  return (\n    <form')
    content = content[:idx] + new_form
    
    with open('src/components/leads/LeadForm.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

fix_leads_page()
fix_lead_form()
print("Lead form redesigned")
