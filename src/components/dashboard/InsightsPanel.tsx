import React from 'react';
import { Icon } from '../../utils/icons';

export default function InsightsPanel() {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Mejor mes */}
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full bg-[#F2EEFF] text-[#635BFF] flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#161A24]">Mejor mes: Julio</span>
          <span className="text-[10px] text-[#5B6475] leading-tight">
            Se alcanzó el mayor volumen con 598 leads, <strong className="text-[#16B364] font-medium">+42%</strong> más que en junio.
          </span>
        </div>
      </div>

      {/* Mejor fuente de conversión */}
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full bg-[#E6F9F0] text-[#16B364] flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#161A24]">Mejor fuente de conversión: WhatsApp</span>
          <span className="text-[10px] text-[#5B6475] leading-tight">
            Generó el 29.8% de los leads y presenta la mayor tasa de conversión (<strong className="text-[#16B364] font-medium">8.3%</strong>).
          </span>
        </div>
      </div>

      {/* Recomendación */}
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full bg-[#FFF9F0] text-[#F6A400] flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="m4.93 19.07 1.41-1.41"></path>
            <path d="m17.66 6.34 1.41-1.41"></path>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#161A24]">Recomendación</span>
          <span className="text-[10px] text-[#5B6475] leading-tight">
            Incrementa inversión en WhatsApp y LinkedIn para sostener el crecimiento.
          </span>
        </div>
      </div>
    </div>
  );
}
