const OFFSCREEN_PATH = 'offscreen.html';

let creating: Promise<void> | null = null;

async function hasOffscreenDocument(): Promise<boolean> {
  // getContexts existe desde Chrome 116; si no esta, asumimos que no hay documento.
  if (!chrome.runtime.getContexts) return false;

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return;

  // Dos llamadas concurrentes a createDocument lanzan error; se serializan aqui.
  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: ['AUDIO_PLAYBACK' as chrome.offscreen.Reason],
      justification: 'Reproducir el sonido de alerta cuando entra un lead nuevo.',
    })
    .finally(() => {
      creating = null;
    });

  await creating;
}

/**
 * Reproduce el sonido de alerta desde el service worker.
 *
 * MV3 no permite audio directo en background, por eso se usa un documento
 * offscreen. Chrome puede descartarlo bajo presion de memoria, asi que el
 * fallo se traga: la notificacion nativa y el badge siguen funcionando.
 */
export async function playAlertSound(): Promise<void> {
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: 'PLAY_ALERT_SOUND' });
  } catch (error) {
    console.warn('[LeadAlerts] No se pudo reproducir el sonido:', error);
  }
}
