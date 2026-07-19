import React from 'react';
import { beginGoogleLogin, completeGoogleExtensionLogin } from '../services/authService';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      const isExtension = window.location.protocol === 'chrome-extension:';
      const redirectUrl =
        isExtension && chrome.identity
          ? chrome.identity.getRedirectURL()
          : `${window.location.origin}${window.location.pathname}`;

      const oauthUrl = await beginGoogleLogin(redirectUrl, isExtension);

      if (isExtension && oauthUrl && chrome.identity) {
        chrome.identity.launchWebAuthFlow(
          { url: oauthUrl, interactive: true },
          async (callbackUrl) => {
            if (chrome.runtime.lastError || !callbackUrl) {
              alert(`Error nativo de Chrome: ${chrome.runtime.lastError?.message}`);
              return;
            }

            try {
              await completeGoogleExtensionLogin(callbackUrl);
              window.location.reload();
            } catch (callbackError) {
              const message =
                callbackError instanceof Error ? callbackError.message : 'No se pudo completar el login.';
              alert(message);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error al iniciar sesion con Google:', error);
      alert('Hubo un error al iniciar sesion. Revisa la consola.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">LeadSeed CRM</h1>
          <p className="text-slate-500 dark:text-slate-400">Inicia sesion para gestionar tus leads</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 dark:border-slate-600/50 rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-medium">Continuar con Google</span>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Al iniciar sesion aceptas nuestros terminos de servicio y politicas de privacidad.
        </p>
      </div>
    </div>
  );
}
