import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';

interface InternalMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: { email: string; full_name?: string };
}

export default function InternalChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadMessages();

    const channel = supabase
      .channel('public:internal_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, (payload) => {
        const msg = payload.new as InternalMessage;
        
        // Si el mensaje es para todos o para mí
        if (!msg.receiver_id || msg.receiver_id === user.id || msg.sender_id === user.id) {
          // Fetch el profile del sender (ya que Postgres no hace join en eventos en tiempo real)
          supabase.from('profiles').select('email, full_name').eq('id', msg.sender_id).single().then(({ data }) => {
            msg.sender_profile = data || undefined;
            setMessages(prev => [...prev, msg]);
            if (!isOpen && msg.sender_id !== user.id) {
              setUnreadCount(c => c + 1);
            }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const loadMessages = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('internal_messages')
      .select('*, sender_profile:profiles!internal_messages_sender_id_fkey(email, full_name)')
      .order('created_at', { ascending: true })
      .limit(50);
      
    if (!error && data) {
      setMessages(data as InternalMessage[]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    await supabase.from('internal_messages').insert({
      sender_id: user.id,
      receiver_id: null, // null = grupo / publico
      message: text
    });
  };

  if (!user) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all z-50 flex items-center justify-center"
        title="Chat de Equipo"
      >
        <div className="w-6 h-6 flex items-center justify-center">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden animate-slide-up">
          <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center shrink-0">
            <h3 className="font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              Chat de Equipo
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 p-1">
              <Icon.Close />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 mt-10">No hay mensajes recientes.</p>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === user.id;
                const name = msg.sender_profile?.full_name || msg.sender_profile?.email || 'Desconocido';
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-500 mb-0.5 px-1">{isMe ? 'Tú' : name}</span>
                    <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-600'}`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2 shrink-0">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition-colors shrink-0"
            >
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
