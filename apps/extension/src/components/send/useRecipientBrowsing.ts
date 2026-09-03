import { useState } from 'react';

const CLAVE_SIN_NOMBRE = 'ls.destinatarios.ocultarSinNombre';

/**
 * El filtro de leads sin nombre se recuerda entre sesiones.
 *
 * Nacia apagado en cada apertura de la hoja, asi que quien tiene cientos de
 * leads sin nombre volvia a marcarlo una y otra vez. Es una preferencia de
 * quien mira, no del envio.
 *
 * Va por `localStorage` y no por `appSettings` por lo mismo que el ancho del
 * rail: `appSettings` es asincrono, y la hoja se abre de golpe con un toque.
 * Leerlo dentro del inicializador de `useState` deja el primer fotograma ya
 * correcto, sin que el filtro parpadee de apagado a encendido.
 */
function leerOcultarSinNombre(): boolean {
  try {
    return localStorage.getItem(CLAVE_SIN_NOMBRE) === '1';
  } catch {
    return false;
  }
}

function guardarOcultarSinNombre(valor: boolean): void {
  try {
    localStorage.setItem(CLAVE_SIN_NOMBRE, valor ? '1' : '0');
  } catch {
    // Sin almacenamiento el filtro sigue funcionando, solo que no se recuerda.
  }
}

export interface RecipientBrowsing {
  search: string;
  setSearch: (valor: string) => void;
  pagina: number;
  setPagina: (pagina: number) => void;
  ocultarSinNombre: boolean;
  setOcultarSinNombre: (valor: boolean) => void;
}

/**
 * Estado de consulta de la hoja de destinatarios: que se busca, en que pagina
 * se va y si se ocultan los leads sin nombre.
 *
 * Vive en el compositor y no en la hoja porque la hoja se desmonta al
 * cerrarse. Enviar de a uno es abrirla y cerrarla en cada vuelta, y cada
 * cierre devolvia el paginador a la pagina 1.
 *
 * @param plantillaId  Al cambiar de plantilla empieza otra tanda y la pagina
 *                     vuelve a la primera. Cambiar de contacto dentro de la
 *                     misma plantilla no la toca.
 */
export function useRecipientBrowsing(plantillaId: string | number | null): RecipientBrowsing {
  const [search, setSearch] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ocultarSinNombre, setOcultarSinNombreState] = useState(leerOcultarSinNombre);

  // Se ajusta durante el render y no en un efecto: en un efecto se pintaria
  // primero la pagina vieja con la plantilla nueva y despues la correccion,
  // que es un parpadeo visible. Es el patron que documenta React para estado
  // derivado de props.
  const clave = String(plantillaId ?? '');
  const [claveAnterior, setClaveAnterior] = useState(clave);
  if (claveAnterior !== clave) {
    setClaveAnterior(clave);
    setPagina(1);
  }

  const setOcultarSinNombre = (valor: boolean) => {
    setOcultarSinNombreState(valor);
    guardarOcultarSinNombre(valor);
  };

  return {
    search,
    setSearch,
    pagina,
    setPagina,
    ocultarSinNombre,
    setOcultarSinNombre,
  };
}
