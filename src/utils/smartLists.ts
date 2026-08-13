import type { Lead } from '../types';
import { STATE } from '../design/colors';

export const SMART_LIST_DEFS = [
  { id: 'smart_nuevos', name: 'Nuevos', color: '#10b981', category: 'Sistema' },
  { id: 'smart_sin_gestion', name: 'Sin Gestión', color: STATE.warning, category: 'Sistema' },
  { id: 'smart_eliminados', name: 'Eliminados', color: STATE.danger, category: 'Sistema' },
  
  // Sistema de Salud
  { id: 'smart_isapre', name: 'Isapre (Todas)', color: '#3b82f6', category: 'Sistema de Salud' },
  { id: 'smart_fonasa', name: 'Fonasa', color: '#6366f1', category: 'Sistema de Salud' },
  
  // Isapres Específicas
  { id: 'smart_isapre_banmedica', name: 'Banmédica', color: '#0ea5e9', category: 'Isapres' },
  { id: 'smart_isapre_colmena', name: 'Colmena', color: '#0ea5e9', category: 'Isapres' },
  { id: 'smart_isapre_consalud', name: 'Consalud', color: '#0ea5e9', category: 'Isapres' },
  { id: 'smart_isapre_cruzblanca', name: 'Cruz Blanca', color: '#0ea5e9', category: 'Isapres' },
  { id: 'smart_isapre_esencial', name: 'Esencial', color: '#0ea5e9', category: 'Isapres' },
  { id: 'smart_isapre_nuevamasvida', name: 'Nueva Masvida', color: '#0ea5e9', category: 'Isapres' },
  { id: 'smart_isapre_vidatres', name: 'Vida Tres', color: '#0ea5e9', category: 'Isapres' },
  
  // Rangos de Edad
  { id: 'smart_edad_sub30', name: 'Menores de 30', color: '#8b5cf6', category: 'Edad' },
  { id: 'smart_edad_30_39', name: '30 a 39 años', color: '#8b5cf6', category: 'Edad' },
  { id: 'smart_edad_40_49', name: '40 a 49 años', color: '#8b5cf6', category: 'Edad' },
  { id: 'smart_edad_50_59', name: '50 a 59 años', color: '#8b5cf6', category: 'Edad' },
  { id: 'smart_edad_60plus', name: '60 años o más', color: '#8b5cf6', category: 'Edad' },
];

export function getSmartListLeads(smartListId: string, activeLeads: Lead[], deletedLeads: Lead[]): Lead[] {
  switch (smartListId) {
    case 'smart_nuevos':
      return activeLeads.filter(l => l.status === 'nuevo');
      
    case 'smart_sin_gestion': {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      return activeLeads.filter(l => 
        (l.status === 'nuevo' || l.status === 'contactado') && 
        new Date(l.updatedAt) < fiveDaysAgo
      );
    }
      
    case 'smart_eliminados':
      return deletedLeads;
      
    case 'smart_fonasa':
      return activeLeads.filter(l => getSistema(l) === 'Fonasa');
      
    case 'smart_isapre':
      return activeLeads.filter(l => getSistema(l) === 'Isapre');
      
    case 'smart_isapre_banmedica':
      return activeLeads.filter(l => getIsapre(l) === 'Banmédica');
    case 'smart_isapre_colmena':
      return activeLeads.filter(l => getIsapre(l) === 'Colmena');
    case 'smart_isapre_consalud':
      return activeLeads.filter(l => getIsapre(l) === 'Consalud');
    case 'smart_isapre_cruzblanca':
      return activeLeads.filter(l => getIsapre(l) === 'Cruz Blanca');
    case 'smart_isapre_esencial':
      return activeLeads.filter(l => getIsapre(l) === 'Esencial');
    case 'smart_isapre_nuevamasvida':
      return activeLeads.filter(l => getIsapre(l) === 'Nueva Masvida');
    case 'smart_isapre_vidatres':
      return activeLeads.filter(l => getIsapre(l) === 'Vida Tres');
      
    case 'smart_edad_sub30':
      return activeLeads.filter(l => { const age = getAge(l); return age !== null && age < 30; });
    case 'smart_edad_30_39':
      return activeLeads.filter(l => { const age = getAge(l); return age !== null && age >= 30 && age <= 39; });
    case 'smart_edad_40_49':
      return activeLeads.filter(l => { const age = getAge(l); return age !== null && age >= 40 && age <= 49; });
    case 'smart_edad_50_59':
      return activeLeads.filter(l => { const age = getAge(l); return age !== null && age >= 50 && age <= 59; });
    case 'smart_edad_60plus':
      return activeLeads.filter(l => { const age = getAge(l); return age !== null && age >= 60; });
      
    default:
      return [];
  }
}

function getSistema(l: Lead): string {
  const p = l.metadata?.raw_payload;
  if (p?.sistema_actual) return String(p.sistema_actual).trim();
  return '';
}

function getIsapre(l: Lead): string {
  const p = l.metadata?.raw_payload;
  if (p?.isapre_especifica) return String(p.isapre_especifica).trim();
  return '';
}

function getAge(l: Lead): number | null {
  const p = l.metadata?.raw_payload;
  if (!p) return null;
  
  // Si viene como rango exacto ej. "30-39"
  if (p.rango_edad && typeof p.rango_edad === 'string') {
    const r = p.rango_edad.trim();
    if (r.includes('30') && r.includes('39')) return 35;
    if (r.includes('40') && r.includes('49')) return 45;
    if (r.includes('50') && r.includes('59')) return 55;
    if (r.includes('60')) return 65;
    if (r.includes('30')) return 25; // "Menor a 30" o algo parecido
    
    // Si viene como numero
    const asNum = parseInt(r, 10);
    if (!isNaN(asNum)) return asNum;
  }
  return null;
}
