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
} from '../../services/supportService';

interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  isSystem?: boolean;
  context_req_id?: string;
  context_ticket_code?: string;
  context_ticket_type?: string;
}

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
  return date.toLocaleDateString('es-CL');
}

function formatMessageTime(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AdminSupportChat({ selectedUser, activeRequirement }: { selectedUser: Profile; activeRequirement?: Requirement }) {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
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

          setMessages((prev) => {
            const optimistic = prev.find((item) => item.message === message.message && item.id.startsWith('temp-'));
            if (optimistic) {
              return prev.map((item) => (item.id === optimistic.id ? message : item));
            }
            if (prev.some((item) => item.id === message.id)) return prev;
            return [...prev, message];
          });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages' }, (payload) => {
          const message = payload.new as PrivateMessage;
          setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)));
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
      if (messageChannelRef.current) void messageChannelRef.current.unsubscribe();
      if (controlChannelRef.current) void controlChannelRef.current.unsubscribe();
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
    alert('Senal de cierre enviada al usuario.');
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
      alert('Error al enviar el mensaje: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500">Cargando historial de chat...</div>;
  }

  return (
    <div className="w-full h-[600px]">
      <div className="w-full h-full flex flex-col card-standard overflow-hidden">
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200">Chat Maestro</h2>
            <p className="text-xs text-slate-500">En vivo con {selectedUser.full_name || selectedUser.email}</p>
          </div>
          <button onClick={closeUserChat} className="btn bg-red-50 text-red-600 hover:bg-red-100 border-red-200">
            Cerrar Chat al Usuario
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]">
          {messages.map((message, index) => {
            if (message.isSystem) {
              return (
                <div key={message.id} className="flex justify-center my-2">
                  <span className="bg-yellow-100 text-yellow-800 text-[11px] px-3 py-1 rounded-lg shadow-sm font-medium">
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
                    <span className="bg-white text-slate-400 text-[11px] font-bold px-3 py-1 rounded-lg uppercase shadow-sm">
                      {formatMessageDate(message.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col max-w-[80%] ${isMine ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                  <div className={`px-3 pt-2 pb-1.5 rounded-xl text-[14px] shadow-sm leading-relaxed ${isMine ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-gray-100'}`}>
                    {!isMine && <div className="text-xs font-bold text-indigo-500 mb-1">{selectedUser.full_name || selectedUser.email.split('@')[0]}</div>}
                    <div className="break-all whitespace-pre-wrap">{message.message}</div>
                    <div className="text-[10px] mt-1 flex items-center justify-end gap-1 text-slate-400">
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isUserTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-100 text-slate-400 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm text-xs italic">
                Escribiendo...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Enviar un mensaje directo..."
            className="flex-1 input-standard rounded-full"
          />
          <button type="submit" disabled={!newMessage.trim()} className="btn btn-primary rounded-full w-10 h-10 p-0 flex justify-center items-center">
            <Icon.Send />
          </button>
        </form>
      </div>
    </div>
  );
}
