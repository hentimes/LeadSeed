import React from 'react';
import { beginGoogleLogin, completeGoogleExtensionLogin } from '../services/authService';
import { chartColors } from '../design/palette';
import { getPlatform } from '../platform/registry';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      const oauthUrl = await beginGoogleLogin(getPlatform().oauth.redirectUrl(), getPlatform().oauth.canCompleteInApp());
      if (!oauthUrl) return;

      try {
        const callbackUrl = await getPlatform().oauth.launch(oauthUrl);

        // Sin callback la plataforma navego fuera: el proveedor traera de
        // vuelta al usuario y no hay nada mas que hacer en este ciclo.
        if (!callbackUrl) return;

        await completeGoogleExtensionLogin(callbackUrl);
        window.location.reload();
      } catch (callbackError) {
        const message =
          callbackError instanceof Error ? callbackError.message : 'No se pudo completar el login.';
        alert(message);
      }
    } catch (error) {
      console.error('Error al iniciar sesion con Google:', error);
      alert('Hubo un error al iniciar sesion. Revisa la consola.');
    }
  };

  return (
    <div className="relative min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* Background Decoratives */}
      
      {/* Top Left Blob */}
      <div className="absolute top-0 left-0 w-64 h-64 -translate-x-10 -translate-y-10 opacity-60 pointer-events-none">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill={chartColors.soft} d="M 0,0 L 200,0 C 150,80 80,150 0,200 Z" />
        </svg>
      </div>

      {/* Bottom Right Waves */}
      <div className="absolute bottom-0 right-0 w-80 h-64 opacity-80 pointer-events-none">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
          <path fill="#F8F6FF" d="M 0,200 C 50,150 150,180 200,80 L 200,200 Z" />
          <path fill={chartColors.soft} d="M 40,200 C 100,160 170,190 200,120 L 200,200 Z" />
          <path fill={chartColors.soft} d="M 80,200 C 140,170 180,200 200,150 L 200,200 Z" />
        </svg>
      </div>

      {/* Sparkles / Stars */}
      <svg viewBox="0 0 24 24" className="absolute top-[20%] left-[15%] w-3 h-3 text-primary-soft-strong pointer-events-none" fill="currentColor">
        <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute top-[15%] right-[20%] w-4 h-4 text-primary-soft pointer-events-none" fill="currentColor">
        <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute bottom-[40%] right-[10%] w-3 h-3 text-primary-soft-strong pointer-events-none" fill="currentColor">
        <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute bottom-[20%] left-[10%] w-4 h-4 text-primary-soft pointer-events-none" fill="currentColor">
        <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute top-[30%] left-[8%] w-2 h-2 text-primary-soft-strong pointer-events-none" fill="currentColor">
        <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
      </svg>

      <div className="relative z-10 flex flex-col flex-1 px-8 py-10 pt-20">
        
        {/* Contenido Central */}
        <div className="flex-1 flex flex-col items-center max-w-xs mx-auto w-full pb-10">
          
          {/* Logo Illustration */}
          <div className="mb-6 relative flex justify-center items-center w-24 h-24">
            <img src="/icons/icon128.png" alt="Logo" className="w-20 h-20 drop-shadow-sm object-contain" />
            <div className="absolute -bottom-2 w-10 h-2 bg-primary/10 rounded-[100%] blur-sm"></div>
          </div>

          <h1 className="text-[28px] tracking-tight font-bold text-ink mb-2">
            Iniciar sesión
          </h1>
          <p className="text-[14px] text-center text-ink-secondary mb-10 max-w-[240px] leading-relaxed">
            Accede a tu cuenta para gestionar tus leads y campañas.
          </p>

          <div className="w-full space-y-4">
            {/* Botón Principal (Deshabilitado pero Morado con efecto 3D) */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-2.5 px-4 py-[12px] bg-gradient-to-b from-[#7e62f9] to-[#603FE2] text-white rounded-[12px] font-semibold text-[15px] cursor-not-allowed shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.15),0_4px_14px_0_rgba(108,76,246,0.35)]"
            >
              <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Iniciar sesión
            </button>

            {/* Separador */}
            <div className="flex items-center gap-3 w-full py-2">
              <div className="flex-1 h-px bg-line"></div>
              <span className="text-[13px] text-ink-secondary">o continúa con</span>
              <div className="flex-1 h-px bg-line"></div>
            </div>

            {/* Botón Google */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-[12px] border border-line rounded-[12px] text-[#344054] bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-soft transition-all shadow-[inset_0_1px_0_white,inset_0_-2px_0_rgba(230,232,240,0.5),0_2px_5px_rgba(0,0,0,0.02)] font-semibold text-[15px]"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-[20px] h-[20px]" />
              Continuar con Google
            </button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[13px] text-ink-secondary">
            ¿Aún no tienes cuenta? <a href="#" className="text-primary font-semibold hover:underline">Regístrate</a>
          </p>
        </div>
      </div>
    </div>
  );
}
