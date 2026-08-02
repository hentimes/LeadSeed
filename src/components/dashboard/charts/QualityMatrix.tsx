import React from 'react';
import { chartColors } from '../../../design/palette';

const LinkedinIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
const GlobeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const WhatsAppIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
const EnvelopeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M2 4l10 8 10-8"></path></svg>;
const PhoneIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const DatabaseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;

export default function QualityMatrix() {
  const sources = [
    { id: 'linkedin', name: 'LinkedIn', leads: 126, winRate: 15.2, cycle: 12, icon: <LinkedinIcon />, color: chartColors.primaryLight },
    { id: 'whatsapp', name: 'WhatsApp', leads: 178, winRate: 12.0, cycle: 5, icon: <WhatsAppIcon />, color: chartColors.primaryLight },
    { id: 'email', name: 'Email', leads: 142, winRate: 10.3, cycle: 7, icon: <EnvelopeIcon />, color: chartColors.primaryLight },
    { id: 'llamado', name: 'Llamado', leads: 96, winRate: 8.1, cycle: 9, icon: <PhoneIcon />, color: chartColors.primaryLight },
    { id: 'database', name: 'Base de datos', leads: 88, winRate: 6.4, cycle: 11, icon: <DatabaseIcon />, color: chartColors.primaryLight },
  ];

  return (
    <div className="w-full pt-1">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] text-ink-secondary border-b border-line">
            <th className="font-medium pb-2 w-[40%]">Fuente</th>
            <th className="font-medium pb-2 text-right">Volumen</th>
            <th className="font-medium pb-2 text-right">Win Rate</th>
            <th className="font-medium pb-2 text-right">Ciclo (días)</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source, idx) => (
            <tr key={source.id} className="border-b border-line last:border-0 hover:bg-surface-muted transition-colors">
              <td className="py-2.5 flex items-center gap-2">
                <div className="w-4 h-4 flex items-center justify-center" style={{ color: source.color }}>
                  {source.icon}
                </div>
                <span className="text-[12px] font-semibold text-ink">{source.name}</span>
              </td>
              <td className="py-2.5 text-right text-[12px] text-ink-secondary">{source.leads}</td>
              <td className="py-2.5 text-right">
                <span className="text-[12px] font-bold text-[#16C26E] bg-[#E6F9F0] px-1.5 py-0.5 rounded-[4px]">
                  {source.winRate}%
                </span>
              </td>
              <td className="py-2.5 text-right text-[12px] text-ink font-medium">{source.cycle}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
