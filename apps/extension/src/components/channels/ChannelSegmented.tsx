import { SegmentedControl } from '../../design';
import { Icon } from '../../utils/icons';
import { CHANNELS, type SendChannel } from '../send/channels';

/**
 * SELECTOR DE CANAL, COMPARTIDO
 *
 * Un solo componente para los tres sitios que eligen canal: el compositor de
 * envio, la pantalla de Plantillas y el editor de Flujos.
 *
 * ## Por que se unifico
 *
 * Habia dos implementaciones. `SendTabs` ya era este carril hundido; pero
 * `templates/ChannelTabs` seguia siendo un `role="tablist"` con `border-b-2
 * border-primary`, o sea el mismo dibujo que `PageTabs`, que vive justo encima.
 * Dos barras subrayadas apiladas no dan jerarquia: dan ambiguedad, y son 82px
 * de cromo antes de la primera palabra util.
 *
 * Lo mas raro es que el comentario de `ChannelTabs` ya declaraba la intencion
 * -"al moverse entre Plantillas y Enviar el canal deja de cambiar de idioma
 * visual"- mientras el codigo hacia justo lo contrario. Con un solo componente
 * eso no puede volver a separarse.
 *
 * El subrayado morado queda entonces con un unico consumidor, `PageTabs`, asi
 * que la regla de "nivel 1 en exclusiva" se sostiene sola.
 *
 * ## El tercer significado que tenia el subrayado
 *
 * En `FlowEditor` esto no navega ni conmuta una vista: es un CAMPO de un
 * formulario, el canal del flujo. Con el subrayado eran tres materias distintas
 * -pagina, modo y campo- con un mismo dibujo. Un carril con pastilla se lee como
 * control de formulario, que es lo que ahi es.
 *
 * ## El color de canal nunca viaja solo
 *
 * Medido sobre `--ls-surface`: el verde de WhatsApp da 2.28:1 y el ambar de
 * Llamadas 2.15:1, los dos por debajo del 3:1 de WCAG 1.4.11. Es legal porque
 * el glifo SIEMPRE lleva su palabra al lado, asi que el color es refuerzo y no
 * el portador del dato. Por eso no se colapsan los rotulos aunque
 * `SegmentedControl` sepa hacerlo: sin la palabra, el color pasaria a ser la
 * unica senal y entonces si incumpliria.
 *
 * Y solo el activo se tine. Tres glifos saturados a la vez -verde, morado y
 * ambar- son una tira de semaforos. El color confirma donde estas, y eso solo
 * importa del activo.
 */
export function ChannelSegmented({
  active,
  onChange,
  label = 'Canal',
  /**
   * Por defecto NO ocupa todo el ancho: se alinea a la derecha, del lado del
   * rail. El nivel 1 arranca a la izquierda y el nivel 2 al otro extremo, asi
   * que las dos barras dejan de leerse como una sola rejilla de seis columnas
   * aunque compartan el ancho de la pantalla.
   */
  className = '',
}: {
  active: SendChannel;
  onChange: (channel: SendChannel) => void;
  /** Nombre del grupo para el lector de pantalla. Cambia segun para que se usa. */
  label?: string;
  className?: string;
}) {
  return (
    <div className="flex justify-end">
    <SegmentedControl
      label={label}
      value={active}
      onChange={onChange}
      className={className}
      options={(Object.keys(CHANNELS) as SendChannel[]).map((canal) => ({
        value: canal,
        label: CHANNELS[canal].label,
        icon: (
          <span className={active === canal ? CHANNELS[canal].glyphClass : ''}>
            {canal === 'whatsapp' ? <Icon.WhatsAppOutline /> : canal === 'email' ? <Icon.EmailOutline /> : <Icon.PhoneOutline />}
          </span>
        ),
      }))}
    />
    </div>
  );
}
