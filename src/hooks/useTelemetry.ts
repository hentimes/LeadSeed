import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Page } from '../types';

export const useTelemetry = (currentPage: Page) => {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const prevPageRef = useRef<Page>(currentPage);

  useEffect(() => {
    if (!user) return;

    // Calcular y enviar tiempo al cambiar de sección
    if (prevPageRef.current !== currentPage) {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      if (timeSpent > 0) {
        // Enviar silenciosamente (RPC)
        supabase.rpc('increment_telemetry', { 
          p_user_id: user.id, 
          p_section: prevPageRef.current, 
          p_seconds: timeSpent 
        }).then(({ error }) => {
          if (error) console.error("Error telemetry:", error);
        });
      }

      // Reiniciar contadores para la nueva sección
      startTimeRef.current = Date.now();
      prevPageRef.current = currentPage;
    }
  }, [currentPage, user]);
};
