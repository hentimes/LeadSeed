import React from 'react';
import { supabase } from '../lib/supabaseClient';
import { Icon } from '../utils/icons';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      const isExtension = window.location.protocol === 'chrome-extension:';
      const redirectUrl = isExtension && chrome.identity ? chrome.identity.getRedirectURL() : window.location.origin + window.location.pathname;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/calendar',
          skipBrowserRedirect: isExtension
        }
      });
      if (error) throw error;
      
      // En Chrome Extensions, usamos el flujo nativo de autenticación sin abrir pestañas completas
      if (isExtension && data?.url && chrome.identity) {
        chrome.identity.launchWebAuthFlow(
          { url: data.url as string, interactive: true },
          async (callbackUrl) => {
            if (chrome.runtime.lastError || !callbackUrl) {
              alert('Error nativo de Chrome: ' + chrome.runtime.lastError?.message);
              return;
            }
            
            // alert('Callback de Chrome recibido. Procesando...');
            
            // Supabase devuelve los tokens en el hash de la URL
            const url = new URL(callbackUrl);
            const hash = url.hash;
            
            if (hash) {
              const params = new URLSearchParams(hash.substring(1));
              const access_token = params.get('access_token');
              const refresh_token = params.get('refresh_token');
              
              if (access_token && refresh_token) {
                const { error } = await supabase.auth.setSession({ 
                  access_token: access_token as string, 
                  refresh_token: refresh_token as string 
                });
                if (error) {
                  alert('Error al guardar sesión en Supabase: ' + error.message);
                } else {
                  // alert('¡Sesión guardada con éxito!');
                  window.location.reload();
                }
              } else {
                // Podría ser un error de OAuth (error=server_error&error_description=...)
                const errDesc = params.get('error_description');
                if (errDesc) {
                   alert('Error OAuth devuelto por Google: ' + errDesc);
                } else {
                   alert('Faltan tokens en el hash de la respuesta.');
                }
              }
            } else {
               alert('Falta el hash en la URL de respuesta.');
            }
          }
        );
      }
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      alert('Hubo un error al iniciar sesión. Revisa la consola.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">LeadSeed CRM</h1>
          <p className="text-gray-600">Inicia sesión para gestionar tus leads</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-medium">Continuar con Google</span>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Al iniciar sesión aceptas nuestros términos de servicio y políticas de privacidad.
        </p>
      </div>
    </div>
  );
}
