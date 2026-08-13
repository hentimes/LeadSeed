import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import type { Requirement } from '../../types';
import {
  bumpSupportRequirement,
  createSupportMessage,
  createTypingControlChannel,
  loadPrimaryAdminId,
  loadUserSupportMessages,
  loadUserSupportRequirements,
  markConversationRead,
  rateSupportRequirement,
  submitSupportClaim,
  subscribeUserSupportMessages,
  subscribeUserSupportRequirements,
  reconcileIncomingSupportMessage,
  applySupportMessageUpdate,
  closeTypingControlChannel,
  type SupportMessage as PrivateMessage,
} from '../../services/supportService';
import { getErrorMessage } from '../../utils/errorMessage';

function formatMessageDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-CL');
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function SupportFloatingChat() {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [claimReason, setClaimReason] = useState('');
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [isBumping, setIsBumping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controlChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadPrimaryAdminId().then((nextAdminId) => {
      if (nextAdminId) setAdminId(nextAdminId);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      const nextMessages = await loadUserSupportMessages(user.id);
      if (nextMessages.length > 0) {
        setMessages(nextMessages as PrivateMessage[]);
        const lastMessage = nextMessages[nextMessages.length - 1] as PrivateMessage;
        if (lastMessage.sender_id !== user.id) {
          const lastReadId = localStorage.getItem(`support_read_${user.id}`);
          if (lastMessage.id !== lastReadId && !isOpen) {
            setHasUnread(true);
          }
        }
      }
    };

    const loadRequirements = async () => {
      setRequirements((await loadUserSupportRequirements(user.id)) as Requirement[]);
    };

    void loadMessages();
    void loadRequirements();

    const unsubscribeMessages = subscribeUserSupportMessages(
      user.id,
      (message) => {
        setMessages((prev) => [...prev, message as PrivateMessage]);
        if (!isOpen) setHasUnread(true);
      },
      (message) => {
        setMessages((prev) => reconcileIncomingSupportMessage(prev, message));
      },
      (message) => {
        setMessages((prev) => applySupportMessageUpdate(prev, message));
      }
    );

    const controlChannel = createTypingControlChannel(`support_control_${user.id}`);
    controlChannelRef.current = controlChannel;
    controlChannel
      .on('broadcast', { event: 'CLOSE_CHAT' }, () => {
        setIsOpen(false);
      })
      .on('broadcast', { event: 'TYPING' }, (payload) => {
        if (payload.payload?.senderId !== user.id) {
          setIsAdminTyping(Boolean(payload.payload?.isTyping));
        }
      })
      .subscribe();

    const unsubscribeRequirements = subscribeUserSupportRequirements(user.id, 'floating_chat_reqs', loadRequirements);

    return () => {
      unsubscribeMessages();
      unsubscribeRequirements();
      if (controlChannelRef.current) closeTypingControlChannel(controlChannelRef.current);
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && user) {
      if (hasUnread) setHasUnread(false);
      const ultimo = messages[messages.length - 1];
      if (ultimo) {
        localStorage.setItem(`support_read_${user.id}`, ultimo.id);
      }
      if (adminId) {
        void markConversationRead(user.id, adminId);
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminId, hasUnread, isOpen, messages, user]);

  if (!user || isAdmin) {
    return null;
  }

  const activeRequirement = requirements.find((requirement) => ['open', 'in_progress', 'claim'].includes(requirement.status));
  const pendingRatingRequirement = requirements.find((requirement) => requirement.status === 'closed' && !requirement.rating);
  const targetAdminId = activeRequirement?.helper_id || adminId;

  const handleClose = () => {
    setIsOpen(false);
    void controlChannelRef.current?.send({
      type: 'broadcast',
      event: 'USER_CLOSED_CHAT',
      payload: { message: 'El usuario ha cerrado la ventana de chat' },
    });
  };

  const handleTyping = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(event.target.value);
    if (!controlChannelRef.current) return;
    void controlChannelRef.current.send({
      type: 'broadcast',
      event: 'TYPING',
      payload: { isTyping: true, senderId: user.id },
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      void controlChannelRef.current?.send({
        type: 'broadcast',
        event: 'TYPING',
        payload: { isTyping: false, senderId: user.id },
      });
    }, 2000);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !targetAdminId) return;
    const text = newMessage.trim();
    setNewMessage('');
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: targetAdminId,
        message: text,
        created_at: new Date().toISOString(),
      },
    ]);
    try {
      await createSupportMessage(user.id, targetAdminId, text);
    } catch (error: unknown) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar el mensaje: ' + getErrorMessage(error, 'Error desconocido'));
    }
  };

  const handleRate = async (requirementId: string, rating: 'up' | 'down') => {
    if (rating === 'down') {
      setActiveClaimId(requirementId);
      return;
    }
    await rateSupportRequirement(requirementId, rating);
  };

  const handleSubmitClaim = async (requirementId: string) => {
    if (!claimReason.trim()) return;
    await submitSupportClaim(requirementId, claimReason);
    setActiveClaimId(null);
    setClaimReason('');
    alert('Tu reclamo ha sido enviado al superadmin.');
  };

  const handleBump = async () => {
    if (!activeRequirement || !targetAdminId) return;
    setIsBumping(true);
    await bumpSupportRequirement(activeRequirement);
    await createSupportMessage(user.id, targetAdminId, 'Reenviado: el usuario solicita atencion a este ticket.');
    setIsBumping(false);
  };

  const canBump = activeRequirement
    ? new Date().getTime() - new Date(activeRequirement.last_bumped_at || activeRequirement.created_at).getTime() > 24 * 60 * 60 * 1000
    : false;

  return (
    <>
      {hasUnread && !isOpen && (
        <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-colors">
          <Icon.Messages />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-purple-100">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white flex justify-between items-center">
            <h3 className="font-bold text-sm">Soporte</h3>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
              <Icon.Close />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.map((message, index) => {
              const previous = index > 0 ? messages[index - 1] : null;
              const showDate = !previous || formatMessageDate(previous.created_at) !== formatMessageDate(message.created_at);
              const isMine = message.sender_id === user.id;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center mb-3">
                      <span className="bg-gray-200/60 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {formatMessageDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                    <div className={`px-3 pt-2 pb-1.5 rounded-2xl text-[13px] shadow-sm leading-relaxed ${isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-slate-700 rounded-bl-sm'}`}>
                      {!isMine && <div className="text-[10px] font-bold text-purple-600 mb-0.5">Soporte LeadSeed</div>}
                      <div className="break-all whitespace-pre-wrap">{message.message}</div>
                      <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isAdminTyping && (
              <div className="flex justify-start mb-2">
                <div className="bg-white border border-gray-100 text-slate-400 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-[10px] italic">
                  Escribiendo...
                </div>
              </div>
            )}

            {pendingRatingRequirement && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-center">
                <p className="text-[11px] font-bold text-slate-700 mb-1">Soporte marco el ticket como resuelto.</p>
                {activeClaimId === pendingRatingRequirement.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea value={claimReason} onChange={(event) => setClaimReason(event.target.value)} placeholder="Motivo del reclamo..." className="w-full text-xs p-2 border border-red-200 rounded-lg outline-none resize-none bg-slate-50" rows={2} />
                    <div className="flex gap-2 justify-end mt-1">
                      <button onClick={() => setActiveClaimId(null)} className="text-[10px] text-slate-400 px-2 font-medium">Cancelar</button>
                      <button onClick={() => handleSubmitClaim(pendingRatingRequirement.id)} className="bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold">Enviar Reclamo</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => handleRate(pendingRatingRequirement.id, 'up')} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold">Bien</button>
                    <button onClick={() => handleRate(pendingRatingRequirement.id, 'down')} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold">Mal</button>
                  </div>
                )}
              </div>
            )}

            {activeRequirement && canBump && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm text-center">
                <p className="text-[11px] font-bold text-orange-800 mb-1">Han pasado 24 horas</p>
                <button onClick={handleBump} disabled={isBumping} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-50">
                  {isBumping ? 'Enviando...' : 'Insistir / Reenviar'}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md">
            <div className="flex gap-2 items-center">
              <input type="text" value={newMessage} onChange={handleTyping} placeholder="Escribe aqui..." className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-slate-600" />
              <button type="submit" disabled={!newMessage.trim()} className="bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-full flex justify-center items-center disabled:opacity-50 transition-colors shrink-0">
                <Icon.Send />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
