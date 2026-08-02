import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import type { ChatMessage } from '../../types';
import { Icon } from '../../utils/icons';

interface ChatRoomProps {
  roomId?: string; // Si es undefined, carga "General"
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const { user } = useAuth();
  const { room, messages, loading, sendMessage } = useChat(roomId);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-scroll y lógica de "mensajes no leídos"
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setUnreadCount(0);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || inputText.length > 120) return;

    try {
      await sendMessage(inputText.trim(), replyTo?.id);
      setInputText('');
      setReplyTo(null);
      // Forzar scroll al fondo después de enviar
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error enviando mensaje', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Cargando sala...</div>;
  }

  if (!room) {
    return <div className="flex items-center justify-center h-full text-red-500">Sala no encontrada</div>;
  }

  return (
    <div className="panel-container flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-line dark:border-gray-700 flex justify-between items-center z-10 shadow-sm">
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-full bg-primary-soft dark:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors">
            <span className="text-primary opacity-70">#</span> General
            <span className="w-1.5 h-1.5 bg-primary rounded-full ml-1"></span>
          </button>
          <button className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 text-xs font-medium flex items-center gap-1 transition-colors">
            <span className="text-slate-400">#</span> Ventas
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1 opacity-80"></span>
          </button>
          <button className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 text-xs font-medium flex items-center gap-1 transition-colors">
            <span className="text-slate-400">#</span> Soporte
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full ml-1 opacity-80"></span>
          </button>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      {/* Message List */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-gray-500 mt-10">
            No hay mensajes nuevos. Sé el primero en escribir.
          </div>
        )}
        
        {messages.map((msg) => {
          const isOwn = user && msg.user_id === user.id;

          return (
            <div key={msg.id} className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <img 
                  src={msg.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${msg.user_profile?.full_name || 'U'}&background=3b82f6&color=fff`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full flex-shrink-0 cursor-pointer object-cover border border-white dark:border-gray-700 shadow-sm"
                  title="Ver perfil"
                />
              )}
              
              <div className={`flex flex-col min-w-0 max-w-[85%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <div className="flex items-baseline gap-2 mb-1 ml-1">
                    <span className="font-medium text-sm text-ink dark:text-gray-200">
                      {msg.user_profile?.full_name || 'Usuario'}
                    </span>
                    <span className="text-[10px] text-ink-muted font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                
                <div className={`relative px-4 py-2.5 text-[13px] sm:text-sm break-words shadow-sm
                  ${isOwn 
                    ? 'bg-primary-soft text-slate-800 dark:bg-gray-800 dark:text-gray-100 rounded-2xl rounded-tr-sm' 
                    : 'bg-white dark:bg-gray-800 text-ink dark:text-gray-100 rounded-2xl rounded-tl-sm border border-line dark:border-gray-700'
                  }`}
                >
                  {/* Reply Quote */}
                  {msg.reply_to_message && (
                    <div className={`mb-2 pl-2 border-l-2 text-xs py-1 pr-2 rounded-r flex flex-col
                      ${isOwn 
                        ? 'border-primary bg-white/50 text-slate-600' 
                        : 'border-blue-400 bg-slate-50 dark:bg-gray-700 text-ink-muted'
                      }`}
                    >
                      <span className="font-semibold text-[10px]">
                        {msg.reply_to_message.user_profile?.full_name || 'Usuario'}
                      </span>
                      <span className="truncate opacity-80">{msg.reply_to_message.content}</span>
                    </div>
                  )}
                  
                  {msg.content}

                  {isOwn && (
                    <span className="absolute -bottom-5 right-1 text-[10px] text-ink-muted font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Acciones del mensaje (Responder) */}
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center ${isOwn ? 'mr-auto' : 'ml-auto'}`}>
                <button 
                  onClick={() => setReplyTo(msg)}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  title="Responder"
                >
                  <Icon.Reply />
                </button>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Unread Badge Overlay */}
      {!isAtBottom && unreadCount > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button 
            onClick={scrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 transition-all"
          >
            Hay {unreadCount} {unreadCount === 1 ? 'mensaje por leer' : 'mensajes por leer'} ↓
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-line dark:border-gray-800 z-10 flex flex-col">
        {replyTo && (
          <div className="mb-3 pl-3 border-l-2 border-primary flex justify-between items-center bg-surface-muted dark:bg-gray-800 py-1.5 pr-2 rounded-r-md text-sm shadow-sm transition-all">
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-primary text-[10px] uppercase tracking-wider">Respondiendo a {replyTo.user_profile?.full_name}</span>
              <span className="text-ink dark:text-gray-300 truncate text-xs mt-0.5">{replyTo.content}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
              <Icon.Close />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="relative">
          <div className="flex items-end gap-1 border border-line dark:border-gray-700 bg-white dark:bg-gray-800 rounded-[20px] px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary-soft transition-all shadow-sm">
            
            <button type="button" className="p-2 mb-0.5 text-ink-muted hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0" title="Adjuntar archivo">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>

            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 resize-none bg-transparent border-none p-2 text-[14px] text-ink dark:text-gray-100 focus:ring-0 focus:outline-none max-h-32 min-h-[40px] leading-relaxed placeholder:text-slate-400"
              rows={1}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            
            <button type="button" className="p-2 mb-0.5 text-ink-muted hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0 hidden sm:block" title="Emojis">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>

            <button 
              type="submit"
              disabled={!inputText.trim() || inputText.length > 120}
              className="w-10 h-10 mb-0.5 ml-1 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-slate-400 text-white rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all transform active:scale-95"
            >
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
          
          <div className="flex justify-end items-center mt-2 px-2">
            <div className="flex gap-3">
              <span className={`text-[10px] font-medium ${inputText.length >= 110 ? 'text-state-danger' : 'text-ink-muted'}`}>
                {inputText.length} / 120
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
