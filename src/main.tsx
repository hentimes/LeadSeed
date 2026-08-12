import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PresenceProvider } from './hooks/usePresence';
import AppErrorBoundary from './components/app/AppErrorBoundary';
import { setPlatform } from './platform/registry';
import { webPlatform } from './platform/web';

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
        <AuthProvider>
          <PresenceProvider>
            <App />
          </PresenceProvider>
        </AuthProvider>
      </AppErrorBoundary>
    );
  } catch (e) {
    console.error('LeadSeed: error al montar React', e);
    rootEl.innerHTML = `<div style="padding:20px;color:red;">Error al iniciar: ${e instanceof Error ? e.message : String(e)}</div>`;
  }
}



