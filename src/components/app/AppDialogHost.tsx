import { useEffect, useState } from 'react';
import { Button, Modal } from '../../design';
import {
  registrarHostDeDialogos,
  type SolicitudDeDialogo,
} from '../../platform/dialogBridge';

/**
 * EL DIALOGO DE CONFIRMACION Y AVISO, DENTRO DE LA EXTENSION
 *
 * Se monta una vez en la raiz y atiende todas las peticiones del puerto
 * `dialogs`. Sustituye a `window.confirm` y `window.alert`, que Chrome dibujaba
 * centrados en la pestana -a media pantalla del panel- con el rotulo "La
 * extension LeadSeed dice".
 *
 * ## Una cola, no una sola solicitud
 *
 * `window.confirm` bloquea el hilo, asi que dos preguntas nunca podian coexistir:
 * la segunda no se ejecutaba hasta contestar la primera. El puerto asincrono no
 * bloquea nada, y ahi aparece un caso que antes era imposible: dos avisos
 * disparados por el mismo evento -un error de red que falla dos veces, una
 * accion en lote-.
 *
 * Guardarlos en una cola y mostrarlos de a uno preserva el comportamiento que
 * los llamadores ya asumian. Con una sola variable de estado, el segundo aviso
 * pisaria al primero y su promesa quedaria colgada para siempre, con el `await`
 * del llamador esperando una respuesta que nadie va a dar.
 *
 * ## Cerrar es cancelar, y para un aviso da igual
 *
 * Escape, el velo y la X resuelven `false`. Es lo mismo que hacia el dialogo del
 * navegador y es la respuesta segura: ante la duda, no borrar. Un `alert` no
 * tiene respuesta que dar, asi que cualquier salida lo cierra igual.
 *
 * ## El foco, Escape y el scroll ya estan resueltos
 *
 * Los pone `Modal`: portal a `document.body`, trampa de foco, cierre con Escape
 * y congelado del `<main>` de atras. Repetirlos aqui seria una segunda copia que
 * se desincroniza.
 */
export default function AppDialogHost() {
  const [cola, setCola] = useState<SolicitudDeDialogo[]>([]);

  useEffect(() => registrarHostDeDialogos((solicitud) => {
    setCola((pendientes) => [...pendientes, solicitud]);
  }), []);

  const actual = cola[0];
  if (!actual) return null;

  const responder = (aceptado: boolean) => {
    actual.responder(aceptado);
    // Se saca por id y no con `slice(1)`: si dos respuestas llegaran seguidas,
    // recortar por posicion sobre un estado ya movido descartaria la solicitud
    // equivocada.
    setCola((pendientes) => pendientes.filter((s) => s.id !== actual.id));
  };

  const esPregunta = actual.tipo === 'confirm';
  const peligroso = actual.tono === 'danger';

  return (
    <Modal
      onClose={() => responder(false)}
      maxWidth="320px"
      label={actual.titulo || (esPregunta ? 'Confirmación' : 'Aviso')}
    >
      <div className="flex flex-col gap-3 p-4">
        {/*
          El titulo es opcional. Sin el, el mensaje sube a tinta principal y hace
          de titulo: un encabezado generico como "Confirmar" repetiria en negrita
          lo que el boton ya dice, y roba la linea que de verdad informa.
        */}
        {actual.titulo && (
          <h2 className="text-body font-semibold text-ink">{actual.titulo}</h2>
        )}

        <p
          className={`whitespace-pre-wrap ${
            actual.titulo ? 'text-meta text-ink-secondary' : 'text-body text-ink'
          }`}
        >
          {actual.mensaje}
        </p>

        {/*
          Los botones a la derecha y el que confirma al final, que es donde el
          resto de los modales del producto los pone.

          "Cancelar" va primero y en `ghost`: el orden importa mas de lo que
          parece cuando la accion es destructiva. El boton que borra es el ultimo
          que se toca, no el que queda bajo el pulgar por inercia.
        */}
        <div className="flex items-center justify-end gap-2">
          {esPregunta && (
            <Button variant="ghost" size="sm" onClick={() => responder(false)}>
              {actual.rotuloCancelar || 'Cancelar'}
            </Button>
          )}
          <Button
            variant={peligroso ? 'danger' : 'primary'}
            size="sm"
            onClick={() => responder(true)}
          >
            {actual.rotuloConfirmar || (esPregunta ? 'Aceptar' : 'Entendido')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
