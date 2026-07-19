import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PresenceProvider } from './hooks/usePresence';
import AppErrorBoundary from './components/app/AppErrorBoundary';

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
    console.log('Leads CRM: React montado correctamente');
  } catch (e) {
    console.error('Leads CRM: Error al montar React', e);
    rootEl.innerHTML = `<div style="padding:20px;color:red;">Error al iniciar: ${e instanceof Error ? e.message : String(e)}</div>`;
  }
}
