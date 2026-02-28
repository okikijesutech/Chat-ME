import { formatRelative } from 'date-fns';
import DOMPurify from 'dompurify';
import { Hash, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { Message, Room } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  activeRoom: Room | null;
  loading: boolean;
  user: any;
  hasNoChannels: boolean;
  onCreateChannelClick: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function MessageList({
  messages,
  activeRoom,
  loading,
  user,
  hasNoChannels,
  onCreateChannelClick,
  messagesEndRef,
  scrollContainerRef,
  onScroll,
}: MessageListProps) {
  return (
    <div 
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-premium flex flex-col"
    >
      {!activeRoom ? (
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] italic">
          <Hash className="h-12 w-12 mb-4 opacity-10" />
          <p>Welcome! Create a new channel or select an existing one.</p>
          {hasNoChannels && (
            <button 
              onClick={onCreateChannelClick}
              className="mt-4 premium-button !py-2 !px-4 text-sm"
            >
              Create Channel
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-brand-primary)]" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-[var(--color-text-muted)] italic">
          <Send className="h-12 w-12 mb-4 opacity-10" />
          <p>No messages yet here. Be the first!</p>
        </div>
      ) : (
        messages.map((msg, idx) => {
          const isOwn = msg.user_id === user?.id;
          const cleanContent = DOMPurify.sanitize(msg.content);
          
          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-4 animate-fade-in group/item",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
              style={{ animationDelay: `${Math.min(idx * 10, 500)}ms` }}
            >
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 overflow-hidden flex items-center justify-center group-hover/item:border-[var(--color-brand-primary)]/30 transition-colors">
                  {msg.profiles?.avatar_url ? (
                    <img src={msg.profiles.avatar_url} alt={msg.profiles.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-bold text-[var(--color-text-secondary)]">
                      {msg.profiles?.full_name?.[0] || 'U'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-sm font-bold">{msg.profiles?.full_name || 'Anonymous'}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    {formatRelative(new Date(msg.created_at), new Date())}
                  </span>
                </div>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-[0.95rem] leading-relaxed shadow-sm transition-all break-words",
                  isOwn 
                    ? "bg-[var(--brand-gradient)] text-white rounded-tr-none hover:shadow-lg hover:shadow-indigo-500/20" 
                    : "bg-white/5 border border-white/5 rounded-tl-none hover:bg-white/10"
                )}>
                  <p dangerouslySetInnerHTML={{ __html: cleanContent }} />
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} className="mt-4" />
    </div>
  );
}
