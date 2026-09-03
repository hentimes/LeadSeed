import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PresenceProvider } from './hooks/usePresence';
import AppErrorBoundary from './components/app/AppErrorBoundary';
import AppDialogHost from './components/app/AppDialogHost';
import { setPlatform } from './platform/registry';
import { webPlatform } from './platform/web';
import { getErrorMessage } from './utils/errorMessage';
import { debeBloquearSoltar } from './utils/fileDropGuard';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Antes de montar nada: la capa de dominio pide los puertos por registro, y
// este es el unico modulo de la app que menciona la implementacion concreta.
// El dia del port a Expo, su entry hara `setPlatform(nativePlatform)` y ningun
// archivo de dominio cambia.
setPlatform(webPlatform);

/**
 * Soltar archivos sobre un campo de texto pega sus **rutas**.
 *
 * Nadie lo pide y nadie lo nota hasta que ya esta guardado: la descripcion de la
 * sala `# General` acabo con `C:\Users\...\Downloads\iconos` repetido ocho
 * veces, que es justo lo que pasa al arrastrar ocho archivos de una carpeta.
 *
 * Se instala aqui y no en cada campo porque hay 17 `textarea` y 26 campos de
 * texto repartidos, y el que se olvide sera el que reciba el arrastre. Vive en
 * este entry, junto a `setPlatform`, porque es comportamiento del navegador sin
 * equivalente en React Native: el entry nativo simplemente no lo instala.
 *
 * Solo se escucha `drop`, y esto es facil de equivocar: `preventDefault` sobre
 * `dragover` **habilita** un elemento como destino en vez de bloquearlo. Lo que
 * cancela la insercion es cancelar el `drop`, y un campo de texto ya es destino
 * valido por defecto.
 *
 * La zona de importacion queda exenta por `data-zona-archivos`: es lo unico que
 * recibe archivos a proposito. Los arrastres internos -reordenar columnas, mover
 * un lead en el pipeline- usan `text/plain`, asi que ni se consultan.
 */
document.addEventListener(
  'drop',
  (evento) => {
    const destino = evento.target as HTMLElement | null;
    if (!destino) return;

    const bloquear = debeBloquearSoltar(
      Array.from(evento.dataTransfer?.types ?? []).includes('Files'),
      {
        etiqueta: destino.tagName,
        editable: destino.isContentEditable,
        dentroDeZonaDeArchivos: Boolean(destino.closest('[data-zona-archivos]')),
      }
    );

    if (bloquear) evento.preventDefault();
  },
  true
);

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

        {/*
          Fuera de los proveedores y hermano de `App`: los dialogos no necesitan
          sesion ni consultas, y montarlos aqui hace que tambien funcionen en el
          login y en la eleccion de plan, que es donde `alert()` avisaba de los
          errores. Dentro de `AppErrorBoundary` para que un fallo del arbol se
          siga viendo.
        */}
        <AppDialogHost />
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



