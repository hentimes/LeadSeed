import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../hooks/usePresence';
import {
  fetchCommunityMessages,
  sendCommunityMessage,
  subscribeToCommunityMessages,
  type CommunityMessage,
} from '../services/communityService';
import LoadingOverlay from '../components/LoadingOverlay';
import { Icon } from '../utils/icons';

export default function CommunityPage() {
  const { user } = useAuth();
  const { onlineUsers: activeUsers } = usePresence();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void loadMessages();

    return subscribeToCommunityMessages((message) => {
      setMessages((prev) => [...prev, message]);
    });
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setMessages(await fetchCommunityMessages());
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    await sendCommunityMessage(user.id, text);
  };

  if (loading) return <LoadingOverlay message="Cargando sala..." />;

  return (
    <div className="flex h-full gap-4">
      {/* Sala de Chat (Centro) */}
      <div className="flex-1 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2"><Icon.Leads /> Sala Global de Comunidad</h2>
          <p className="text-sm text-blue-100 opacity-90">Conversa con otros usuarios, comparte tips y cierra negocios.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Icon.Messages />
              <p>Aún no hay mensajes. ¡Sé el primero en saludar!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              const profile = msg.sender_profile;
              const name = profile?.full_name || profile?.email || 'Desconocido';
              const avatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`relative flex-shrink-0 ${profile?.show_premium_frame ? 'p-[2px] bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full' : ''}`}>
                    <img src={avatar} alt={name} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                  </div>
                  <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mb-1">{isMe ? 'Tú' : name}</span>
                    <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border-t border-slate-200 dark:border-slate-700/50 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje a la comunidad..."
            className="flex-1 border border-slate-300 dark:border-slate-600/50 rounded-full px-5 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white w-10 h-10 rounded-full flex justify-center items-center disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <Icon.Send />
          </button>
        </form>
      </div>

      {/* Directorio en Vivo (Derecha) */}
      <div className="w-72 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            En Línea
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full animate-pulse">
              {Object.keys(activeUsers).length}
            </span>
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {Object.values(activeUsers).map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer transition-colors">
              <div className="relative">
                <img 
                  src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email)}&background=random`} 
                  className={`w-10 h-10 rounded-full object-cover ${u.show_premium_frame ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                  alt=""
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{u.full_name || u.email.split('@')[0]}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.bio || 'Conectado ahora'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
