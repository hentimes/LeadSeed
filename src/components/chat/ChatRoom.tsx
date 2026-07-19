import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import type { ChatMessage } from '../../types';
import { Icon } from '../../utils/icons';

interface ChatRoomProps {
  roomId?: string; // Si es undefined, carga "General"
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
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
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-gray-900 border dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-gray-100 flex items-center gap-2">
            <span className="text-emerald-500">•</span> {room.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Modo Volátil - Sólo ves mensajes mientras estás aquí</p>
        </div>
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <Icon.More />
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
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3 group">
            <img 
              src={msg.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${msg.user_profile?.full_name || 'U'}&background=3b82f6&color=fff`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full flex-shrink-0 cursor-pointer object-cover border dark:border-gray-700"
              title="Ver perfil"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm text-slate-800 dark:text-gray-200 cursor-pointer hover:underline">
                  {msg.user_profile?.full_name || 'Usuario'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {/* Reply Quote */}
              {msg.reply_to_message && (
                <div className="mt-1 pl-2 border-l-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-xs text-slate-600 dark:text-gray-400 py-1 pr-2 rounded-r flex flex-col">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {msg.reply_to_message.user_profile?.full_name || 'Usuario'}
                  </span>
                  <span className="truncate">{msg.reply_to_message.content}</span>
                </div>
              )}
              
              <div className="text-sm text-slate-700 dark:text-gray-300 break-words mt-1">
                {msg.content}
              </div>
            </div>
            {/* Acciones del mensaje (Responder) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-start">
              <button 
                onClick={() => setReplyTo(msg)}
                className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1"
                title="Responder"
              >
                <Icon.Reply />
              </button>
            </div>
          </div>
        ))}
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
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-10">
        {replyTo && (
          <div className="mb-2 pl-2 border-l-2 border-blue-400 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 py-1 pr-2 rounded-r">
            <div className="flex flex-col text-xs overflow-hidden">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Repondiendo a {replyTo.user_profile?.full_name}</span>
              <span className="text-slate-600 dark:text-gray-400 truncate">{replyTo.content}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 ml-2">
              <Icon.Close />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <div className="flex relative items-end gap-2">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 resize-none bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-gray-100"
              rows={1}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || inputText.length > 120}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2 rounded-lg flex-shrink-0 transition-colors"
            >
              <Icon.Send />
            </button>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className={`text-[10px] ${inputText.length >= 110 ? 'text-orange-500' : 'text-slate-400'}`}>
              {inputText.length} / 120
            </span>
            <span className="text-[10px] text-slate-400">Enter para enviar</span>
          </div>
        </form>
      </div>
    </div>
  );
}
