import ChatRoom from '../components/chat/ChatRoom';
import PageHeader from '../components/ui/PageHeader';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Comunidad y Chat"
        description="Interactúa con otros usuarios en tiempo real."
      />
      <div className="flex-1 min-h-0">
        <ChatRoom />
      </div>
    </div>
  );
}
