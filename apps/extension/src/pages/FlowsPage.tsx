import { useEffect, useState } from 'react';
import { getPlatform } from '../platform/registry';
import { getSettings } from '../services/appSettingsService';
import { contarWhatsAppDelDia } from '../services/historyService';
import { adelantarPasos, fetchCargaProxima, reprogramarPasos } from '../services/messageFlowsService';
import { useFlowBatchDispatch } from '../hooks/useFlowBatchDispatch';
import WhatsAppQueuePanel from '../components/send/WhatsAppQueuePanel';
import {
  comienzoDelDia,
  diasQueAbarca,
  estadoDelCupo,
  repartirEnDias,
} from '../services/whatsappQuota';
import { Button, EmptyState, SegmentedControl } from '../design';
import { useAuth } from '../contexts/AuthContext';
import { useMessageFlows } from '../hooks/useMessageFlows';
import { FlowTodayList } from '../components/flows/FlowTodayList';
import { FlowEditor } from '../components/flows/FlowEditor';
import { FlowEnrollPanel } from '../components/flows/FlowEnrollPanel';
import { FlowDetail } from '../components/flows/FlowDetail';
import { FlowList } from '../components/flows/FlowList';
import { dispatchFlowStep } from '../services/flowDispatchService';
import type { MessageFlow, MessageFlowStep, PendingFlowStep } from '../types';

type Vista = 'hoy' | 'flujos' | 'editor' | 'detalle' | 'inscribir';

/**
 * Flujos de mensajes.
 *
 * La vista por defecto es **Hoy**, no la lista de flujos: la pregunta del
 * usuario es "que me falta enviar hoy", que cruza todos los flujos. Entrar por
 * la lista obligaria a abrir cada uno para enterarse de si hay algo pendiente.
 */
export default function FlowsPage() {
  const { user } = useAuth();
  const flujos = useMessageFlows();
  const [vista, setVista] = useState<Vista>('hoy');
  const [lista, setLista] = useState<MessageFlow[]>([]);
  const [aviso, setAviso] = useState('');

  const [editando, setEditando] = useState<MessageFlow | null>(null);
  const [pasosEditando, setPasosEditando] = useState<MessageFlowStep[]>([]);
  const [inscribiendoEn, setInscribiendoEn] = useState<MessageFlow | null>(null);
  const [viendo, setViendo] = useState<MessageFlow | null>(null);
  const [pasosViendo, setPasosViendo] = useState<MessageFlowStep[]>([]);

  // Un solo reloj para toda la pantalla: si cada fila leyera el suyo, dos filas
  // podrian discrepar sobre si algo esta atrasado.
  /*
   * Un solo reloj para toda la pantalla: si cada fila leyera el suyo, dos filas
   * podrian discrepar sobre si algo esta atrasado.
   *
   * Se renueva con cada recarga de la cola y no solo al montar. Estaba
   * congelado en el primer render, y un panel lateral queda abierto dias: a
   * partir de la medianoche siguiente "Toca hoy" y "Atrasado 2d" pasaban a
   * mentir, sin que nada lo delatara.
   */
  const [ahora, setAhora] = useState(() => new Date());

  /*
   * EL CUPO DE WHATSAPP DE HOY.
   *
   * Se recarga junto con la cola: son el mismo momento -abrir esta pantalla- y
   * la decision que se toma con los dos es una sola, "¿mando ahora o no?".
   *
   * El corte del dia lo pone el reloj del usuario: quien manda a las 22:00 en
   * Santiago no quiere que su cupo se reinicie porque en UTC ya es otro dia.
   */
  /** Que vence cada uno de los proximos dias. Explica el "hoy no toca nada". */
  const [proximos, setProximos] = useState<Array<{ dia: string; cantidad: number }>>([]);
  const [enviadosHoy, setEnviadosHoy] = useState(0);
  const [topeDiario, setTopeDiario] = useState(50);

  /*
   * `cancelado` en las tres cargas.
   *
   * Van en paralelo y el efecto se vuelve a disparar con cada refresco. Sin la
   * guarda, dos refrescos seguidos pueden resolver en el orden contrario y una
   * respuesta vieja pisar a una nueva: la cola diria una cosa y el cupo otra,
   * sin que nada lo delate.
   */
  useEffect(() => {
    let cancelado = false;
    setAhora(new Date());
    flujos.recargarCola();
    flujos.getAll().then((lista) => {
      if (!cancelado) setLista(lista);
    });
    void (async () => {
      const ajustes = await getSettings();
      const usados = await contarWhatsAppDelDia(comienzoDelDia(new Date()));
      const carga = await fetchCargaProxima();
      if (cancelado) return;
      setTopeDiario(ajustes.whatsappDailyLimit);
      setEnviadosHoy(usados);
      setProximos(carga);
    })();
    return () => {
      cancelado = true;
    };
  }, [flujos.refreshKey]);

  const cupo = estadoDelCupo(enviadosHoy, topeDiario);

  /*
   * LA TANDA. Convierte "a estos 47 les toca el mismo mensaje" en mandarlo.
   *
   * El contador del cupo sube con cada chat que se abre -no al final- porque el
   * tope tiene que frenar en el mensaje 50, no enterarse en el 51.
   */
  const tanda = useFlowBatchDispatch(user?.id, {
    onDespachado: () => setEnviadosHoy((usados) => usados + 1),
    /*
     * Marcar un numero como sin WhatsApp borra su registro de envio, asi que
     * el cupo del dia tiene que devolverlo. Sin esto, mandar cincuenta a diez
     * numeros muertos agotaria el tope con cuarenta mensajes de verdad.
     */
    onRevertido: () => setEnviadosHoy((usados) => Math.max(0, usados - 1)),
  });

  /*
   * LAS DOS SALIDAS DE LA RONDA, con lo que la pantalla hace despues.
   *
   * El gancho escribe y avanza la cola; recargar la lista de hoy y decir que
   * paso son cosas de esta pagina, y por eso se envuelven aqui.
   */
  const accionesDeLaCola = {
    onSinWhatsApp: async () => {
      const quien = tanda.cola.actual?.lead.name ?? 'El contacto';
      await tanda.marcarSinWhatsApp();
      await flujos.recargarCola();
      setAviso(`${quien} quedó en la lista "Sin WhatsApp" y ese mensaje ya no cuenta.`);
    },
    onNoContactar: async (nota: string) => {
      const quien = tanda.cola.actual?.lead.name ?? 'El contacto';
      await tanda.sacarPorNoContactar(nota);
      await flujos.recargarCola();
      setAviso(
        `${quien} quedó en la lista "No contactar" y salió de todos sus flujos. Lo que ya recibió queda registrado.`,
      );
    },
  };

  /*
   * Traer a hoy lo que estaba para mas adelante.
   *
   * Se confirma porque cambia la agenda de golpe y no hay un "deshacer": lo
   * adelantado queda vencido, y volver a repartirlo es otra decision.
   */
  const adelantar = async (hasta: Date, cuantos: number, esHoy: boolean) => {
    /*
     * El dialogo cambia segun si la fecha pautada ya es hoy.
     *
     * Con "¿Traer 17 a hoy?" sobre pasos que vencian HOY, la pregunta no
     * significaba nada: ya era hoy. Lo que se adelanta en ese caso son horas,
     * no dias, y eso es lo que hay que preguntar.
     */
    const confirmado = await getPlatform().dialogs.confirm(
      esHoy
        ? 'Vencen hoy más tarde. Esto los deja listos ahora, sin esperar a su hora. Si puedes esperar, aparecen solos.'
        : 'Quedan listos para mandar ahora, sin esperar a su fecha. El resto del flujo sigue igual: el paso siguiente se contará desde hoy.',
      {
        title: esHoy
          ? `¿Mandar ${cuantos} ${cuantos === 1 ? 'mensaje' : 'mensajes'} antes de tiempo?`
          : `¿Traer ${cuantos} ${cuantos === 1 ? 'mensaje' : 'mensajes'} a hoy?`,
        confirmLabel: esHoy ? `Adelantar ${cuantos}` : `Traer ${cuantos}`,
      },
    );
    if (!confirmado) return;

    try {
      /* Hasta el final de ese dia: la fecha viene como el dia agrupado, y a
         medianoche dejaria fuera todo lo que vence esa misma jornada. */
      const finDelDia = new Date(hasta);
      finDelDia.setHours(23, 59, 59, 999);
      const movidos = await adelantarPasos(finDelDia);
      await flujos.recargarCola();
      setProximos(await fetchCargaProxima());
      setAviso(
        `${movidos} ${movidos === 1 ? 'paso listo' : 'pasos listos'} para mandar ahora.`,
      );
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo adelantar la cola.');
    }
  };

  const despacharGrupo = (filas: PendingFlowStep[]) => {
    const tope = filas[0]?.channel === 'whatsapp' ? cupo.quedan : filas.length;
    void tanda.despacharGrupo(filas, tope);
  };

  /*
   * El reparto se calcula sobre la cola de WhatsApp, no sobre toda: un correo
   * no gasta cupo de WhatsApp y moverlo de dia no arregla nada.
   */
  const repartoPropuesto = repartirEnDias(
    flujos.cola
      .filter((fila) => fila.channel === 'whatsapp')
      .map((fila) => ({ progressId: fila.progressId, dueAt: fila.dueAt ?? ahora.toISOString() })),
    topeDiario,
    cupo.quedan,
    ahora,
  );

  const repartir = async () => {
    const dias = diasQueAbarca(repartoPropuesto, ahora);
    const confirmado = await getPlatform().dialogs.confirm(
      `Se mueven ${repartoPropuesto.length} pasos para que ningún día pase de ${topeDiario}. El último queda para dentro de ${dias} ${dias === 1 ? 'día' : 'días'}. Los atrasados y los de hoy que caben en el cupo no se tocan.`,
      { title: '¿Repartir en los próximos días?', confirmLabel: 'Repartir' },
    );
    if (!confirmado) return;

    try {
      const movidos = await reprogramarPasos(repartoPropuesto);
      await flujos.recargarCola();
      setAviso(`${movidos} pasos repartidos en los próximos ${dias} días.`);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo repartir la cola.');
    }
  };

  /** Cuantos pasos tocan hoy o estan atrasados: el numero que va en la barra. */
  const pendientes = flujos.cola.length;

  /** Las vistas profundas traen su propio "Volver" y no pintan la barra. */
  const esVistaDeLista = vista === 'hoy' || vista === 'flujos';

  const abrirEditor = async (flujo: MessageFlow | null) => {
    setEditando(flujo);
    setPasosEditando(flujo ? await flujos.getSteps(flujo.id) : []);
    setVista('editor');
  };

  const abrirDetalle = async (flujo: MessageFlow) => {
    setViendo(flujo);
    setPasosViendo(await flujos.getSteps(flujo.id));
    setVista('detalle');
  };

  const despachar = async (fila: PendingFlowStep) => {
    if (!user) return;
    setAviso('');
    try {
      await dispatchFlowStep(user.id, fila);
      /*
       * EL CUPO SUBE AQUI, no en el efecto.
       *
       * El efecto que lo carga depende de `refreshKey`, y `recargarCola` no lo
       * incrementa: el contador se quedaba en "0 de 50" toda la sesion aunque
       * mandaras cincuenta, y por lo tanto `agotado` no se cumplia nunca y los
       * botones no se apagaban jamas. El unico guardarrail de la cuenta de
       * WhatsApp estaba muerto justo durante la sesion en la que se manda.
       *
       * Se suma en local en vez de volver a contar: el envio acaba de ocurrir y
       * lo sabemos con certeza, y una consulta por mensaje pondria una espera
       * entre cada apertura de chat. La cifra exacta se vuelve a leer sola en el
       * proximo refresco.
       */
      if (fila.channel === 'whatsapp') setEnviadosHoy((usados) => usados + 1);
      await flujos.recargarCola();
      // "Abierto", no "enviado": con WhatsApp solo consta que se abrio el chat.
      setAviso(
        fila.channel === 'email'
          ? `Correo enviado a ${fila.leadName}.`
          : fila.channel === 'call'
            ? `Llamada registrada para ${fila.leadName}.`
            : `WhatsApp abierto para ${fila.leadName}.`
      );
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo despachar el paso.');
    }
  };

  /*
   * El dialogo dice las dos mitades. Antes solo decia que los inscritos
   * dejaban de recibir sus pasos, y con eso no se podia decidir: lo que frena a
   * cualquiera es no saber si borrar el flujo borra tambien lo ya enviado. No
   * lo borra -eso vive en send_logs- y decirlo es la diferencia entre poder
   * decidir y no tocar el boton.
   */
  const eliminarFlujo = async (flujo: MessageFlow) => {
    const confirmado = await getPlatform().dialogs.confirm(
      'Se pierde quién estaba inscrito y por qué paso iba. Los mensajes ya enviados NO se borran: quedan en el historial de cada lead.',
      { title: `¿Eliminar el flujo ${flujo.name}?`, confirmLabel: 'Eliminar', tone: 'danger' },
    );
    if (!confirmado) return;

    try {
      await flujos.remove(flujo.id);
      setAviso(`Flujo ${flujo.name} eliminado.`);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const omitir = async (fila: PendingFlowStep) => {
    if (
      !(await getPlatform().dialogs.confirm(
        'Pasa directo al siguiente, y lo omitido no se puede volver a programar.',
        { title: `¿Omitir este paso para ${fila.leadName}?`, confirmLabel: 'Omitir', tone: 'danger' },
      ))
    ) {
      return;
    }
    await flujos.omitirPaso(fila.progressId);
    setAviso(`Paso omitido para ${fila.leadName}.`);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/*
        NIVEL 2, y solo cuando tiene una posicion valida.

        Era una fila de pestanas con `border-b-2 border-primary`, o sea el mismo
        dibujo que `PageTabs`, que esta justo encima. Ahora es el carril hundido
        que ya usan Enviar y Plantillas: el subrayado morado queda reservado al
        nivel 1.

        Dos cosas mas, que no son de estilo:

        1. **El contador se muda a "Hoy".** Decia `Flujos · 3`, que es cuantos
           flujos tienes: inventario, no urgencia. Nadie abre esta pantalla para
           saber eso. El numero que importa es cuantos pasos te tocan hoy.

        2. **No se dibuja en las vistas profundas.** En detalle, editor e
           inscribir ninguna de las dos opciones esta activa, asi que se pintaba
           un control de navegacion que no decia donde estabas. Un
           `radiogroup` sin ninguna posicion puesta es una mentira semantica.
           Esas vistas ya traen su propio "Volver".
      */}
      {esVistaDeLista && (
        <div className="flex justify-end">
        <SegmentedControl
          label="Vista"
          value={vista === 'hoy' ? 'hoy' : 'flujos'}
          onChange={(v) => setVista(v)}
          options={[
            { value: 'hoy', label: pendientes > 0 ? `Hoy · ${pendientes}` : 'Hoy' },
            { value: 'flujos', label: 'Flujos' },
          ]}
        />
        </div>
      )}

      {/* Region viva: los cambios de estado tienen que anunciarse, no solo
          verse. Quien usa lector de pantalla no esta mirando la fila que
          cambio. */}
      <p aria-live="polite" className="sr-only">
        {aviso}
      </p>
      {aviso && (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-micro text-ink-secondary">
          {aviso}
        </p>
      )}

      {/*
        LA COLA EN MARCHA, encima de todo.
        
        Mientras hay una tanda abierta, lo unico que importa es a quien le toca
        y cuantos faltan. Es la misma barra del envio masivo: la tarea es la
        misma y no tiene por que verse distinta segun de donde salio.
      */}
      <WhatsAppQueuePanel cola={tanda.cola} acciones={accionesDeLaCola} />
      {tanda.error && (
        <p role="alert" className="text-micro text-state-danger">
          {tanda.error}
        </p>
      )}
      {tanda.ultimoResultado && (
        <p role="status" className="text-micro text-ink-secondary">
          {tanda.ultimoResultado}
        </p>
      )}

      {vista === 'inscribir' && inscribiendoEn ? (
        /*
         * Inscribir era el unico paso de esta pagina que se abria en un modal.
         * Editar y ver detalle ya eran vistas; ahora las tres se comportan
         * igual, y la lista de leads se ve como la de envio masivo.
         */
        <FlowEnrollPanel
          /* `key` por flujo: el panel guarda estado propio -busqueda, filtro,
             orden, el paso elegido de cada lead- que se inicializa al montar.
             Sin esto, reusarlo para otro flujo arrastraria decisiones tomadas
             sobre el anterior. */
          key={inscribiendoEn.id}
          flujo={inscribiendoEn}
          /* Se vuelve de donde se vino: al detalle si se entro desde ahi, a la
             lista si se entro desde el boton de la fila del flujo. */
          onVolver={() => { setInscribiendoEn(null); setVista(viendo ? 'detalle' : 'flujos'); }}
          onInscribir={async (leadId: string, ultimoPasoHecho: number, desde: string | null) => {
            await flujos.inscribir(inscribiendoEn.id, leadId, ultimoPasoHecho, desde);
          }}
          onInscribirTodos={async (leadIds: string[]) =>
            flujos.inscribirTodos(inscribiendoEn.id, leadIds, true)
          }
        />
      ) : vista === 'detalle' && viendo ? (
        <FlowDetail
          flujo={viendo}
          pasos={pasosViendo}
          refreshKey={flujos.refreshKey}
          /*
            Se limpia `viendo` al salir del detalle. Sin esto quedaba colgado, y
            como el "Volver" de Inscribir decide a donde ir con `viendo ? ...`,
            pasaba lo siguiente: abris el detalle del flujo A, volves, tocas
            "Inscribir" en la fila del flujo B, y al volver aterrizas en el
            detalle del flujo A. Un estado de una pantalla que ya cerraste
            decidiendo la navegacion de otra.
          */
          onVolver={() => { setViendo(null); setVista('flujos'); }}
          onEditar={() => abrirEditor(viendo)}
          onInscribir={() => { setInscribiendoEn(viendo); setVista('inscribir'); }}
          onPausar={async (activo) => {
            await flujos.setActivo(viendo.id, activo);
            const refrescados = await flujos.getAll();
            setLista(refrescados);
            const actualizado = refrescados.find((f) => f.id === viendo.id);
            if (actualizado) setViendo(actualizado);
            setAviso(activo ? `Flujo ${viendo.name} reanudado.` : `Flujo ${viendo.name} pausado.`);
          }}
          onSacar={async (enrollmentId, motivo, nota) => {
            await flujos.sacar(enrollmentId, motivo, nota);
            /*
             * El aviso dice lo que hizo cada motivo. Los dos ultimos marcan al
             * lead y le cierran la puerta a futuras inscripciones: decir "lead
             * sacado del flujo" para eso se queda corto justo donde importa.
             */
            setAviso(
              motivo === 'no_contactar'
                ? 'Salió de todos sus flujos y quedó en la lista "No contactar".'
                : motivo === 'sin_whatsapp'
                  ? 'Salió de sus flujos de WhatsApp y quedó en la lista "Sin WhatsApp".'
                  : 'Lead sacado del flujo.',
            );
          }}
        />
      ) : vista === 'editor' ? (
        <FlowEditor
          flujo={editando}
          pasosIniciales={pasosEditando}
          onCancelar={() => setVista('flujos')}
          onGuardar={async (datos, pasos) => {
            /*
             * Guardar puede estar PROHIBIDO, y hasta ahora no se decia.
             *
             * `replaceFlowSteps` borra los pasos y los reinserta, y un paso con
             * progreso no se puede borrar (`message_flow_progress.step_id` es
             * `on delete restrict`). Sin este `try`, el error tumbaba la
             * promesa: el editor se quedaba abierto, sin aviso y sin guardar,
             * o sea igual que si no hubieras pulsado nada.
             *
             * El borrado del flujo, unas lineas mas abajo, ya traducia su error
             * desde el primer dia; guardar se habia quedado atras.
             */
            try {
              await flujos.save(datos, pasos);
            } catch (error) {
              setAviso(
                error instanceof Error && /violates foreign key|restrict/i.test(error.message)
                  ? 'No se pueden cambiar los pasos: alguno ya tiene envíos registrados. Pausa el flujo o crea uno nuevo.'
                  : 'No se pudo guardar el flujo.',
              );
              return;
            }
            setLista(await flujos.getAll());
            setVista('flujos');
            setAviso(`Flujo ${datos.name} guardado.`);
          }}
        />
      ) : vista === 'hoy' ? (
        <FlowTodayList
          cola={flujos.cola}
          ahora={ahora}
          cupo={cupo}
          onRepartir={repartir}
          seMoverian={repartoPropuesto.length}
          proximos={proximos}
          onDespacharGrupo={despacharGrupo}
          onAdelantar={(hasta, cuantos, esHoy) => void adelantar(hasta, cuantos, esHoy)}
          tandaEnCurso={tanda.cola.activa || tanda.procesando}
          onDespachar={despachar}
          onOmitir={omitir}
          onIrAFlujos={() => setVista('flujos')}
        />
      ) : lista.length === 0 ? (
        <EmptyState
          title="Todavía no tienes flujos"
          description="Un flujo es una secuencia: el paso 1 hoy, el 2 a los tres días. LeadSeed te avisa el dia que toca; tu decides si se envia."
          action={<Button variant="primary" onClick={() => abrirEditor(null)}>Crear el primero</Button>}
        />
      ) : (
        <FlowList
          flujos={lista}
          onAbrirDetalle={abrirDetalle}
          onInscribir={(flujo) => { setInscribiendoEn(flujo); setVista('inscribir'); }}
          onEditar={abrirEditor}
          onEliminar={eliminarFlujo}
        />
      )}

      {vista === 'flujos' && lista.length > 0 && (
        <Button variant="primary" onClick={() => abrirEditor(null)}>
          Nuevo flujo
        </Button>
      )}

    </div>
  );
}
