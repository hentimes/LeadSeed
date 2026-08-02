/**
 * Abre un flujo de OAuth en una pestaña normal, en vez del popup flotante
 * de chrome.identity.launchWebAuthFlow.
 *
 * launchWebAuthFlow no expone forma de elegir como se presenta la ventana:
 * Chrome siempre la abre flotante, con su propia barra de titulo, a
 * proposito -es la ventana la que le confirma al usuario que esta en
 * accounts.google.com y no dentro de la extension-. Para que abra como
 * pestaña hay que armar el flujo a mano: crear la pestaña con la URL de
 * OAuth y esperar a que la navegacion llegue al redirect final.
 *
 * El redirectUrl (chrome.identity.getRedirectURL(), algo como
 * https://<id>.chromiumapp.org/) no resuelve a un sitio real: es un
 * dominio reservado que solo intercepta launchWebAuthFlow. Al navegar ahi
 * manualmente la pestaña mostraria un error de conexion, asi que hay que
 * capturar la URL en el evento de navegacion (chrome.tabs.onUpdated),
 * antes de que ese error termine de renderizarse, y cerrar la pestaña.
 */
export function launchOAuthInTab(oauthUrl: string, redirectUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let createdTabId: number | undefined;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };

    const finish = (run: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      run();
    };

    const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (tabId !== createdTabId || !changeInfo.url) return;
      if (!changeInfo.url.startsWith(redirectUrl)) return;

      const callbackUrl = changeInfo.url;
      finish(() => {
        resolve(callbackUrl);
        void chrome.tabs.remove(tabId).catch(() => undefined);
      });
    };

    const onRemoved = (tabId: number) => {
      if (tabId !== createdTabId) return;
      finish(() => reject(new Error('Se cerró la pestaña antes de completar el inicio de sesión.')));
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);

    chrome.tabs.create({ url: oauthUrl, active: true }, (tab) => {
      if (chrome.runtime.lastError || !tab?.id) {
        finish(() => reject(new Error(chrome.runtime.lastError?.message || 'No se pudo abrir la pestaña de inicio de sesión.')));
        return;
      }
      createdTabId = tab.id;
    });
  });
}
