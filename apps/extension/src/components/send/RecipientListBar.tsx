import { useMemo } from 'react';
import type { Lead, LeadList } from '../../types';
import { Button, Select } from '../../design';
import { Icon } from '../../utils/icons';
import { textoSobre } from '../../utils/contrasteDeTexto';

/**
 * LAS LISTAS: ELEGIR UNA Y AGREGARLA ENTERA
 *
 * ## El problema que resuelve: crecer
 *
 * Antes habia un chip por lista, siempre, todos pintados a la vez y con salto
 * de linea. Con cuatro listas ocupaban dos lineas; con veinte habrian ocupado
 * seis o siete y habrian empujado la lista de leads fuera de la hoja. El alto
 * del control crecia con cuantas listas TIENE la cuenta, que es justo lo que no
 * se puede acotar.
 *
 * Ahora crece con cuantas listas ELEGISTE, que son casi siempre cero o una y
 * como mucho un punado. Las demas viven dentro de un desplegable, que ocupa lo
 * mismo con cuatro que con cuarenta.
 *
 * ## Ver y agregar, con un control cada uno
 *
 * El desplegable elige que lista se MIRA. El boton de al lado AGREGA esa lista
 * entera al envio. Son dos gestos separados porque son dos cosas distintas, y
 * la que suma cuatrocientos destinatarios tiene que pedirse a proposito.
 *
 * Antes esto ya habia dado un problema, y conviene no repetirlo: el mismo chip
 * filtraba la vista y sumaba la lista al envio, con un rotulo que solo contaba
 * la mitad. Aca lo que suma es un boton que dice cuantos suma, y lo que ya esta
 * sumado se ve en los chips, con su cifra y con una cruz para quitarlo.
 *
 * ## Por que son dos piezas y no una
 *
 * El par desplegable + boton vive en la BARRA DE ABAJO de la hoja, en la misma
 * linea que "Listo": son los dos controles que se usan justo antes de cerrar, y
 * juntos ahorran un renglon a una pantalla que lo necesitaba.
 *
 * Los chips de lo ya agregado no: son respuesta, no control, y van arriba de esa
 * barra, pegados a la lista que describen. Ademas crecen, y lo que crece no
 * puede vivir en una fila de altura fija.
 */

/** Cuantos leads contactables aporta cada lista. */
export function useConteoPorLista(contactables: Lead[]): Map<number, number> {
  /*
   * Un recorrido por todos los leads y no uno por lista: con 1.000 leads y 20
   * listas, filtrar por lista son 20.000 comprobaciones en cada render.
   */
  return useMemo(() => {
    const conteo = new Map<number, number>();
    for (const lead of contactables) {
      for (const listaId of lead.listaIds) {
        conteo.set(listaId, (conteo.get(listaId) ?? 0) + 1);
      }
    }
    return conteo;
  }, [contactables]);
}

/** El desplegable de listas y el boton que agrega la elegida. Va en el pie. */
export function RecipientListPicker({
  leadLists,
  contactables,
  verListaId,
  onVerListaChange,
  selectedListIds,
  onToggleList,
}: {
  leadLists: LeadList[];
  /** Los leads que pueden recibir por este canal: es la cifra que se promete. */
  contactables: Lead[];
  verListaId: number | null;
  onVerListaChange: (id: number | null) => void;
  selectedListIds: Set<number>;
  onToggleList: (id: number) => void;
}) {
  const conteoPorLista = useConteoPorLista(contactables);

  if (leadLists.length === 0) return null;

  const listaVista = leadLists.find((lista) => lista.id === verListaId) ?? null;
  const enLaVista = verListaId !== null ? conteoPorLista.get(verListaId) ?? 0 : 0;
  const yaAgregada = verListaId !== null && selectedListIds.has(verListaId);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {/*
        Ancho acotado, no `flex-1`.

        Estirado ocupaba media barra del pie para decir "Todas las listas", que
        es el estado en el que esta casi siempre y que ademas no hace nada: el
        que importa es el boton de al lado y el "Listo" del final. El ancho que
        se ahorra se lo queda "Listo", que es la accion.

        Lo que no entre se recorta -un `select` nativo no pone puntos
        suspensivos, corta y ya-, y por eso el rotulo de "todas" se acorto:
        con la cifra al lado se entiende, y los nombres largos de lista se leen
        enteros al desplegarlo.
      */}
      <Select
        value={verListaId ?? ''}
        onChange={(evento) => onVerListaChange(evento.target.value ? Number(evento.target.value) : null)}
        compact
        aria-label="Ver solo los leads de una lista"
        fullWidth={false}
        className="w-[124px] shrink-0"
      >
        <option value="">Todas ({contactables.length})</option>
        {leadLists.map((lista) => (
          <option key={lista.id} value={lista.id}>
            {lista.name} ({conteoPorLista.get(lista.id!) ?? 0})
          </option>
        ))}
      </Select>

      {/*
        Pesa mas que la casilla de "esta pagina", y es a proposito: este suma
        cuatrocientos destinatarios y aquella ocho. Estaba al reves -este gris
        abajo, aquella arriba en la cabecera-, o sea que el gesto caro se veia
        como el accesorio.

        El ancho esta reservado (`min-w`) porque el rotulo cambia de largo
        -"Agregar 412", "Quitar 412", "Agregar —"-: sin reserva, elegir una
        lista corria de sitio todo lo que tiene al lado, empezando por el
        desplegable que acababas de usar.

        Deshabilitado, no escondido, cuando no hay lista elegida: si
        desapareciera, todo lo de al lado se correria al elegir una.
      */}
      <Button
        size="sm"
        variant={listaVista === null ? 'secondary' : yaAgregada ? 'ghost' : 'primary'}
        disabled={listaVista === null}
        onClick={() => listaVista?.id != null && onToggleList(listaVista.id)}
        className="min-w-[92px] shrink-0 justify-center font-semibold"
        title={
          listaVista === null
            ? 'Elige una lista para agregarla entera al envío'
            : yaAgregada
              ? `Quitar del envío los ${enLaVista} de ${listaVista.name}`
              : `Agregar al envío los ${enLaVista} de ${listaVista.name}`
        }
      >
        {yaAgregada ? 'Quitar' : 'Agregar'}{' '}
        <span className="tabular-nums">{listaVista ? enLaVista : '—'}</span>
      </Button>
    </div>
  );
}

/** Las listas ya agregadas al envio, cada una con su cifra y su cruz. */
export function RecipientListChips({
  leadLists,
  contactables,
  selectedListIds,
  onToggleList,
}: {
  leadLists: LeadList[];
  contactables: Lead[];
  selectedListIds: Set<number>;
  onToggleList: (id: number) => void;
}) {
  const conteoPorLista = useConteoPorLista(contactables);
  const agregadas = leadLists.filter((lista) => lista.id != null && selectedListIds.has(lista.id));

  if (agregadas.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {agregadas.map((lista) => (
        <button
          key={lista.id}
          type="button"
          onClick={() => onToggleList(lista.id!)}
          aria-label={`Quitar del envío los ${conteoPorLista.get(lista.id!) ?? 0} leads de ${lista.name}`}
          className="flex min-h-[24px] items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-micro font-medium transition-opacity hover:opacity-80"
          /*
            El color lo elige el usuario al crear la lista: es dato, no estilo.
            Es una de las excepciones que documenta el README del sistema de
            diseno.

            El texto NO es blanco fijo: lo decide `textoSobre` segun la
            luminancia del fondo. Con blanco fijo, una lista amarilla o verde
            menta -colores que el selector ofrece- dejaba el rotulo por debajo
            de 2:1, ilegible e incumpliendo WCAG 1.4.3.
          */
          style={{ backgroundColor: lista.color, color: textoSobre(lista.color) }}
        >
          <span className="max-w-[112px] truncate">{lista.name}</span>
          <span className="tabular-nums opacity-75">+{conteoPorLista.get(lista.id!) ?? 0}</span>
          <span aria-hidden="true" className="opacity-75">
            <Icon.Close />
          </span>
        </button>
      ))}
    </div>
  );
}
