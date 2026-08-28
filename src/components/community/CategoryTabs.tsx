import { useRef } from 'react';
import { Icon } from '../../utils/icons';
import type { CommunityCategory } from '../../types/community';

/**
 * FILTRO POR CATEGORIA
 *
 * Mismo patron que las pestanas de la sala de chat y las de Configuracion:
 * `flex-1`, indicador de linea inferior, y el nombre en el `title`.
 *
 * ## Por que no son fichas ovaladas
 *
 * Lo eran, y con cinco categorias mas el selector de orden y el boton de
 * publicar en la misma fila **se envolvian a dos lineas**. Antes de eso hacian
 * scroll horizontal, que era peor: los scrollbars estan ocultos globalmente en
 * `index.css`, asi que las que no entraban desaparecian por el borde sin
 * ninguna pista de que estuvieran ahi.
 *
 * ## Cuando se escribe el nombre
 *
 * Desde `panel-lg`, y esta medido. Con cinco pestanas a partes iguales, el
 * ancho por pestana y los rotulos que entran a 13px son:
 *
 *   panel-sm (408px) ->  67px  ->  1 de 5
 *   panel-md (488px) ->  83px  ->  3 de 5
 *   panel-lg (548px) ->  95px  ->  4 de 5
 *   panel-xl (628px) -> 111px  ->  4 de 5
 *
 * `panel-lg` es donde deja de tener sentido esperar: el unico que sigue sin
 * entrar es "Tips y estrategias" (18 caracteres, ~148px con su icono), y no hay
 * ancho de panel que lo resuelva. Ese se recorta con `truncate` y su nombre
 * completo se lee en el tooltip, que esta SIEMPRE, tambien cuando el rotulo se
 * ve.
 *
 * Como todas las pestanas son `flex-1`, ensenar u ocultar el rotulo no cambia
 * el ancho de ninguna: los iconos no se mueven de sitio al cambiar de tamano.
 *
 * ## El icono
 *
 * Sale de `community_categories.icon`, que la migracion 074 llena con claves
 * del registro `utils/icons` (`Messages`, `Bullseye`, `Help`, `Bell`). La
 * columna admite nulos y no tiene CHECK, y las categorias las crea el staff a
 * mano por SQL: una fila con el icono vacio o mal escrito dejaria una pestana
 * en blanco, sin nombre ni tooltip. Por eso hay respaldo.
 */

/** Valor sintetico de la pestana que no filtra por ninguna categoria. */
const TODAS = '__todas__';

/** Cuando la categoria no trae icono, o el que trae no existe en el registro. */
const ICONO_POR_DEFECTO = Icon.Messages;

/**
 * Reemplazos para claves que la base trae pero que se ven mal a este tamano.
 *
 * `Help` es un signo de interrogacion pelado: a 18px, entre iconos con silueta,
 * parece un caracter de texto que se colo. La sustitucion vive aca y no en la
 * base a proposito: cambiar el `icon` de la fila obliga a una migracion y a que
 * todos los entornos la corran, y esto es una decision de como se dibuja, no un
 * dato distinto.
 */
const MEJORAS: Record<string, keyof typeof Icon> = {
  Help: 'HelpCircle',
};

function iconoDeCategoria(clave?: string | null) {
  if (!clave) return ICONO_POR_DEFECTO;

  const efectiva = MEJORAS[clave] ?? clave;
  if (efectiva in Icon) return Icon[efectiva as keyof typeof Icon];

  return ICONO_POR_DEFECTO;
}

export default function CategoryTabs({
  categories,
  activeCategoryId,
  onCategoryChange,
}: {
  categories: CommunityCategory[];
  activeCategoryId?: string;
  onCategoryChange: (categoryId?: string) => void;
}) {
  const barraRef = useRef<HTMLDivElement>(null);

  const pestanas = [
    { id: TODAS, name: 'Todas', description: 'Todas las publicaciones', Glifo: Icon.Layers },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? category.name,
      Glifo: iconoDeCategoria(category.icon),
    })),
  ];

  const activa = activeCategoryId ?? TODAS;

  /* Roving tabindex: la barra es UNA parada de tabulacion, dentro se mueve con
     las flechas. Es el patron de pestanas de la guia WAI-ARIA. */
  const alPulsar = (event: React.KeyboardEvent, indice: number) => {
    const teclas: Record<string, number> = {
      ArrowRight: indice + 1,
      ArrowLeft: indice - 1,
      Home: 0,
      End: pestanas.length - 1,
    };

    const destino = teclas[event.key];
    if (destino === undefined) return;

    event.preventDefault();
    const acotado = (destino + pestanas.length) % pestanas.length;
    const siguiente = pestanas[acotado];
    if (!siguiente) return;

    onCategoryChange(siguiente.id === TODAS ? undefined : siguiente.id);

    const botones = barraRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    botones?.[acotado]?.focus();
  };

  return (
    <div
      ref={barraRef}
      role="tablist"
      aria-label="Filtrar por categoría"
      className="flex w-full min-w-0 items-end border-b border-line pb-1"
    >
      {pestanas.map(({ id, name, description, Glifo }, indice) => {
        const esActiva = id === activa;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={esActiva}
            // Sin rotulo visible, el nombre accesible es lo unico que queda.
            aria-label={name}
            title={description}
            tabIndex={esActiva ? 0 : -1}
            onClick={() => onCategoryChange(id === TODAS ? undefined : id)}
            onKeyDown={(event) => alPulsar(event, indice)}
            className={`-mb-[5px] flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 border-b-[2px] pb-3 text-body font-medium transition-colors ${
              esActiva
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <span className="shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">
              <Glifo />
            </span>

            <span className="hidden truncate panel-lg:inline">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
