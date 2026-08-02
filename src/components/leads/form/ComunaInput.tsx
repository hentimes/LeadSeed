import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CHILE_REGIONS } from '../../../utils/chileData';
import { normalizeText, getLevenshteinDistance } from '../../../utils/stringHelper';

interface Props {
  comuna: string;
  region: string;
  onComunaChange: (c: string) => void;
  onRegionChange: (r: string) => void;
}

export function ComunaInput({ comuna, region, onComunaChange, onRegionChange }: Props) {
  const [inputValue, setInputValue] = useState(comuna);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const comunasMap = useMemo(() => {
    const map: Record<string, string> = {};
    CHILE_REGIONS.forEach((r) => {
      r.comunas.forEach((c) => {
        map[c] = r.name;
      });
    });
    return map;
  }, []);

  const allComunas = useMemo(() => Object.keys(comunasMap).sort(), [comunasMap]);

  useEffect(() => {
    setInputValue(comuna);
  }, [comuna]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!val) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const term = normalizeText(val);
    const filtered = allComunas
      .filter((c) => normalizeText(c).includes(term))
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSelect = (name: string) => {
    setInputValue(name);
    onComunaChange(name);
    const mappedRegion = comunasMap[name];
    if (mappedRegion) {
      onRegionChange(mappedRegion);
    }
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Delay slightly to allow click on suggestion to fire first
    setTimeout(() => {
      if (!inputValue.trim()) return;
      const normalizedInput = normalizeText(inputValue.trim());
      let bestMatch: string | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < allComunas.length; i++) {
        const distance = getLevenshteinDistance(normalizedInput, normalizeText(allComunas[i]));
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = allComunas[i];
        }
        if (distance === 0) break;
      }

      if (bestMatch && minDistance <= 2) { // Tolerance of 2 edits
        handleSelect(bestMatch);
      }
    }, 150);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="relative" ref={wrapperRef}>
        <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Comuna</label>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder="Escribe la comuna..."
          className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-800 font-medium bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
          autoComplete="off"
        />
        {showSuggestions && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-[6px] shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <li
                key={s}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="px-3 py-1.5 text-[12px] text-slate-700 cursor-pointer hover:bg-slate-50 font-medium"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Región</label>
        <div className="w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-[13px] text-slate-500 font-medium bg-slate-100 outline-none select-none cursor-not-allowed">
          {region || 'Se autocompleta'}
        </div>
      </div>
    </div>
  );
}
