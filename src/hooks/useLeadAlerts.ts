import { useEffect, useState } from 'react';
import type { LeadAlertEvent } from '../types';

const TOAST_DURATION_MS = 8000;

/**
 * Escucha las alertas que emite el service worker y marca todo como visto
 * al montar: si el usuario tiene la extension abierta, el badge no tiene
 * razon de existir.
 */
export function useLeadAlerts(onLeadsChanged?: () => void) {
  const [alerts, setAlerts] = useState<LeadAlertEvent[]>([]);

  useEffect(() => {
    if (!chrome?.runtime?.id) return;

    chrome.runtime.sendMessage({ type: 'LEAD_ALERTS_MARK_SEEN' }).catch(() => {
      // El service worker puede estar dormido; el badge se corrige al despertar.
    });

    const listener = (message: { type?: string; events?: LeadAlertEvent[] }) => {
      if (message?.type !== 'LEAD_ALERTS_INCOMING' || !message.events?.length) return;

      setAlerts((current) => [...message.events!, ...current].slice(0, 5));
      onLeadsChanged?.();

      // Con la extension abierta el usuario ya esta viendo la alerta.
      chrome.runtime.sendMessage({ type: 'LEAD_ALERTS_MARK_SEEN' }).catch(() => {});
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [onLeadsChanged]);

  useEffect(() => {
    if (alerts.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      setAlerts((current) => current.slice(0, -1));
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [alerts]);

  const dismissAlert = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  return { alerts, dismissAlert };
}
