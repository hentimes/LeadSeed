import ChatRoom from '../components/chat/ChatRoom';
import type { Mention } from '../types/mentions';

export default function ChatPage({ onMentionClick }: { onMentionClick?: (mention: Mention) => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ChatRoom onMentionClick={onMentionClick} />
      </div>
    </div>
  );
}
