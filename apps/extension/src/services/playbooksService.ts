import {
  fetchPlaybookRows,
  fetchPlaybookSectionRows,
  fetchPlaybookItemRows,
  insertPlaybookRow,
  updatePlaybookRow,
  upsertPlaybookSectionRows,
  upsertPlaybookItemRows,
  deletePlaybookSectionRow,
  deletePlaybookItemRow,
  type PlaybookRow,
  type PlaybookSectionRow,
  type PlaybookItemRow,
} from '../repositories/playbooksRepository';
import type {
  Playbook,
  PlaybookAnswerType,
  PlaybookContent,
  PlaybookIntentRole,
  PlaybookItem,
  PlaybookOption,
  PlaybookSection,
} from '../types';

/** Limites del DDL (migracion 148). Se comprueban aca para dar un mensaje legible. */
const MAX_NOMBRE = 80;
const MAX_DESCRIPCION = 500;
const MAX_TITULO = 120;
const MAX_PREGUNTA = 500;
const MAX_SOPORTE = 500;
const MAX_OPCIONES = 30;

function aPlaybook(row: PlaybookRow): Playbook {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function aSeccion(row: PlaybookSectionRow): PlaybookSection {
  return {
    id: row.id,
    playbookId: row.playbook_id,
    position: row.position,
    title: row.title,
  };
}

function aItem(row: PlaybookItemRow): PlaybookItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    position: row.position,
    title: row.title,
    question: row.question,
    support: row.support || undefined,
    answerType: (row.answer_type as PlaybookAnswerType) || 'texto',
    intentRole: (row.intent_role as PlaybookIntentRole) || undefined,
    options: row.options ?? [],
    sourceItemIds: row.source_item_ids ?? [],
  };
}

export async function fetchPlaybooks(soloActivos = false): Promise<Playbook[]> {
  const filas = await fetchPlaybookRows(soloActivos);
  return filas.map(aPlaybook);
}

export async function fetchPlaybookContent(playbookId: string): Promise<PlaybookContent> {
  const secciones = await fetchPlaybookSectionRows(playbookId);
  const items = await fetchPlaybookItemRows(secciones.map((s) => s.id));

  return { sections: secciones.map(aSeccion), items: items.map(aItem) };
}

export interface PlaybookItemDraft {
  id?: string;
  title: string;
  question: string;
  support?: string;
  answerType?: PlaybookAnswerType;
  intentRole?: PlaybookIntentRole;
  options?: PlaybookOption[];
  sourceItemIds?: string[];
}

export interface PlaybookSectionDraft {
  id?: string;
  title: string;
  items: PlaybookItemDraft[];
}

export interface PlaybookDraft {
  id?: string;
  name: string;
  description?: string;
  sections: PlaybookSectionDraft[];
}

/**
 * Valida contra los limites del DDL antes de escribir.
 *
 * Un `check` de Postgres rechazado devuelve "new row violates check constraint
 * playbooks_name_check", que no le dice nada a quien esta rellenando un
 * formulario. Aca la longitud se comprueba una vez y con nombre propio.
 */
function validar(draft: PlaybookDraft): string {
  if (!draft.name.trim()) return 'El guion necesita un nombre';
  if (draft.name.trim().length > MAX_NOMBRE) return `El nombre no puede pasar de ${MAX_NOMBRE} caracteres`;
  if ((draft.description ?? '').length > MAX_DESCRIPCION)
    return `La descripción no puede pasar de ${MAX_DESCRIPCION} caracteres`;

  for (const seccion of draft.sections) {
    if (!seccion.title.trim()) return 'Cada fase necesita un nombre';
    if (seccion.title.trim().length > MAX_TITULO)
      return `El nombre de la fase "${seccion.title.slice(0, 20)}…" es demasiado largo`;

    for (const item of seccion.items) {
      if (!item.title.trim()) return 'Cada punto necesita un título';
      if (item.title.trim().length > MAX_TITULO)
        return `El título "${item.title.slice(0, 20)}…" no puede pasar de ${MAX_TITULO} caracteres`;
      if (!item.question.trim()) return `El punto "${item.title}" necesita una pregunta`;
      if (item.question.trim().length > MAX_PREGUNTA)
        return `La pregunta de "${item.title}" no puede pasar de ${MAX_PREGUNTA} caracteres`;
      if ((item.support ?? '').length > MAX_SOPORTE)
        return `El soporte de "${item.title}" no puede pasar de ${MAX_SOPORTE} caracteres`;

      const problema = validarRespuesta(item);
      if (problema) return problema;
    }
  }

  return '';
}

/**
 * Las reglas del tipo de respuesta.
 *
 * Se comprueban aca y no solo en la base porque un `check` rechazado devuelve
 * "new row violates check constraint playbook_items_rol_coherente", que no le
 * dice nada a quien esta rellenando el formulario.
 */
function validarRespuesta(item: PlaybookItemDraft): string {
  const tipo = item.answerType ?? 'texto';
  const opciones = item.options ?? [];

  if (tipo === 'opciones_multi' || tipo === 'opciones_una') {
    // Salvo que las herede: un punto que clasifica lo marcado arriba no tiene
    // catalogo propio y su lista sale de sus origenes.
    if (opciones.length === 0 && (item.sourceItemIds ?? []).length === 0)
      return `El punto "${item.title}" necesita opciones, o heredarlas de otro punto`;
    if (opciones.length > MAX_OPCIONES)
      return `El punto "${item.title}" no puede pasar de ${MAX_OPCIONES} opciones`;
    if (opciones.some((o) => !o.label.trim()))
      return `Hay una opción sin texto en "${item.title}"`;
    if (new Set(opciones.map((o) => o.id)).size !== opciones.length)
      return `Hay dos opciones con el mismo identificador en "${item.title}"`;
  }

  if (tipo === 'criterios' && (item.sourceItemIds ?? []).length === 0)
    return `El punto "${item.title}" clasifica lo marcado en otros puntos: falta decir en cuáles`;

  if (tipo === 'checkpoint' && (item.sourceItemIds ?? []).length === 0)
    return `El resumen "${item.title}" necesita saber qué puntos resume`;

  // El rol solo significa algo con el tipo que le corresponde. La base lo
  // impone con un check; aca se dice con palabras.
  if (item.intentRole === 'importancia' && tipo !== 'criterios')
    return `"${item.title}" clasifica importancia, así que tiene que ser de tipo criterios`;
  if ((item.intentRole === 'mejorar' || item.intentRole === 'prioridad') &&
      tipo !== 'opciones_una' && tipo !== 'opciones_multi')
    return `"${item.title}" alimenta la confirmación, así que tiene que responderse con opciones`;

  return '';
}

/**
 * Guarda el borrador completo: cabecera, fases e items.
 *
 * Las posiciones se derivan del ORDEN del arreglo, nunca se piden al usuario.
 * Un campo "posicion" editable a mano es la forma mas facil de acabar con dos
 * items en la 3 y ninguno en la 4.
 *
 * Lo que el usuario quito se borra explicitamente: no se hace "borrar todo y
 * reinsertar" como los pasos de un flujo, porque borrar un `playbook_item`
 * deja en null el `item_id` de todos los recorridos que lo usaron y se pierde
 * para siempre de que pregunta salio esa respuesta.
 */
export async function savePlaybook(draft: PlaybookDraft, userId: string): Promise<string> {
  const problema = validar(draft);
  if (problema) throw new Error(problema);

  const playbookId = draft.id
    ? (await updatePlaybookRow(draft.id, {
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
      }),
      draft.id)
    : await insertPlaybookRow({
        user_id: userId,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
      });

  const previo = draft.id ? await fetchPlaybookContent(draft.id) : { sections: [], items: [] };

  const seccionesGuardadas = await upsertPlaybookSectionRows(
    draft.sections.map((seccion, indice) => ({
      ...(seccion.id ? { id: seccion.id } : {}),
      playbook_id: playbookId,
      position: indice + 1,
      title: seccion.title.trim(),
    })),
  );

  // El upsert devuelve las filas en el orden que decide Postgres, no en el que
  // se mandaron: se recuperan por posicion, que es el unico dato estable entre
  // lo pedido y lo devuelto.
  const idPorPosicion = new Map(seccionesGuardadas.map((s) => [s.position, s.id]));

  await upsertPlaybookItemRows(
    draft.sections.flatMap((seccion, indiceSeccion) => {
      const sectionId = idPorPosicion.get(indiceSeccion + 1);
      if (!sectionId) return [];

      return seccion.items.map((item, indice) => ({
        ...(item.id ? { id: item.id } : {}),
        section_id: sectionId,
        position: indice + 1,
        title: item.title.trim(),
        question: item.question.trim(),
        support: item.support?.trim() || null,
        answer_type: item.answerType ?? 'texto',
        intent_role: item.intentRole ?? null,
        options: item.options ?? [],
        source_item_ids: item.sourceItemIds ?? [],
      }));
    }),
  );

  const seccionesVivas = new Set(draft.sections.map((s) => s.id).filter(Boolean));
  const itemsVivos = new Set(draft.sections.flatMap((s) => s.items.map((i) => i.id)).filter(Boolean));

  for (const item of previo.items) {
    if (!itemsVivos.has(item.id)) await deletePlaybookItemRow(item.id);
  }
  for (const seccion of previo.sections) {
    if (!seccionesVivas.has(seccion.id)) await deletePlaybookSectionRow(seccion.id);
  }

  return playbookId;
}

export async function setPlaybookActive(id: string, activo: boolean): Promise<void> {
  await updatePlaybookRow(id, { is_active: activo });
}

export function contarItems(contenido: PlaybookContent): number {
  return contenido.items.length;
}
