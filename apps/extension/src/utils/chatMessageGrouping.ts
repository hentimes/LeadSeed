import type { ChatMessage } from '../types';
import { formatearFechaLarga } from './date';

/**
 * AGRUPACION DE LA LISTA DE MENSAJES
 *
 * La sala pintaba un bloque identico por mensaje: avatar de 32px, fila de
 * nombre de 32px de alto y hora, aunque los diez mensajes anteriores fueran de
 * la misma persona y del mismo minuto. En un panel de 320px eso son ~80px de
 * nombre repetido por cada rafaga, y ademas rompe la lectura: cada mensaje
 * parece una intervencion nueva.
 *
 * Tampoco habia ninguna marca de dia. Un mensaje de las 09:14 puede ser de hoy
 * o de hace tres semanas y se veia igual.
 *
 * Esto vive fuera del JSX a proposito: es la unica parte del rediseno con
 * reglas que se pueden equivocar en silencio (limites de racha, cambio de dia,
 * anuncios que no deben absorberse), asi que se puede probar sin montar React.
 */

/** Corte de racha. Pasado este hueco, el mismo autor vuelve a presentarse. */
export const MINUTOS_DE_RACHA = 5;

export interface GrupoDeAutor {
  /** Estable entre renders: el id del primer mensaje del grupo. */
  id: string;
  userId: string;
  mensajes: ChatMessage[];
}

export interface GrupoDeDia {
  /** Clave de dia (`2026-08-25`), para React y para comparar. */
  id: string;
  /** `Hoy`, `Ayer` o `25 ago 2026`. */
  etiqueta: string;
  grupos: GrupoDeAutor[];
}

/** Dia calendario local, no UTC: lo que importa es el dia de quien lee. */
function claveDeDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sin-fecha';
  const mes = `${d.getMonth() + 1}`.padStart(2, '0');
  const dia = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * `ahora` se inyecta en vez de leer el reloj adentro para que la etiqueta
 * "Hoy" se pueda probar sin depender del dia en que corran los tests.
 */
export function etiquetaDeDia(iso: string, ahora: Date = new Date()): string {
  const clave = claveDeDia(iso);
  if (clave === 'sin-fecha') return '';

  const hoy = claveDeDia(ahora.toISOString());
  if (clave === hoy) return 'Hoy';

  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (clave === claveDeDia(ayer.toISOString())) return 'Ayer';

  return formatearFechaLarga(iso);
}

/**
 * Hay tres cosas que no se agrupan con nada:
 *
 * - el anuncio del staff, que se pinta a ancho completo con su propio marco
 * - el aviso del sistema, que es una linea suelta centrada
 * - el mensaje eliminado, que es un aviso y no una intervencion
 *
 * Meter cualquiera de los tres en una racha ajena haria que el mensaje
 * siguiente perdiera el avatar y pareciera escrito por quien anuncio.
 */
function rompeRacha(mensaje: ChatMessage): boolean {
  return !!mensaje.is_announcement || !!mensaje.is_system || !!mensaje.deleted_at;
}

function minutosEntre(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  return Math.abs(tb - ta) / 60000;
}

/**
 * Convierte la lista plana en dias, y dentro de cada dia en rachas del mismo
 * autor. Conserva el orden de entrada: no ordena ni filtra nada, para que lo
 * que se ve siga siendo exactamente lo que le llego a la sala.
 */
export function agruparMensajes(mensajes: ChatMessage[], ahora?: Date): GrupoDeDia[] {
  const dias: GrupoDeDia[] = [];

  for (const mensaje of mensajes) {
    const clave = claveDeDia(mensaje.created_at);
    let dia = dias[dias.length - 1];

    if (!dia || dia.id !== clave) {
      dia = { id: clave, etiqueta: etiquetaDeDia(mensaje.created_at, ahora), grupos: [] };
      dias.push(dia);
    }

    const grupo = dia.grupos[dia.grupos.length - 1];
    const anterior = grupo?.mensajes[grupo.mensajes.length - 1];

    const continua =
      !!grupo &&
      !!anterior &&
      grupo.userId === mensaje.user_id &&
      !rompeRacha(mensaje) &&
      !rompeRacha(anterior) &&
      minutosEntre(anterior.created_at, mensaje.created_at) <= MINUTOS_DE_RACHA;

    if (continua) {
      grupo.mensajes.push(mensaje);
    } else {
      dia.grupos.push({ id: mensaje.id, userId: mensaje.user_id, mensajes: [mensaje] });
    }
  }

  return dias;
}
