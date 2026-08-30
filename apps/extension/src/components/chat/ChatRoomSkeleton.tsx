import { Skeleton } from '../../design';

/**
 * Lo que se ve mientras carga la sala.
 *
 * Antes era la frase "Cargando sala..." centrada en un panel vacio. La
 * diferencia no es cosmetica: el esqueleto ya reserva el sitio de la barra, de
 * los mensajes y del campo de escritura, asi que cuando llegan los datos nada
 * salta de posicion.
 *
 * El aviso para el lector de pantalla se pone UNA vez aca arriba. Las cajas
 * llevan `aria-hidden` desde la primitiva, para no anunciar quince rectangulos.
 */
export default function ChatRoomSkeleton() {
  // Anchos irregulares a proposito: cinco burbujas del mismo largo se leen como
  // una tabla cargando, no como una conversacion.
  const burbujas = [
    { propio: false, ancho: '68%' },
    { propio: true, ancho: '52%' },
    { propio: false, ancho: '80%' },
    { propio: false, ancho: '44%' },
    { propio: true, ancho: '72%' },
  ];

  return (
    <div role="status" aria-label="Abriendo la sala" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <Skeleton shape="circle" width="28px" height="28px" />
        <div className="flex flex-col gap-1">
          <Skeleton width="96px" height="11px" />
          <Skeleton width="64px" height="9px" />
        </div>
        <div className="ml-auto flex gap-1.5">
          <Skeleton shape="circle" width="32px" height="32px" />
          <Skeleton shape="circle" width="32px" height="32px" />
        </div>
      </div>

      <div className="flex-1 space-y-3 px-3 py-3">
        {burbujas.map((burbuja, indice) => (
          <div
            key={indice}
            className={`flex items-start gap-2 ${burbuja.propio ? 'flex-row-reverse' : ''}`}
          >
            {!burbuja.propio && <Skeleton shape="circle" width="32px" height="32px" />}
            <Skeleton shape="block" width={burbuja.ancho} height="38px" />
          </div>
        ))}
      </div>

      <div className="border-t border-line p-3">
        <Skeleton shape="block" height="40px" className="rounded-xl" />
      </div>
    </div>
  );
}
