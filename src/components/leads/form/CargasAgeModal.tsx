import React, { useState, useEffect, useRef } from 'react';

interface Props {
  numeroCargas: string;
  edadCargas: string;
  onChange: (val: string) => void;
}

export function CargasAgeModal({ numeroCargas, edadCargas, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [ages, setAges] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  const count = parseInt(numeroCargas) || (numeroCargas === '4+' ? 4 : 0);

  useEffect(() => {
    if (count === 0) {
      setAges([]);
      return;
    }
    
    // Parse existing or create new array
    let current: string[] = [];
    try {
      if (edadCargas) {
        current = JSON.parse(edadCargas);
        if (!Array.isArray(current)) current = [edadCargas];
      }
    } catch {
      current = edadCargas ? [edadCargas] : [];
    }
    
    // Adjust array size
    const newAges = Array(count).fill('').map((_, i) => current[i] ? String(current[i]) : '');
    setAges(newAges);
    
    // Auto-open modal if there are empty ages to fill
    if (count > 0 && newAges.some(a => !a)) {
       setIsOpen(true);
    }
  }, [count, edadCargas]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
         handleSave();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, ages]);

  if (count === 0) return null;

  const handleAgeChange = (index: number, val: string) => {
    const next = [...ages];
    next[index] = val;
    setAges(next);
  };

  const handleSave = () => {
    // Save only if valid
    const cleanAges = ages.map(a => a.trim());
    onChange(JSON.stringify(cleanAges));
    setIsOpen(false);
  };

  const isComplete = ages.every(a => a.trim() !== '');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-semibold transition-all ${
           isComplete ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
           <circle cx="9" cy="7" r="4" />
           <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
           <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {isComplete ? 'Edades' : 'Configurar'}
      </button>

      {isOpen && (
        <div ref={modalRef} className="absolute z-20 top-full right-0 mt-1 w-56 bg-white rounded-[8px] shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Edades</h4>
            <button type="button" onClick={handleSave} className="text-slate-400 hover:text-slate-600 font-bold">
               &times;
            </button>
          </div>
          <div className="p-3 space-y-2">
            {ages.map((age, i) => (
              <div key={i} className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-slate-600 w-12">Carga {i + 1}</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={age}
                  onChange={(e) => handleAgeChange(i, e.target.value)}
                  placeholder="Ej: 5"
                  className="flex-1 rounded-[6px] border border-slate-200 px-2 py-1 text-[12px] font-medium focus:border-[#6C4CF6] focus:ring-1 focus:ring-[#6C4CF6] outline-none transition-all"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleSave}
              className="w-full mt-1 rounded-[6px] bg-[#6C4CF6] py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#5b3ce0]"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
