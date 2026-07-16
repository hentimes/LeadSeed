import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';

interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  context_req_id?: string;
  context_ticket_code?: string;
  context_ticket_type?: string;
  isSystem?: boolean;
}

import type { Requirement } from '../../types';

// Helpers de fecha
function formatMessageDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  
  const diffDays = Math.ceil(Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)); 
  if (diffDays < 7) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }
  return date.toLocaleDateString('es-CL');
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function SupportFloatingChat() {
  const { user, profile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controlChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [claimReason, setClaimReason] = useState('');
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [isBumping, setIsBumping] = useState(false);

  useEffect(() => {
    // Buscar al primer administrador disponible para asignarle el chat inicial
    supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single().then(({ data }) => {
      if (data) setAdminId(data.id);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    // Cargar últimos mensajes
    const loadMessages = async () => {
      const { data } = await supabase
        .from('internal_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.not.is.null),and(receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (data && data.length > 0) {
        const loadedMsgs = (data as PrivateMessage[]).reverse();
        setMessages(loadedMsgs);
        
        // Verificar si el último mensaje es del admin y no ha sido leído
        const lastMsg = loadedMsgs[loadedMsgs.length - 1];
        if (lastMsg.sender_id !== user.id) {
          const lastReadId = localStorage.getItem(`support_read_${user.id}`);
          if (lastMsg.id !== lastReadId && !isOpen) {
            setHasUnread(true);
            try { 
              chrome.action.setBadgeText({ text: '1' }); 
              chrome.action.setBadgeBackgroundColor({ color: '#9333ea' });
            } catch { /* ignore */ }
          }
        }
      }
    };
    loadMessages();

    // 2. Escuchar mensajes nuevos
    const messageChannel = supabase
      .channel('public:internal_messages_user')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as PrivateMessage;
        setMessages(prev => [...prev, msg]);
        if (!isOpen) {
          setHasUnread(true);
          try { 
            chrome.action.setBadgeText({ text: '1' }); 
            chrome.action.setBadgeBackgroundColor({ color: '#9333ea' });
          } catch { /* ignore */ }
        }
      })
      .subscribe();
      
    // Escuchar mis propios mensajes
    const myMessagesChannel = supabase
      .channel('public:internal_messages_me')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `sender_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as PrivateMessage;
        if (msg.receiver_id) {
          setMessages(prev => {
            const exists = prev.some(m => m.message === msg.message && m.id.startsWith('temp-'));
            if (exists) {
              return prev.map(m => (m.message === msg.message && m.id.startsWith('temp-')) ? msg : m);
            }
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages', filter: `sender_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as PrivateMessage;
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      })
      .subscribe();

    const controlChannel = supabase.channel(`support_control_${user.id}`);
    controlChannelRef.current = controlChannel;
    controlChannel
      .on('broadcast', { event: 'CLOSE_CHAT' }, () => {
        setIsOpen(false);
      })
      .on('broadcast', { event: 'TYPING' }, (payload) => {
        if (payload.payload?.senderId !== user.id) {
          setIsAdminTyping(payload.payload?.isTyping);
        }
      })
      .subscribe();

    const loadRequirements = async () => {
      const { data } = await supabase.from('requirements').select('*').eq('user_id', user.id);
      if (data) setRequirements(data as Requirement[]);
    };
    loadRequirements();

    const reqChannel = supabase.channel('floating_chat_reqs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requirements', filter: `user_id=eq.${user.id}` }, () => {
        loadRequirements();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(myMessagesChannel);
      supabase.removeChannel(controlChannel); 
      supabase.removeChannel(reqChannel);
    };
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (hasUnread) {
        setHasUnread(false);
        try { chrome.action.setBadgeText({ text: '' }); } catch { /* ignore */ }
      }
      if (messages.length > 0 && user) {
        localStorage.setItem(`support_read_${user.id}`, messages[messages.length - 1].id);
      }
      
      // Marcar mensajes recibidos como leídos
      if (user && adminId) {
        supabase.from('internal_messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', adminId)
          .eq('is_read', false)
          .then();
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, user, hasUnread, adminId]);

  const handleClose = () => {
    setIsOpen(false);
    if (user && adminId && controlChannelRef.current) {
      controlChannelRef.current.send({
        type: 'broadcast',
        event: 'USER_CLOSED_CHAT',
        payload: { message: 'El usuario ha cerrado la ventana de chat' }
      });
    }
  };

  const activeRequirement = requirements.find(r => ['open', 'in_progress', 'claim'].includes(r.status));
  const targetAdminId = activeRequirement?.helper_id || adminId;

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (controlChannelRef.current && user) {
      controlChannelRef.current.send({
        type: 'broadcast',
        event: 'TYPING',
        payload: { isTyping: true, senderId: user.id }
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        controlChannelRef.current.send({
          type: 'broadcast',
          event: 'TYPING',
          payload: { isTyping: false, senderId: user.id }
        });
      }, 2000);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !targetAdminId) return;
    const text = newMessage.trim();
    setNewMessage('');
    
    if (controlChannelRef.current) {
      controlChannelRef.current.send({
        type: 'broadcast',
        event: 'TYPING',
        payload: { isTyping: false, senderId: user.id }
      });
    }
    
    // Optimistic Update
    const optimisticMsg: PrivateMessage = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      receiver_id: targetAdminId,
      message: text,
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const { error } = await supabase.from('internal_messages').insert({
      sender_id: user.id,
      receiver_id: targetAdminId,
      message: text
    });
    
    if (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar el mensaje: ' + error.message);
    }
  };

  const handleRate = async (reqId: string, rating: 'up' | 'down') => {
    if (rating === 'down') {
      setActiveClaimId(reqId);
      return;
    }
    await supabase.from('requirements').update({ rating }).eq('id', reqId);
  };

  const handleSubmitClaim = async (reqId: string) => {
    if (!claimReason.trim()) return;
    await supabase.from('requirements').update({ 
      rating: 'down',
      status: 'claim',
      claim_reason: claimReason.trim()
    }).eq('id', reqId);
    setActiveClaimId(null);
    setClaimReason('');
    alert('Tu reclamo ha sido enviado al Superadmin.');
  };

  const handleBump = async () => {
    if (!activeRequirement || !user || !targetAdminId) return;
    setIsBumping(true);
    
    const { error } = await supabase.from('requirements').update({
      bump_count: (activeRequirement.bump_count || 0) + 1,
      last_bumped_at: new Date().toISOString()
    }).eq('id', activeRequirement.id);

    if (!error) {
      await supabase.from('internal_messages').insert({
        sender_id: user.id,
        receiver_id: targetAdminId,
        message: '¡Reenviado! (El usuario solicita atención a este ticket)'
      });
    }
    
    setIsBumping(false);
  };

  const pendingRatingReq = requirements.find(r => r.status === 'closed' && !r.rating);
  
  // Calcular si puede hacer bump
  let canBump = false;
  if (activeRequirement) {
    const lastTime = new Date(activeRequirement.last_bumped_at || activeRequirement.created_at).getTime();
    const now = new Date().getTime();
    canBump = (now - lastTime) > (24 * 60 * 60 * 1000); // 24 hours
  }

  if (!user || isAdmin) return null;

  return (
    <>
      {/* Botón flotante - Badge morado solo si el Admin le habló */}
      {hasUnread && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl shadow-purple-500/50 flex items-center justify-center animate-bounce z-50 transition-colors"
        >
          <Icon.Messages />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-purple-100 animate-fade-in">
          
          {/* Header del Chat Principal */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white flex justify-between items-center shadow-md z-10 relative">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-bold text-sm">Soporte VIP</h3>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
              <Icon.Close />
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.length === 0 ? (
              <p className="text-xs text-center text-gray-400 mt-4">Esperando mensajes...</p>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender_id === user.id;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showDate = !prevMsg || formatMessageDate(prevMsg.created_at) !== formatMessageDate(msg.created_at);

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center mb-4 mt-2">
                        <span className="bg-gray-200/60 text-slate-400 dark:text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {formatMessageDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                      <div className={`px-3 pt-2 pb-1.5 rounded-2xl text-[13px] shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-purple-600 text-white rounded-br-sm' 
                          : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-gray-100 text-slate-700 dark:text-slate-200 rounded-bl-sm shadow-sm'
                      }`}>
                        {!isMe && (
                          <div className="text-[10px] font-bold text-purple-600 mb-0.5">
                            Soporte LeadSeed
                          </div>
                        )}
                        {msg.context_req_id && (
                          <div className="bg-purple-50 border-l-2 border-purple-400 p-2 text-[10px] mb-2 rounded text-purple-900 opacity-90 font-mono">
                            <strong>Ref: Ticket {msg.context_ticket_code ? `#${msg.context_ticket_code}` : ''}</strong> {msg.context_ticket_type ? `(${msg.context_ticket_type})` : ''}
                          </div>
                        )}
                        <div className={`break-all whitespace-pre-wrap ${msg.context_req_id ? 'font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/80 p-2 rounded-md border border-gray-100 mt-1' : ''}`}>{msg.message}</div>
                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                          {formatMessageTime(msg.created_at)}
                          {isMe && (
                            <span className={msg.is_read ? 'text-blue-300' : 'text-purple-300 opacity-70'}>
                              
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isAdminTyping && (
              <div className="flex justify-start mb-2">
                <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-gray-100 text-slate-400 dark:text-slate-500 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-[10px] italic flex items-center gap-1.5">
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </span>
                  Escribiendo...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            
            {/* Inline System Message for Rating */}
            {pendingRatingReq && (
              <div className="flex flex-col items-center my-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 shadow-sm text-center max-w-[90%]">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Soporte ha marcado el ticket {pendingRatingReq.ticket_code ? `#${pendingRatingReq.ticket_code}` : ''} como resuelto.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">Por favor califica el resultado de la atención.</p>
                  
                  {activeClaimId === pendingRatingReq.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea 
                        value={claimReason}
                        onChange={(e) => setClaimReason(e.target.value)}
                        placeholder="Motivo del reclamo..."
                        className="w-full text-xs p-2 border border-red-200 rounded-lg focus:ring-1 focus:ring-red-400 outline-none resize-none bg-slate-50 dark:bg-slate-900"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end mt-1">
                        <button onClick={() => setActiveClaimId(null)} className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 px-2 font-medium">Cancelar</button>
                        <button onClick={() => handleSubmitClaim(pendingRatingReq.id)} className="bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-red-600 font-bold shadow-sm">Enviar Reclamo</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => handleRate(pendingRatingReq.id, 'up')} className="group flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-900 border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-all shadow-sm">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514"></path></svg>
                      </button>
                      <button onClick={() => handleRate(pendingRatingReq.id, 'down')} className="group flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-900 border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.514"></path></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
                {/* Bump Button */}
              {activeRequirement && canBump && (
                <div className="flex flex-col items-center my-4 animate-fade-in">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm text-center max-w-[90%]">
                    <p className="text-[11px] font-bold text-orange-800 mb-1">Han pasado 24 horas</p>
                    <p className="text-[10px] text-orange-600 mb-2">Si aún no recibes respuesta, puedes insistir.</p>
                    <button 
                      onClick={handleBump} 
                      disabled={isBumping}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-50"
                    >
                      {isBumping ? 'Enviando...' : 'Insistir / Reenviar'}
                    </button>
                  </div>
                </div>
              )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md">
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Escribe aquí..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-full px-4 py-2 text-xs outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all text-slate-600 dark:text-slate-300"
                />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-full flex justify-center items-center disabled:opacity-50 transition-colors shrink-0"
            >
              <Icon.Send />
            </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
