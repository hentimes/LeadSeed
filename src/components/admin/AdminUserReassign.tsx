import React, { useState } from 'react';
import { Icon } from '../../utils/icons';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../types';

interface Props {
  selectedUser: Profile;
  profiles: Profile[];
}

export default function AdminUserReassign({ selectedUser, profiles }: Props) {
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [transferLeads, setTransferLeads] = useState(true);
  const [transferTemplates, setTransferTemplates] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtrar al usuario actual para no reasignarse a sí mismo
  const availableUsers = profiles.filter(p => p.id !== selectedUser.id);

  const handleTransfer = async () => {
    if (!targetUserId) {
      alert('Por favor selecciona un asesor de destino.');
      return;
    }
    
    if (!transferLeads && !transferTemplates) {
      alert('Selecciona al menos un tipo de dato para transferir.');
      return;
    }

    if (!confirm(`¿Estás 100% seguro de transferir los datos seleccionados de ${selectedUser.full_name || selectedUser.email}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    let successMessage = 'Transferencia completada:\n';

    try {
      if (transferLeads) {
        const { error, count } = await supabase
          .from('leads')
          .update({ user_id: targetUserId })
          .eq('user_id', selectedUser.id);
          
        if (error) throw error;
        successMessage += `- Leads reasignados exitosamente.\n`;
      }

      if (transferTemplates) {
        const { error, count } = await supabase
          .from('templates')
          .update({ user_id: targetUserId })
          .eq('user_id', selectedUser.id);
          
        if (error) throw error;
        successMessage += `- Plantillas reasignadas exitosamente.\n`;
      }

      alert(successMessage);
      setTargetUserId('');
    } catch (err: any) {
      console.error(err);
      alert('Hubo un error en la transferencia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-red-50 flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-full text-red-600">
            <div className="w-6 h-6 flex justify-center items-center text-xl">{Icon.Send()}</div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Reasignación Masiva (Bóveda Nube)</h3>
            <p className="text-sm text-gray-600 mt-1">
              Transfiere todos los Leads y/o Plantillas de <strong>{selectedUser.full_name || selectedUser.email}</strong> hacia otro asesor del equipo. Ideal para rotación de personal o desvinculaciones.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Destino */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Asesor Destino (Quien recibe los datos)</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              disabled={loading}
            >
              <option value="">Selecciona un asesor...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Qué transferir */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">¿Qué deseas transferir?</label>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={transferLeads}
                  onChange={(e) => setTransferLeads(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  disabled={loading}
                />
                <div>
                  <span className="block text-sm font-bold text-gray-900">Todos los Leads</span>
                  <span className="block text-xs text-gray-500">Mueve los contactos y su historial a la bóveda del nuevo asesor.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={transferTemplates}
                  onChange={(e) => setTransferTemplates(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  disabled={loading}
                />
                <div>
                  <span className="block text-sm font-bold text-gray-900">Todas las Plantillas</span>
                  <span className="block text-xs text-gray-500">Transfiere la propiedad de sus plantillas de WhatsApp, Email y Llamadas.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Acción */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleTransfer}
              disabled={loading || !targetUserId || (!transferLeads && !transferTemplates)}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Transfiriendo datos...' : 'Ejecutar Transferencia Masiva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
