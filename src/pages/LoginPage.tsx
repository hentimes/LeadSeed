import React from 'react';
import { supabase } from '../lib/supabaseClient';
import { Icon } from '../utils/icons';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/calendar'
        }
      });
      if (error) throw error;
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
