import { useState } from 'react';
import { useHideUnnamedLeads } from '../../hooks/useHideUnnamedLeads';

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
  /*
   * El filtro de leads sin nombre ya no se recuerda aqui: es el mismo ajuste
   * de cuenta que usan Leads, Pipeline y Flujos. Tenia un `localStorage`
   * propio, y por eso apagarlo en Leads lo dejaba encendido en esta hoja.
   *
   * El motivo de aquel `localStorage` -que la hoja se abre de golpe y el
   * ajuste del servidor es asincrono, asi que el interruptor parpadeaba- sigue
   * cubierto: `useHideUnnamedLeads` mantiene un cache sincrono para el primer
   * fotograma.
   */
  const [ocultarSinNombre, setOcultarSinNombre] = useHideUnnamedLeads();

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

  return {
    search,
    setSearch,
    pagina,
    setPagina,
    ocultarSinNombre,
    setOcultarSinNombre,
  };
}
