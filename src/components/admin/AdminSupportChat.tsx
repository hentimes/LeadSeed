import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Icon } from '../../utils/icons';
import type { Profile, Requirement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

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

// Helpers de fecha
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
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }
  return date.toLocaleDateString('es-CL');
}

function formatMessageTime(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AdminSupportChat({ selectedUser, activeRequirement }: { selectedUser: Profile, activeRequirement?: Requirement }) {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controlChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const { profile: currentUserProfile } = useAuth();

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const setupChat = async () => {
      setLoading(true);
      // 1. Obtener ID del admin logueado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isMounted) return;
      setAdminId(session.user.id);
      
      // 2. Cargar mensajes entre ADMIN y SELECTED_USER
      const { data } = await supabase
        .from('internal_messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (data && isMounted) {
        const loadedMsgs = (data as PrivateMessage[]).reverse();
        setMessages(loadedMsgs);
        // Marcar como leídos los que me envió a mi
        supabase.from('internal_messages')
          .update({ is_read: true })
          .eq('receiver_id', session.user.id)
          .eq('sender_id', selectedUser.id)
          .eq('is_read', false)
          .then();
          
        // Prefill welcome message for helpers or admin
        if (activeRequirement) {
          const hasTicketMessages = loadedMsgs.some(m => m.context_req_id === activeRequirement.id);
          if (!hasTicketMessages) {
            const agentFirstName = currentUserProfile?.full_name?.split(' ')[0] || currentUserProfile?.email?.split('@')[0] || 'Soporte';
            const userFirstName = selectedUser.full_name?.split(' ')[0] || selectedUser.email?.split('@')[0];
            setNewMessage(`Hola ${userFirstName}, mi nombre es ${agentFirstName} y voy a ayudarte con tu requerimiento ${activeRequirement.ticket_code}.`);
          }
        }
      }
      if (isMounted) setLoading(false);

      // 3. Suscribirse (usando un sufijo único para evitar colisiones)
      const channelId = `support_admin_${selectedUser.id}_${Date.now()}`;
      channel = supabase
        .channel(channelId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, (payload) => {
          const msg = payload.new as PrivateMessage;
          if (
            (msg.sender_id === session.user.id && msg.receiver_id === selectedUser.id) ||
            (msg.sender_id === selectedUser.id && msg.receiver_id === session.user.id)
          ) {
            // Si es un mensaje hacia mí, lo marcamos como leído de inmediato
            if (msg.receiver_id === session.user.id) {
              supabase.from('internal_messages').update({ is_read: true }).eq('id', msg.id).then();
            }
            
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
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages' }, (payload) => {
          const msg = payload.new as PrivateMessage;
          if (
            (msg.sender_id === session.user.id && msg.receiver_id === selectedUser.id) ||
            (msg.sender_id === selectedUser.id && msg.receiver_id === session.user.id)
          ) {
            setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
          }
        })
        .subscribe();

      // Broadcast channel for typing & controls
      const controlChannel = supabase.channel(`support_control_${selectedUser.id}`);
      controlChannelRef.current = controlChannel;
      
      controlChannel
        .on('broadcast', { event: 'USER_CLOSED_CHAT' }, (payload) => {
          const sysMsg: PrivateMessage = {
            id: 'sys-' + Date.now(),
            sender_id: 'system',
            receiver_id: 'system',
            message: payload.payload?.message || 'El usuario cerró la ventana de chat.',
            created_at: new Date().toISOString(),
            isSystem: true
          };
          setMessages(prev => [...prev, sysMsg]);
        })
        .on('broadcast', { event: 'TYPING' }, (payload) => {
          if (payload.payload?.senderId === selectedUser.id) {
            setIsUserTyping(payload.payload?.isTyping);
          }
        })
        .subscribe();
    };

    setupChat();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (controlChannelRef.current) supabase.removeChannel(controlChannelRef.current);
    };
  }, [selectedUser]);

  const closeUserChat = async () => {
    if (!adminId) return;
    const channel = supabase.channel(`support_control_${selectedUser.id}`);
    await channel.send({
      type: 'broadcast',
      event: 'CLOSE_CHAT',
      payload: { message: 'Admin cerró el chat' }
    });
    alert('Seña de cierre enviada al usuario.');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (controlChannelRef.current) {
      controlChannelRef.current.send({
        type: 'broadcast',
        event: 'TYPING',
        payload: { isTyping: true, senderId: adminId }
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        controlChannelRef.current.send({
          type: 'broadcast',
          event: 'TYPING',
          payload: { isTyping: false, senderId: adminId }
        });
      }, 2000);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminId) return;
    const text = newMessage.trim();
    setNewMessage('');
    
    if (controlChannelRef.current) {
      controlChannelRef.current.send({
        type: 'broadcast',
        event: 'TYPING',
        payload: { isTyping: false, senderId: adminId }
      });
    }
    
    // Optimistic Update
    const optimisticMsg: PrivateMessage = {
      id: 'temp-' + Date.now(),
      sender_id: adminId,
      receiver_id: selectedUser.id,
      message: text,
      created_at: new Date().toISOString(),
      is_read: false,
      context_req_id: activeRequirement?.id,
      context_ticket_code: activeRequirement?.ticket_code,
      context_ticket_type: activeRequirement?.type
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const { error } = await supabase.from('internal_messages').insert({
      sender_id: adminId,
      receiver_id: selectedUser.id,
      message: text,
      context_req_id: activeRequirement?.id,
      context_ticket_code: activeRequirement?.ticket_code,
      context_ticket_type: activeRequirement?.type
    });
    
    if (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar el mensaje: ' + error.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 dark:text-slate-500">Cargando historial de chat...</div>;

  return (
    <div className="w-full h-[600px]">
      {/* Columna de Chat */}
      <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Chat Maestro</h2>
            <p className="text-xs text-indigo-200">En vivo con {selectedUser.full_name || selectedUser.email}</p>
          </div>
          <button 
            onClick={closeUserChat}
            className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            Cerrar Chat al Usuario
          </button>
        </div>
        
        {activeRequirement && (
          <div className={`px-4 py-3 flex items-center justify-between shadow-sm z-10 border-b
            ${activeRequirement.status === 'open' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/50'}`}>
            <div className="flex items-center gap-2">
              <Icon.Inbox />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Requerimiento activo: <strong className="uppercase text-blue-700">{activeRequirement.type}</strong>
              </span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${activeRequirement.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-slate-500 dark:text-slate-400'}`}>
              {activeRequirement.status === 'open' ? 'ABIERTO' : 'CERRADO'}
            </span>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <Icon.Messages />
            <p className="mt-2 text-sm font-medium">Inicia la conversación</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="bg-yellow-100 text-yellow-800 text-[11px] px-3 py-1 rounded-lg shadow-sm font-medium">
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender_id === adminId;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDate = !prevMsg || formatMessageDate(prevMsg.created_at) !== formatMessageDate(msg.created_at);

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center mb-4 mt-2">
                    <span className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md/80 text-slate-400 dark:text-slate-500 text-[11px] font-bold px-3 py-1 rounded-lg uppercase shadow-sm">
                      {formatMessageDate(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                  <div className={`px-3 pt-2 pb-1.5 rounded-xl text-[14px] shadow-sm leading-relaxed ${
                    isMe 
                      ? 'bg-[#dcf8c6] text-slate-800 dark:text-slate-100 rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-tl-none border border-gray-100'
                  }`}>
                    {!isMe && (
                      <div className="text-xs font-bold text-indigo-500 mb-1 flex items-center gap-1">
                        {selectedUser.avatar_url ? (
                           <img src={selectedUser.avatar_url} className="w-4 h-4 rounded-full" alt="avatar" />
                        ) : (
                           <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px]">
                             {selectedUser.email.charAt(0).toUpperCase()}
                           </div>
                        )}
                        {selectedUser.full_name || selectedUser.email.split('@')[0]}
                      </div>
                    )}
                    <div className="break-all whitespace-pre-wrap">{msg.message}</div>
                    <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 text-slate-400 dark:text-slate-500`}>
                      {formatMessageTime(msg.created_at)}
                      {isMe && (
                        <span className={msg.is_read ? 'text-blue-500' : 'text-gray-400'}>
                          
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isUserTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-gray-100 text-slate-400 dark:text-slate-500 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm text-xs italic flex items-center gap-1.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
              </span>
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border-t border-slate-200 dark:border-slate-700/50 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={handleTyping}
            placeholder="Enviar un mensaje directo (abrirá su ventana)..."
            className="flex-1 border border-slate-300 dark:border-slate-600/50 rounded-full px-5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white w-10 h-10 rounded-full flex justify-center items-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            <Icon.Send />
          </button>
        </form>
      </div>
    </div>
  );
}
