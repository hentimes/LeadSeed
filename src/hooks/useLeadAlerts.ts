import { useEffect, useState } from 'react';
import type { LeadAlertEvent } from '../types';
import { getPlatform } from '../platform/registry';

const TOAST_DURATION_MS = 8000;

/**
 * Escucha las alertas que emite el service worker y marca todo como visto
 * al montar: si el usuario tiene la extension abierta, el badge no tiene
 * razon de existir.
 */
export function useLeadAlerts(onLeadsChanged?: () => void) {
  const [alerts, setAlerts] = useState<LeadAlertEvent[]>([]);

  useEffect(() => {
    if (!getPlatform().messageBus.isAvailable()) return;

    // El puerto absorbe el caso del service worker dormido, que en MV3 es un
    // estado normal: el badge se corrige cuando despierta.
    void getPlatform().messageBus.send({ type: 'LEAD_ALERTS_MARK_SEEN' });

    return getPlatform().messageBus.subscribe((message) => {
      if (message.type !== 'LEAD_ALERTS_INCOMING') return;

      const events = message.events as LeadAlertEvent[] | undefined;
      if (!events?.length) return;

      setAlerts((current) => [...events, ...current].slice(0, 5));
      onLeadsChanged?.();

      // Con la extension abierta el usuario ya esta viendo la alerta.
      void getPlatform().messageBus.send({ type: 'LEAD_ALERTS_MARK_SEEN' });
    });
  }, [onLeadsChanged]);

  useEffect(() => {
    if (alerts.length === 0) return;

    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    const timeoutId = window.setTimeout(() => {
      setAlerts((current) => current.slice(0, -1));
    }, TOAST_DURATION_MS);

    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    return () => window.clearTimeout(timeoutId);
  }, [alerts]);

  const dismissAlert = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  return { alerts, dismissAlert };
}
