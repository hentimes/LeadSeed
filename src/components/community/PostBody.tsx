import { useMemo } from 'react';
import { parseBody, type InlineToken, type PostBlock } from '../../utils/richTextParser';

/**
 * CUERPO DE UNA PUBLICACION, YA FORMATEADO
 *
 * Convierte los bloques que devuelve `parseBody` en elementos de React. La
 * lista de etiquetas que puede producir esta escrita aca y es cerrada:
 * `h3`, `h4`, `ul`, `li`, `hr`, `p`, `strong` y `a`. No hay ningun camino por
 * el que el texto de una persona se convierta en HTML: si el parser no lo
 * reconocio, sale como texto.
 *
 * ## Por que h3 y h4 y no h1 y h2
 *
 * El usuario los escribe como "# " y "## " -que es lo que se entiende por
 * encabezado 1 y 2 al redactar- pero el nivel del documento no lo decide quien
 * escribe: la publicacion ya cuelga del titulo, que es el `h2` de la pagina.
 * Emitir un `h1` dentro dejaria el orden de encabezados roto para un lector de
 * pantalla, que los usa para navegar.
 */

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, indice) => {
        if (token.type === 'bold') {
          return (
            <strong key={indice} className="font-semibold text-ink">
              {token.value}
            </strong>
          );
        }

        if (token.type === 'link') {
          return (
            <a
              key={indice}
              href={token.href}
              target="_blank"
              /*
               * `noreferrer` ademas de `noopener`: sin el, la pagina de destino
               * recibe de donde vino en la cabecera Referer. Los navegadores
               * modernos ya implican `noopener` con `target="_blank"`, pero
               * dejarlo escrito no cuesta nada y no depende de esa garantia.
               */
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              {token.label}
            </a>
          );
        }

        return <span key={indice}>{token.value}</span>;
      })}
    </>
  );
}

function Bloque({ bloque }: { bloque: PostBlock }) {
  if (bloque.type === 'hr') {
    return <hr className="my-3 border-0 border-t border-line" />;
  }

  if (bloque.type === 'heading') {
    return bloque.level === 1 ? (
      <h3 className="mb-1 mt-3 text-card-title font-semibold text-ink first:mt-0">
        <Inline tokens={bloque.inline} />
      </h3>
    ) : (
      <h4 className="mb-1 mt-2.5 text-body font-semibold text-ink first:mt-0">
        <Inline tokens={bloque.inline} />
      </h4>
    );
  }

  if (bloque.type === 'list') {
    return (
      <ul className="my-1.5 list-outside list-disc space-y-0.5 pl-4 marker:text-ink-muted">
        {bloque.items.map((item, indice) => (
          <li key={indice} className="text-body text-ink">
            <Inline tokens={item} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="my-1.5 whitespace-pre-wrap break-words text-body text-ink first:mt-0">
      <Inline tokens={bloque.inline} />
    </p>
  );
}

export default function PostBody({ body, className = '' }: { body: string; className?: string }) {
  const bloques = useMemo(() => parseBody(body), [body]);

  if (bloques.length === 0) return null;

  return (
    <div className={className}>
      {bloques.map((bloque, indice) => (
        <Bloque key={indice} bloque={bloque} />
      ))}
    </div>
  );
}
