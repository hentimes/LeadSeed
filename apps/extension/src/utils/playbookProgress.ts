import type { PlaybookRunItem, PlaybookRunProgress } from '../types';

/**
 * El avance de un recorrido, contado por FASE.
 *
 * No es estado y no se guarda: se deriva de los items en cada render. Guardado
 * seria un segundo sitio donde vive la misma verdad, y el dia que uno de los
 * dos no se actualice la cabecera dira "8 de 17" con nueve items tachados.
 */
export function progresoDe(items: PlaybookRunItem[]): PlaybookRunProgress {
  let hechos = 0;
  let noAplica = 0;

  for (const item of items) {
    if (item.state === 'hecho') hechos += 1;
    else if (item.state === 'no_aplica') noAplica += 1;
  }

  return {
    hechos,
    noAplica,
    // "Resueltos" incluye los que no aplican: la pregunta ya se despacho,
    // aunque fuera para descartarla. Es lo que cuenta "8 de 17".
    resueltos: hechos + noAplica,
    pendientes: items.length - hechos - noAplica,
    total: items.length,
  };
}

export interface FaseDelRecorrido {
  position: number;
  title: string;
  items: PlaybookRunItem[];
  progreso: PlaybookRunProgress;
}

/**
 * Agrupa por fase respetando el orden guardado en la copia historica.
 *
 * Se agrupa por `sectionPosition` y no por `sectionTitle`: dos fases pueden
 * llamarse igual, y el titulo es texto que el usuario edita.
 */
export function agruparPorFase(items: PlaybookRunItem[]): FaseDelRecorrido[] {
  const porPosicion = new Map<number, PlaybookRunItem[]>();

  for (const item of items) {
    const grupo = porPosicion.get(item.sectionPosition);
    if (grupo) grupo.push(item);
    else porPosicion.set(item.sectionPosition, [item]);
  }

  return [...porPosicion.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([position, deLaFase]) => {
      const ordenados = [...deLaFase].sort((a, b) => a.position - b.position);
      return {
        position,
        title: ordenados[0]?.sectionTitle ?? '',
        items: ordenados,
        progreso: progresoDe(ordenados),
      };
    });
}

/*
 * Aqui vivia `siguientePendiente`, que servia al salto automatico al marcar un
 * punto. Se retiro con el: ahora se marca desde la propia fila, y mover el
 * panel por debajo de la mano seria un salto que nadie pidio.
 */
