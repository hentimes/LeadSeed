/**
 * Iconos del chat.
 *
 * Estaban escritos como `<svg>` en linea dentro del JSX de cada componente: el
 * de marcador aparecia tres veces con tres tamanos distintos, el de papelera
 * cuatro, y el de campana de anuncio tres. Al centralizarlos, cambiar el grosor
 * de trazo o el tamano deja de ser una busqueda por seis archivos.
 *
 * Todos heredan `currentColor` y miden 1em, asi que el color y el tamano los
 * decide quien los usa con `text-*` y `[&_svg]:h-*`. No llevan `aria-hidden`
 * aca: el boton que los envuelve es quien lleva el nombre accesible.
 */

const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

type Props = { className?: string; filled?: boolean };

const base = 'h-4 w-4 shrink-0';

export const ChatIcon = {
  Bookmark: ({ className = '', filled = false }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} fill={filled ? 'currentColor' : 'none'}>
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
    </svg>
  ),

  Star: ({ className = '', filled = false }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} fill={filled ? 'currentColor' : 'none'}>
      <path d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.19.56l1.29 5.38a.56.56 0 01-.84.61l-4.73-2.88a.56.56 0 00-.58 0L6.98 21.54a.56.56 0 01-.84-.61l1.29-5.38a.56.56 0 00-.19-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.47-.35L11.48 3.5z" />
    </svg>
  ),

  Pin: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} fill="currentColor">
      <path d="M16 3a1 1 0 011 1v5.586l3.707 3.707a1 1 0 01-.707 1.707H13v5a1 1 0 01-2 0v-5H4.586a1 1 0 01-.293-1.707L8 9.586V4a1 1 0 011-1z" />
    </svg>
  ),

  Flag: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <path d="M3 3v18M4.5 4.5h13l-3 4.5 3 4.5h-13" />
    </svg>
  ),

  Trash: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),

  More: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  ),

  Megaphone: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} fill="currentColor">
      <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
    </svg>
  ),

  Lock: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} strokeWidth={2}>
      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),

  Check: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} strokeWidth={2.4}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),

  ArrowDown: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} strokeWidth={2.2}>
      <path d="M12 5v14m0 0l-6-6m6 6l6-6" />
    </svg>
  ),

  Paperclip: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  ),


  Send: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  ),

  Document: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),

  Shield: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.8-7 9-4.1-1.2-7-4.8-7-9V6l7-3z" />
      <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
    </svg>
  ),

  Chevron: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} strokeWidth={2}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),

  /*
   * Reacciones. Son iconos de trazo, del mismo juego que el resto del chat, y
   * NO emoticones: en el producto los emoticones viven solo dentro del selector
   * de emoticones. Lo que se guarda en la base es un identificador (`like`,
   * `dislike`, `love`), no un caracter; lo que se DIBUJA es esto.
   */
  ThumbUp: ({ className = '', filled = false }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} fill={filled ? 'currentColor' : 'none'}>
      <path d="M7 10.5v9M7 10.5 10.8 3a2.1 2.1 0 0 1 2.1 2.1v3.4h4.6a2 2 0 0 1 1.96 2.4l-1.2 6a2 2 0 0 1-1.96 1.6H7" />
      <path d="M3.5 10.5h3.5v9H3.5a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5Z" />
    </svg>
  ),

  ThumbDown: ({ className = '', filled = false }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} fill={filled ? 'currentColor' : 'none'}>
      <path d="M7 13.5v-9M7 13.5 10.8 21a2.1 2.1 0 0 0 2.1-2.1v-3.4h4.6a2 2 0 0 0 1.96-2.4l-1.2-6A2 2 0 0 0 16.3 5.5H7" />
      <path d="M3.5 4.5h3.5v9H3.5a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5Z" />
    </svg>
  ),

  Heart: ({ className = '', filled = false }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo} fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.8 8.6c0-2.4-1.9-4.35-4.25-4.35-1.75 0-3.26 1.09-3.91 2.64-.65-1.55-2.16-2.64-3.91-2.64C6.38 4.25 4.5 6.2 4.5 8.6c0 6.1 8.15 11.15 8.15 11.15S20.8 14.7 20.8 8.6Z" />
    </svg>
  ),

  /** Carita para abrir el selector de emoticones. Es un icono, no un emoticon. */
  Smiley: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.4} />
    </svg>
  ),

  Reply: ({ className = '' }: Props) => (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...trazo}>
      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </svg>
  ),
};
