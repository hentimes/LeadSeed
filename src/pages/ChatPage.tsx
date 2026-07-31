import ChatRoom from '../components/chat/ChatRoom';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">

      <div className="flex-1 min-h-0">
        <ChatRoom />
      </div>
    </div>
  );
}
