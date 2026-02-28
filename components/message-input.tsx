import { Send } from 'lucide-react';
import { Room } from '../types/chat';

interface MessageInputProps {
  activeRoom: Room | null;
  newMessage: string;
  typingUsers: Record<string, string>;
  onMessageChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
}

export function MessageInput({
  activeRoom,
  newMessage,
  typingUsers,
  onMessageChange,
  onSendMessage,
}: MessageInputProps) {
  if (!activeRoom) return null;

  return (
    <div className="p-6 pt-2 bg-transparent z-10">
      <div className="h-6 mb-2">
        {Object.keys(typingUsers).length > 0 && (
          <div className="text-xs text-[var(--color-text-muted)] italic transition-all flex items-center gap-2 ml-2">
            <div className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" />
              <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:0.2s]" />
              <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:0.4s]" />
            </div>
            {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>
      
      <form 
        onSubmit={onSendMessage}
        className="relative flex items-center p-2 bg-[var(--color-bg-card)] border border-white/10 rounded-2xl backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] focus-within:border-[var(--color-brand-primary)]/50 transition-all"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder={`Message #${activeRoom.name}`}
          className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-white placeholder:text-[var(--color-text-muted)]"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="h-10 w-10 premium-button !p-0 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <Send className="h-5 w-5 transition-transform group-hover:rotate-12" />
        </button>
      </form>
    </div>
  );
}
