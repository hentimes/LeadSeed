import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trackPageTime } from '../services/telemetryService';
import { Page } from '../types';

export const useTelemetry = (currentPage: Page) => {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const prevPageRef = useRef<Page>(currentPage);

  useEffect(() => {
    if (!user) return;

    if (prevPageRef.current !== currentPage) {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (timeSpent > 0) {
        /*
         * El id ya no viaja: la base lo toma de la sesion. `user` se sigue
         * mirando arriba para no llamar sin sesion, que es cuando la funcion
         * de la base sale en silencio sin escribir nada.
         */
        trackPageTime(prevPageRef.current, timeSpent).catch((error) => {
          console.error('Error telemetry:', error);
        });
      }

      startTimeRef.current = Date.now();
      prevPageRef.current = currentPage;
    }
  }, [currentPage, user]);
};
