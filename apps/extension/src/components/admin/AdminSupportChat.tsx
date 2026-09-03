import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Icon } from '../../utils/icons';
import type { Profile, Requirement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentSession } from '../../services/authService';
import {
  createSupportMessage,
  createTypingControlChannel,
  loadAdminSupportMessages,
  markConversationRead,
  markSupportMessageAsRead,
  reconcileIncomingSupportMessage,
  applySupportMessageUpdate,
  closeTypingControlChannel,
  type SupportMessage as PrivateMessage,
} from '../../services/supportService';
import { getErrorMessage } from '../../utils/errorMessage';
import { Button, IconButton, Input, Notice } from '../../design';
import { Card } from '../../design';
import AdminSkeleton from './AdminSkeleton';
import { formatearFecha, formatearHora } from '../../utils/date';

function formatMessageDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  const diffDays = Math.ceil(Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return days[date.getDay()];
  }
  return formatearFecha(date);
}

function formatMessageTime(dateStr: string) {
  if (!dateStr) return '';
  return formatearHora(dateStr);
}

export default function AdminSupportChat({ selectedUser, activeRequirement }: { selectedUser: Profile; activeRequirement?: Requirement }) {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  /**
   * Lo que antes decia un `alert()` del navegador: que se envio la senal de
   * cierre, o que el mensaje no salio. Un dialogo modal para eso obliga a un
   * clic para seguir escribiendo, y tapa el chat que lo explica.
   */
  const [aviso, setAviso] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controlChannelRef = useRef<RealtimeChannel | null>(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { profile: currentUserProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const setupChat = async () => {
      setLoading(true);
      const session = await getCurrentSession();
      if (!session || !isMounted) return;

      setAdminId(session.user.id);
      const loadedMessages = await loadAdminSupportMessages(session.user.id, selectedUser.id);
      if (!isMounted) return;

      setMessages(loadedMessages);
      await markConversationRead(session.user.id, selectedUser.id);

      if (activeRequirement && !loadedMessages.some((message) => message.context_req_id === activeRequirement.id)) {
        const agentFirstName = currentUserProfile?.full_name?.split(' ')[0] || currentUserProfile?.email?.split('@')[0] || 'Soporte';
        const userFirstName = selectedUser.full_name?.split(' ')[0] || selectedUser.email?.split('@')[0] || 'cliente';
        setNewMessage(`Hola ${userFirstName}, mi nombre es ${agentFirstName} y voy a ayudarte con tu requerimiento ${activeRequirement.ticket_code}.`);
      }

      /*
       * Segundo control de montaje, y no es de mas: entre el `await` anterior
       * y esta linea el admin pudo haber cambiado de conversacion. Si lo hizo,
       * la limpieza de esta instancia ya corrio -con los refs todavia vacios,
       * porque el canal no existia- y crear el canal ahora lo dejaria suscrito
       * para siempre, ademas de pisar el ref del chat nuevo.
       */
      if (!isMounted) return;

      const messageChannel = createTypingControlChannel(`support_admin_${selectedUser.id}_${Date.now()}`);
      messageChannelRef.current = messageChannel;
      messageChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, async (payload) => {
          const message = payload.new as PrivateMessage;
          const belongsToThread =
            (message.sender_id === session.user.id && message.receiver_id === selectedUser.id) ||
            (message.sender_id === selectedUser.id && message.receiver_id === session.user.id);
          if (!belongsToThread) return;

          if (message.receiver_id === session.user.id) {
            await markSupportMessageAsRead(message.id);
          }

          setMessages((prev) => reconcileIncomingSupportMessage(prev, message));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages' }, (payload) => {
          const message = payload.new as PrivateMessage;
          setMessages((prev) => applySupportMessageUpdate(prev, message));
        })
        .subscribe();

      const controlChannel = createTypingControlChannel(`support_control_${selectedUser.id}`);
      controlChannelRef.current = controlChannel;
      controlChannel
        .on('broadcast', { event: 'USER_CLOSED_CHAT' }, (payload) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender_id: 'system',
              receiver_id: 'system',
              message: payload.payload?.message || 'El usuario cerro la ventana de chat.',
              created_at: new Date().toISOString(),
              isSystem: true,
            },
          ]);
        })
        .on('broadcast', { event: 'TYPING' }, (payload) => {
          if (payload.payload?.senderId === selectedUser.id) {
            setIsUserTyping(Boolean(payload.payload?.isTyping));
          }
        })
        .subscribe();

      setLoading(false);
    };

    void setupChat();
    return () => {
      isMounted = false;
      if (messageChannelRef.current) closeTypingControlChannel(messageChannelRef.current);
      if (controlChannelRef.current) closeTypingControlChannel(controlChannelRef.current);

      /*
       * Los refs se vacian y el temporizador de "escribiendo" se cancela.
       *
       * Sin esto: escribir en el chat de A arma un temporizador de 2s que al
       * vencer manda `TYPING:false` por `controlChannelRef.current`. Si el
       * admin cambia a B antes de que venza, ese ref ya apunta al canal de B,
       * asi que el aviso se emitia en una conversacion que no lo habia
       * provocado.
       */
      messageChannelRef.current = null;
      controlChannelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [activeRequirement, currentUserProfile?.email, currentUserProfile?.full_name, selectedUser.email, selectedUser.full_name, selectedUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isUserTyping]);

  const closeUserChat = async () => {
    if (!controlChannelRef.current) return;
    await controlChannelRef.current.send({
      type: 'broadcast',
      event: 'CLOSE_CHAT',
      payload: { message: 'Admin cerro el chat' },
    });
    setAviso('Señal de cierre enviada al usuario.');
  };

  const handleTyping = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(event.target.value);
    if (!controlChannelRef.current || !adminId) return;

    void controlChannelRef.current.send({
      type: 'broadcast',
      event: 'TYPING',
      payload: { isTyping: true, senderId: adminId },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      void controlChannelRef.current?.send({
        type: 'broadcast',
        event: 'TYPING',
        payload: { isTyping: false, senderId: adminId },
      });
    }, 2000);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !adminId) return;

    const text = newMessage.trim();
    setNewMessage('');

    void controlChannelRef.current?.send({
      type: 'broadcast',
      event: 'TYPING',
      payload: { isTyping: false, senderId: adminId },
    });

    const optimisticMessage: PrivateMessage = {
      id: `temp-${Date.now()}`,
      sender_id: adminId,
      receiver_id: selectedUser.id,
      message: text,
      created_at: new Date().toISOString(),
      is_read: false,
      context_req_id: activeRequirement?.id,
      context_ticket_code: activeRequirement?.ticket_code,
      context_ticket_type: activeRequirement?.type,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await createSupportMessage(adminId, selectedUser.id, text, {
        context_req_id: activeRequirement?.id,
        context_ticket_code: activeRequirement?.ticket_code,
        context_ticket_type: activeRequirement?.type,
      });
    } catch (error: unknown) {
      console.error('Error enviando mensaje:', error);
      setAviso('No se pudo enviar el mensaje: ' + getErrorMessage(error, 'Error desconocido'));
    }
  };

  if (loading) {
    return (
      <div className="p-3">
        <AdminSkeleton rows={4} />
      </div>
    );
  }

  /*
   * El alto era `h-[600px]` fijo dentro de un panel que mide lo que mida la
   * ventana: en una pantalla baja el compositor quedaba por debajo del borde y
   * no habia forma de escribir. Ahora ocupa el alto que le den.
   */
  return (
    <div className="h-full min-h-0 w-full">
      <Card padding="none" className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-muted px-3 py-1.5">
          <span className="min-w-0 truncate text-micro text-ink-muted">
            Chat en vivo con {selectedUser.full_name || selectedUser.email}
          </span>
          <Button size="sm" variant="ghost-danger" onClick={closeUserChat}>
            Cerrar chat
          </Button>
        </div>

        {aviso && (
          <div className="shrink-0 px-3 pt-2">
            <Notice tone="info" onDismiss={() => setAviso('')}>
              {aviso}
            </Notice>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted p-3">
          {messages.map((message, index) => {
            if (message.isSystem) {
              return (
                <div key={message.id} className="flex justify-center my-2">
                  <span className="rounded-md bg-state-warning-soft px-2.5 py-1 text-micro font-medium text-state-warning">
                    {message.message}
                  </span>
                </div>
              );
            }

            const previous = index > 0 ? messages[index - 1] : null;
            const showDate = !previous || formatMessageDate(previous.created_at) !== formatMessageDate(message.created_at);
            const isMine = message.sender_id === adminId;

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="flex justify-center mb-4 mt-2">
                    <span className="rounded-md bg-surface px-2.5 py-1 text-micro font-bold uppercase text-ink-muted shadow-card">
                      {formatMessageDate(message.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col max-w-[80%] ${isMine ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                  {/* Las burbujas usaban el verde y el beige de WhatsApp
                      (`#dcf8c6`, `#e5ddd5`). Este no es un chat de WhatsApp: es
                      el soporte interno del producto, y esos dos literales eran
                      ademas los unicos colores de toda la extension que no
                      cambiaban en modo oscuro. */}
                  <div className={`rounded-lg px-3 pb-1.5 pt-2 text-body leading-relaxed shadow-card ${isMine ? 'rounded-tr-none bg-primary-soft-strong text-ink' : 'rounded-tl-none border border-line bg-surface text-ink'}`}>
                    {!isMine && <div className="mb-1 text-micro font-bold text-primary">{selectedUser.full_name || selectedUser.email.split('@')[0]}</div>}
                    <div className="whitespace-pre-wrap break-words">{message.message}</div>
                    <div className="mt-1 flex items-center justify-end gap-1 text-micro text-ink-muted">
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isUserTyping && (
            <div className="flex justify-start mb-4">
              <div className="rounded-lg rounded-tl-none border border-line bg-surface px-3 py-2 text-micro italic text-ink-muted shadow-card">
                Escribiendo...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex shrink-0 gap-2 border-t border-line bg-surface p-3">
          {/* El campo declaraba `input-standard`, una clase que no existe en
              ningun CSS del proyecto: estaba sin borde, sin alto y sin padding.
              Pasa a la primitiva, que ademas mide 34px igual que el boton. */}
          <Input
            type="text"
            fullWidth={false}
            value={newMessage}
            onChange={handleTyping}
            placeholder="Enviar un mensaje directo..."
            className="flex-1 rounded-full"
          />
          <IconButton
            type="submit"
            variant="primary"
            shape="circle"
            label="Enviar mensaje"
            icon={<Icon.Send />}
            disabled={!newMessage.trim()}
          />
        </form>
      </Card>
    </div>
  );
}
