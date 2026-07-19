import ChatRoom from '../components/chat/ChatRoom';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">Comunidad y Chat</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">Interactúa con otros usuarios en tiempo real.</p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatRoom />
      </div>
    </div>
  );
}
