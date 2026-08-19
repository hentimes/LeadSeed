import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PresenceProvider } from './hooks/usePresence';
import AppErrorBoundary from './components/app/AppErrorBoundary';
import { setPlatform } from './platform/registry';
import { webPlatform } from './platform/web';
import { getErrorMessage } from './utils/errorMessage';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Antes de montar nada: la capa de dominio pide los puertos por registro, y
// este es el unico modulo de la app que menciona la implementacion concreta.
// El dia del port a Expo, su entry hara `setPlatform(nativePlatform)` y ningun
// archivo de dominio cambia.
setPlatform(webPlatform);

const rootEl = document.getElementById('root');

if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:red;">Error: No se encontró #root</div>';
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PresenceProvider>
              <App />
            </PresenceProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AppErrorBoundary>
    );
  } catch (e) {
    console.error('LeadSeed: error al montar React', e);
    // Se construye el nodo en vez de interpolar en innerHTML. Ahora que el
    // mensaje puede venir del backend y no de un Error nuestro, interpolarlo
    // seria meter texto ajeno en HTML. Se ve exactamente igual.
    const aviso = document.createElement('div');
    aviso.style.padding = '20px';
    aviso.style.color = 'red';
    aviso.textContent = `Error al iniciar: ${getErrorMessage(e, String(e))}`;
    rootEl.replaceChildren(aviso);
  }
}



